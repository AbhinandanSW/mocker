import {
  INTRODUCTION_TOPIC, MAX_FOLLOW_UPS_IN_A_ROW, TARGET_ANSWERS,
  askedQuestions, candidateAskedClarification, candidateGaveUp, countAnswers, coveredTopics, questionAnswerPairs,
  currentTopic, followUpStreak, nextFocusArea, questionOverlap, sharedKeyWords,
} from './interviewPlan';
import { ollamaChat } from './ollama';
import { introduction } from './introductions';
import { interviewerSystem, makeQuestionPrompt, makeReportPrompt, reportSystem, type QuestionPlan } from './prompts';
import { nextQuestionSchema, reportSchema } from './schemas';
import type { InterviewReport, InterviewSession, NextQuestion, Turn } from './types';

// The "AI interviewer". Used by the API routes.
//
// Division of work: this code makes every DECISION (introduce, follow up,
// clarify, change topic, finish) and the model only WRITES the question.
// Small local models write good questions when given one clear instruction,
// but make poor choices when asked to decide several things at once.

export type InterviewerMove =
  | { finished: true }
  | { finished: false; turn: Turn };

/** Above this word overlap with an earlier question, a new question counts as a repeat. */
const NEW_TOPIC_REPEAT_THRESHOLD = 0.5;
/** A follow-up this similar to the previous question is just re-asking it. */
const FOLLOW_UP_REPEAT_THRESHOLD = 0.7;

/** The interviewer's next move: the opening, a question, or the end of the interview. */
export async function nextInterviewerMove(session: InterviewSession, first: boolean): Promise<InterviewerMove> {
  if (first) {
    // The opening is written from templates: reliable, varied and instant.
    return { finished: false, turn: makeTurn(introduction(session), INTRODUCTION_TOPIC) };
  }

  const plan = planNextQuestion(session);
  if (plan === 'finish') return { finished: true };

  let result = await askModel(session, plan);
  const problem = findProblem(session, plan, result);
  if (problem) result = await askModel(session, { ...plan, correction: problem });

  const question = result.question?.trim();
  if (!question) throw new Error('The interviewer model did not return a question. Please submit your answer again.');

  // Follow-ups and clarifications stay on the current topic, whatever label the model chose.
  const topic = plan.kind === 'newTopic' ? result.topic?.trim() || plan.focusArea.area : currentTopic(session);
  return {
    finished: false,
    turn: {
      ...makeTurn(question, topic),
      isFollowUp: plan.kind !== 'newTopic',
      isClarification: plan.kind === 'clarify' || undefined,
    },
  };
}

/** Decides what kind of question comes next, purely from the transcript. */
function planNextQuestion(session: InterviewSession): QuestionPlan | 'finish' {
  const answered = countAnswers(session);
  const lastTopic = currentTopic(session);

  if (candidateAskedClarification(session)) return { kind: 'clarify' };

  const followUpsLeft = followUpStreak(session) < MAX_FOLLOW_UPS_IN_A_ROW[session.mode];
  const gaveUp = candidateGaveUp(session);
  // The introduction gets one follow-up too ("you mentioned X — tell me more").
  if (followUpsLeft && !gaveUp) return { kind: 'followUp' };

  // A topic just finished: end here if we've covered enough.
  if (answered >= TARGET_ANSWERS[session.mode]) return 'finish';

  return {
    kind: 'newTopic',
    focusArea: nextFocusArea(session),
    coveredTopics: coveredTopics(session),
    candidateGaveUp: gaveUp,
    previousTopic: lastTopic,
  };
}

/** Returns a correction for the model if its question breaks the plan, otherwise undefined. */
function findProblem(session: InterviewSession, plan: QuestionPlan, result: NextQuestion) {
  const question = result.question?.trim();
  if (!question) return 'You returned an empty question. Ask one question.';

  const previousQuestion = askedQuestions(session).at(-1) || '';
  if (plan.kind === 'followUp' && questionOverlap(question, previousQuestion) >= FOLLOW_UP_REPEAT_THRESHOLD) {
    return 'You repeated your previous question. Ask about one specific thing the candidate said in their answer instead.';
  }

  if (plan.kind === 'newTopic') {
    // Compare wording with every earlier question — the model often renames the same subject.
    const similar = askedQuestions(session).find(q => questionOverlap(question, q) >= NEW_TOPIC_REPEAT_THRESHOLD);
    if (similar) {
      return `Your question repeats an earlier subject (${sharedKeyWords(question, similar).join(', ')}). ` +
        `Ask about something clearly different within: ${plan.focusArea.area}.`;
    }
  }
  return undefined;
}

function askModel(session: InterviewSession, plan: QuestionPlan) {
  return ollamaChat<NextQuestion>(
    interviewerSystem(session.interviewerName || 'Alex'),
    makeQuestionPrompt(session, plan),
    nextQuestionSchema,
  );
}

function makeTurn(content: string, topic?: string): Turn {
  return { role: 'interviewer', content, topic, isFollowUp: false, createdAt: new Date().toISOString() };
}

/** Asks the model to review the whole transcript and produce coaching feedback. */
export async function generateReport(session: InterviewSession) {
  const report = await ollamaChat<InterviewReport>(reportSystem, makeReportPrompt(session), reportSchema);

  // The model sometimes attaches feedback to the wrong question or misquotes
  // answers, so the real question/answer text is filled in from the transcript.
  const pairs = questionAnswerPairs(session);
  report.questionFeedback = pairs.map((pair, i) => {
    const generated = report.questionFeedback?.[i] as InterviewReport['questionFeedback'][number] | undefined;
    return {
      question: pair.question,
      answer: pair.answer,
      score: generated?.score ?? 0,
      feedback: generated?.feedback || 'No feedback was generated for this question.',
      idealAnswer: generated?.idealAnswer || '',
    };
  });
  return report;
}

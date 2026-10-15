import type { Difficulty, InterviewMode, InterviewSession } from './types';

// ---------------------------------------------------------------------------
// Interview length — enforced in code, not left to the model.
// ---------------------------------------------------------------------------

/** Topic label of the opening question (greeting + "tell me about yourself"). */
export const INTRODUCTION_TOPIC = 'Introduction';

/**
 * The interview ends at the first topic boundary after this many answers
 * (it never stops halfway through a topic). The introduction and each topic
 * take about two answers (question + follow-up).
 */
export const TARGET_ANSWERS: Record<InterviewMode, number> = {
  Technical: 8,
  'DSA & Coding': 8,
  'System Design': 8,
  Behavioral: 8,
  'Resume Deep Dive': 8,
  'Full Mock': 10, // intro + technical, coding, design and behavioral
};
/**
 * After this many follow-ups in a row, the interviewer must change topic.
 * Coding problems need a few rounds (approach → complexity → edge cases);
 * elsewhere one follow-up keeps the practice varied.
 */
export const MAX_FOLLOW_UPS_IN_A_ROW: Record<InterviewMode, number> = {
  Technical: 1,
  'DSA & Coding': 2,
  'System Design': 1, // its focus areas are already successive stages of one design
  Behavioral: 1,
  'Resume Deep Dive': 1,
  'Full Mock': 1,
};

// ---------------------------------------------------------------------------
// How each interview mode should be run.
// ---------------------------------------------------------------------------

export const MODE_GUIDES: Record<InterviewMode, string> = {
  Technical:
    'Ask about core concepts in the technologies the role and resume mention. Probe how and why things work, ' +
    'common pitfalls, and trade-offs between alternatives. Prefer practical scenarios over textbook definitions.',
  'DSA & Coding':
    'Give one concrete coding problem at a time with clear input/output and one small example. Ask the candidate ' +
    'to explain their approach before coding, then follow up on time/space complexity, edge cases and possible ' +
    'optimizations. A single problem may span several follow-ups before you move to a new one.',
  'System Design':
    'Pick one realistic system relevant to the role. Guide the discussion in stages: clarify requirements and scale, ' +
    'high-level architecture, data model and storage, then deep dives (caching, consistency, failure handling, scaling). ' +
    'Most questions should be follow-ups that go deeper on the same design.',
  Behavioral:
    'Ask for specific past situations (not hypotheticals) about ownership, conflict, failure, collaboration and ' +
    'impact. Expect STAR structure; follow up on the candidate’s personal role, the decisions they made and ' +
    'measurable outcomes.',
  'Resume Deep Dive':
    'Pick specific projects and claims from the resume. Probe the candidate’s exact contribution, technical decisions ' +
    'and their alternatives, results and metrics, and what they would do differently.',
  'Full Mock':
    'Run a realistic end-to-end interview: after the introduction, cover 2-3 technical questions, ' +
    '1-2 coding/problem-solving questions, 1 system design question, then 1-2 behavioral questions.',
};

/**
 * What the model is shown when writing a question for an area. Small models
 * latch onto whatever context they see (e.g. a resume that mentions code
 * splitting turns every question into a code-splitting question), so each
 * area only gets the context it actually needs.
 */
export type FocusContext = 'resume' | 'jobDescription' | 'none';
export type FocusArea = { area: string; context: FocusContext };

const jd = (area: string): FocusArea => ({ area, context: 'jobDescription' });
const resume = (area: string): FocusArea => ({ area, context: 'resume' });
const plain = (area: string): FocusArea => ({ area, context: 'none' });

/**
 * The order of focus areas for each mode. Each time the interviewer moves to a
 * new topic, the code picks the next area from this list and tells the model,
 * because small models are bad at choosing a fresh topic on their own.
 */
export const FOCUS_AREAS: Record<InterviewMode, FocusArea[]> = {
  Technical: [
    jd('a core technical concept from the job description'),
    resume('a technology the candidate lists on their resume'),
    jd('debugging a realistic production problem in this tech stack'),
    jd('testing and code quality'),
    jd('a trade-off between two tools or approaches in this tech stack'),
    jd('security or reliability'),
    resume('the architecture of one of their past projects'),
    jd('performance in this tech stack'),
  ],
  'DSA & Coding': [
    plain('an array or string coding problem'),
    plain('a hash map or two-pointer coding problem'),
    plain('a tree or graph coding problem'),
    plain('a dynamic programming or greedy coding problem'),
    plain('a stack, queue or heap coding problem'),
  ],
  'System Design': [
    jd('clarifying requirements and estimating scale for a system relevant to the role'),
    jd('the high-level architecture of that system'),
    jd('its data model and storage choices'),
    jd('its API design'),
    jd('caching and performance'),
    jd('scaling and bottlenecks'),
    jd('reliability and failure handling'),
    jd('monitoring and the biggest trade-offs made'),
  ],
  Behavioral: [
    resume('a project they are proud of and their personal role in it'),
    plain('a conflict or disagreement with a teammate'),
    plain('a mistake or failure and what they learned'),
    plain('delivering under a tight deadline'),
    plain('handling ambiguous requirements'),
    plain('receiving or giving difficult feedback'),
    plain('mentoring or helping others'),
    plain('influencing a decision without authority'),
  ],
  'Resume Deep Dive': [
    resume('their most significant project on the resume'),
    resume('a key technical decision in one of their projects and the alternatives'),
    resume('a measurable impact or metric claimed on the resume'),
    resume('the hardest bug or challenge in one of their projects'),
    resume('a second project or role on the resume'),
    resume('what they would do differently in a past project'),
    resume('a skill listed on the resume, tested in depth'),
  ],
  // Ordered so a standard-length session covers technical, coding, design and behavioral.
  'Full Mock': [
    jd('a core technical concept from the job description'),
    plain('a coding problem (approach first, then complexity)'),
    jd('a small system design question relevant to the role'),
    plain('a behavioral question about ownership or a challenge they faced'),
    jd('a second, different technical topic from the job description'),
    plain('a behavioral question about teamwork or conflict'),
  ],
};

/**
 * Modes where questions build on one problem, so the model always needs the
 * full conversation (e.g. a coding problem stated three questions ago).
 */
export const NEEDS_FULL_CONVERSATION = new Set<InterviewMode>(['DSA & Coding', 'System Design']);

export const DIFFICULTY_GUIDES: Record<Difficulty, string> = {
  Easy: 'Junior level: fundamentals and common, well-known scenarios. Keep scope small.',
  Medium: 'Mid level: practical problems, reasoning about trade-offs, and moderate edge cases.',
  Hard: 'Senior level: ambiguous problems, deep internals, scale, failure modes and subtle edge cases.',
};

// ---------------------------------------------------------------------------
// Progress helpers (computed from the transcript).
// ---------------------------------------------------------------------------

export function countAnswers(session: Pick<InterviewSession, 'turns'>) {
  return session.turns.filter(t => t.role === 'candidate').length;
}

/** Distinct topics the interviewer has already asked about, in order. */
export function coveredTopics(session: Pick<InterviewSession, 'turns'>) {
  const topics = session.turns
    .filter(t => t.role === 'interviewer' && t.topic)
    .map(t => t.topic!.trim());
  return [...new Set(topics)];
}

/**
 * The focus area for the next new topic (cycles through FOCUS_AREAS for the mode).
 * The opening introduction doesn't count as a focus area.
 */
export function nextFocusArea(session: Pick<InterviewSession, 'turns' | 'mode'>): FocusArea {
  const topicsStarted = session.turns.filter(
    t => t.role === 'interviewer' && !t.isFollowUp && t.topic !== INTRODUCTION_TOPIC,
  ).length;
  const areas = FOCUS_AREAS[session.mode];
  return areas[topicsStarted % areas.length];
}

/** The topic label of the most recent question. */
export function currentTopic(session: Pick<InterviewSession, 'turns'>) {
  return [...session.turns].reverse().find(t => t.role === 'interviewer')?.topic;
}

/** True if the latest answer is a short "I don't know" / "skip". */
export function candidateGaveUp(session: Pick<InterviewSession, 'turns'>) {
  const last = session.turns[session.turns.length - 1];
  if (last?.role !== 'candidate') return false;
  const short = last.content.split(/\s+/).length <= 25;
  const givingUp = /\b(i\s*(do\s*not|don'?t)\s*know|not\s+sure|no\s+idea|(can'?t|cannot)\s+(remember|recall)|skip( this)?|pass)\b/i;
  return short && givingUp.test(last.content);
}

/**
 * How many of the most recent questions were follow-ups on the same topic.
 * Answers to the candidate's clarifying questions don't count.
 */
export function followUpStreak(session: Pick<InterviewSession, 'turns'>) {
  let streak = 0;
  const questions = session.turns.filter(t => t.role === 'interviewer' && !t.isClarification);
  for (let i = questions.length - 1; i >= 0 && questions[i].isFollowUp; i--) streak++;
  return streak;
}

/** True if the latest answer is really a question back, e.g. "Should I assume the list is sorted?" */
export function candidateAskedClarification(session: Pick<InterviewSession, 'turns'>) {
  const last = session.turns[session.turns.length - 1];
  if (last?.role !== 'candidate') return false;
  const text = last.content.trim();
  const short = text.split(/\s+/).length <= 40;
  const clarifyingPhrase = /^(before i (answer|start)|(can|could) you (clarify|repeat|explain)|do you mean|should i (assume|consider)|is it (ok|okay|fine) (if|to)|are we (assuming|talking))/i;
  return short && (text.endsWith('?') || clarifyingPhrase.test(text));
}

/** All questions the interviewer has asked so far, oldest first. */
export function askedQuestions(session: Pick<InterviewSession, 'turns'>) {
  return session.turns.filter(t => t.role === 'interviewer').map(t => t.content);
}

// ---------------------------------------------------------------------------
// Repeat detection: compares the key words of two questions. Topic labels
// aren't reliable for this — the model renames the same subject.
// ---------------------------------------------------------------------------

const FILLER_WORDS = new Set([
  'about', 'could', 'would', 'should', 'your', 'with', 'that', 'this', 'what', 'have', 'there', 'their',
  'which', 'when', 'where', 'were', 'from', 'into', 'more', 'some', 'detail', 'details', 'provide',
  'walk', 'through', 'explain', 'tell', 'describe', 'share', 'thanks', 'okay', 'helpful', 'used', 'using',
  'process', 'specific', 'example', 'approach', 'ensure', 'ensured', 'make', 'sure', 'that’s', 'it’s',
]);

function keyWords(text: string) {
  const words = text.toLowerCase().match(/[a-z][a-z0-9+#.]{3,}/g) || [];
  return new Set(words.map(w => w.replace(/\.$/, '')).filter(w => !FILLER_WORDS.has(w)));
}

/** Key words two questions share (e.g. ["code", "splitting", "dashboard"]). */
export function sharedKeyWords(a: string, b: string) {
  const wordsB = keyWords(b);
  return [...keyWords(a)].filter(w => wordsB.has(w));
}

/** 0..1 — how much of the shorter question's key words appear in the other. */
export function questionOverlap(a: string, b: string) {
  const size = Math.min(keyWords(a).size, keyWords(b).size);
  return size ? sharedKeyWords(a, b).length / size : 0;
}

/**
 * The transcript as question → answer pairs, in order. A clarification
 * exchange is folded into the answer of the question it was about, and an
 * unanswered final question is left out.
 */
export function questionAnswerPairs(session: Pick<InterviewSession, 'turns'>) {
  const pairs: { question: string; answer: string }[] = [];
  session.turns.forEach((turn, i) => {
    if (turn.role !== 'interviewer') return;
    const next = session.turns[i + 1];
    const answer = next?.role === 'candidate' ? next.content : '';

    if (turn.isClarification && pairs.length) {
      pairs[pairs.length - 1].answer += ` [Interviewer clarified: ${turn.content}] ${answer}`;
      return;
    }
    if (answer) pairs.push({ question: turn.content, answer });
  });
  return pairs;
}

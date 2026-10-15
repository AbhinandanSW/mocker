// Shared types used by both the UI (app/page.tsx, components/) and the API routes.

export const INTERVIEW_MODES = [
  'Technical',
  'DSA & Coding',
  'System Design',
  'Behavioral',
  'Resume Deep Dive',
  'Full Mock',
] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** What the user fills in on the setup screen (body of POST /api/interview/start). */
export type InterviewSetup = {
  role: string;
  company: string;
  mode: InterviewMode;
  difficulty: Difficulty;
  resumeText: string;
  jobDescription: string;
};

/** One message in the interview transcript. */
export type Turn = {
  role: 'interviewer' | 'candidate';
  content: string;
  createdAt: string;
  /** Interviewer turns only: what the question was about. */
  topic?: string;
  /** Interviewer turns only: true if it digs into the previous answer. */
  isFollowUp?: boolean;
  /** Interviewer turns only: true if it answers the candidate's clarifying question. */
  isClarification?: boolean;
  score?: number;
  feedback?: string;
};

export type InterviewSession = {
  id: string;
  role: string;
  company: string;
  mode: InterviewMode;
  difficulty: Difficulty;
  resumeText: string;
  jobDescription: string;
  status: 'active' | 'completed';
  /** The interviewer persona's name (e.g. "Priya"), used in the greeting. */
  interviewerName?: string;
  turns: Turn[];
  createdAt: string;
  updatedAt: string;
  report?: InterviewReport;
};

/** Lightweight version of a session shown in the history drawer. */
export type SessionSummary = Pick<
  InterviewSession,
  'id' | 'role' | 'company' | 'mode' | 'status' | 'createdAt' | 'updatedAt' | 'report'
>;

/** What the LLM returns each time it writes the next question. */
export type NextQuestion = {
  question: string;
  topic: string;
};

export type InterviewReport = {
  overallScore: number;
  recommendation: string;
  categories: { name: string; score: number; weight: number; rationale: string }[];
  strengths: string[];
  improvements: string[];
  questionFeedback: {
    question: string;
    answer: string;
    score: number;
    feedback: string;
    idealAnswer: string;
  }[];
  studyPlan: string[];
  summary: string;
};

/** Response of GET /api/health. The top-level fields describe Ollama. */
export type RuntimeHealth = {
  ok: boolean;
  model: string;
  installed?: boolean;
  models?: string[];
  message: string;
  /** Local Whisper speech-to-text server (optional — the app falls back to browser recognition). */
  whisper?: { ok: boolean; message: string };
};

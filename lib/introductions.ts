import type { InterviewMode, InterviewSession } from './types';

// The interview opening, written from templates instead of by the model:
// it's always correct (greeting, name, what the round covers, "tell me about
// yourself"), varies between sessions, and needs no AI call, so it's instant.

const GREETINGS = [
  (name: string, at: string) => `Hi, I'm ${name}${at}. Thanks for taking the time today.`,
  (name: string, at: string) => `Hello! I'm ${name}${at}, and I'll be your interviewer today.`,
  (name: string, at: string) => `Hi there, I'm ${name}${at}. It's great to meet you.`,
  (name: string, at: string) => `Hey, welcome! My name is ${name}${at}, and I'll be running this session.`,
];

const ROUND_DESCRIPTIONS: Record<InterviewMode, string> = {
  Technical: "In this round we'll go through some technical concepts and how you've applied them in your work.",
  'DSA & Coding': "In this round we'll work through a couple of coding problems together. Please think out loud as you go.",
  'System Design': "In this round we'll design a system together, starting from the requirements and going deeper step by step.",
  Behavioral: "In this round I'd like to hear about some real situations from your experience.",
  'Resume Deep Dive': "In this round I'd like to dig into the projects and experience on your resume.",
  'Full Mock': "We'll cover a bit of everything today: some technical questions, a coding problem, a little design, and your experience.",
};

const OPENING_QUESTIONS = [
  "To start, could you tell me a bit about yourself and what you've been working on recently?",
  "Let's begin with a quick introduction. Tell me about yourself and your current work.",
  'Before we dive in, could you walk me through your background and what you do day to day?',
];

const pick = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export function introduction(session: Pick<InterviewSession, 'interviewerName' | 'company' | 'mode'>) {
  const at = session.company ? `, an engineer at ${session.company}` : '';
  const greeting = pick(GREETINGS)(session.interviewerName || 'Alex', at);
  return `${greeting} ${ROUND_DESCRIPTIONS[session.mode]} ${pick(OPENING_QUESTIONS)}`;
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { saveSession } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { nextInterviewerMove } from '@/lib/interviewer';
import { DIFFICULTIES, INTERVIEW_MODES, type InterviewSession } from '@/lib/types';

export const runtime = 'nodejs';

const requestSchema = z.object({
  role: z.string().max(160).default('Software Engineer'),
  company: z.string().max(160).default(''),
  mode: z.enum(INTERVIEW_MODES),
  difficulty: z.enum(DIFFICULTIES),
  resumeText: z.string().max(20000).default(''),
  jobDescription: z.string().max(20000).default(''),
  /** Name of the interviewer persona the browser picked (matches the voice). */
  interviewerName: z.string().max(40).default('Alex'),
});

/** Creates a new interview session and returns the interviewer's opening question. */
export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json());
    if (!body.resumeText.trim() && !body.jobDescription.trim()) {
      return NextResponse.json({ error: 'Add a resume or job description to personalize the interview.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const session: InterviewSession = {
      id: randomUUID(),
      ...body,
      status: 'active',
      turns: [],
      createdAt: now,
      updatedAt: now,
    };

    const move = await nextInterviewerMove(session, true);
    if (move.finished) throw new Error('The interviewer could not produce an opening question. Please try again.');
    session.turns.push(move.turn);
    saveSession(session);

    return NextResponse.json({ session, question: move.turn.content });
  } catch (e) {
    return errorResponse(e, 'Could not start interview.');
  }
}

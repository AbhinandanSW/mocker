import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, saveSession } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { nextInterviewerMove } from '@/lib/interviewer';

export const runtime = 'nodejs';

const requestSchema = z.object({
  sessionId: z.string().uuid(),
  answer: z.string().min(1).max(12000),
});

/**
 * Records the candidate's answer and asks the model for the next question.
 * If the interview is over (decided in lib/interviewer.ts), responds with `finished: true`
 * and the client then calls /api/interview/finish.
 */
export async function POST(req: Request) {
  try {
    const body = requestSchema.parse(await req.json());
    const session = getSession(body.sessionId);
    if (!session) return NextResponse.json({ error: 'Interview session not found.' }, { status: 404 });
    if (session.status !== 'active') {
      return NextResponse.json({ error: 'This interview is already completed.' }, { status: 409 });
    }

    session.turns.push({ role: 'candidate', content: body.answer.trim(), createdAt: new Date().toISOString() });
    const move = await nextInterviewerMove(session, false);
    session.updatedAt = new Date().toISOString();

    if (move.finished) {
      saveSession(session);
      return NextResponse.json({ session, finished: true });
    }

    session.turns.push(move.turn);
    saveSession(session);
    return NextResponse.json({ session, question: move.turn.content, finished: false });
  } catch (e) {
    return errorResponse(e, 'Could not submit answer.');
  }
}

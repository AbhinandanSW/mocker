import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession, saveSession } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import { generateReport } from '@/lib/interviewer';

export const runtime = 'nodejs';

const requestSchema = z.object({ sessionId: z.string().uuid() });

/** Ends the interview, generates the scorecard and marks the session completed. */
export async function POST(req: Request) {
  try {
    const { sessionId } = requestSchema.parse(await req.json());
    const session = getSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Interview session not found.' }, { status: 404 });

    session.report = await generateReport(session);
    session.status = 'completed';
    session.updatedAt = new Date().toISOString();
    saveSession(session);

    return NextResponse.json({ session });
  } catch (e) {
    return errorResponse(e, 'Could not generate report.');
  }
}

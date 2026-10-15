import { NextResponse } from 'next/server';
import { getSession } from '@/lib/db';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';

/** Returns one full session (transcript + report). */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const session = getSession(id);
    if (!session) return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    return NextResponse.json({ session });
  } catch (e) {
    return errorResponse(e, 'Could not read session.', 500);
  }
}

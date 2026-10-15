import { NextResponse } from 'next/server';
import { listSessions } from '@/lib/db';
import { errorResponse } from '@/lib/http';
import type { SessionSummary } from '@/lib/types';

export const runtime = 'nodejs';

/** Lists recent sessions for the history drawer (without full transcripts). */
export async function GET() {
  try {
    const sessions: SessionSummary[] = listSessions().map(s => ({
      id: s.id,
      role: s.role,
      company: s.company,
      mode: s.mode,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      report: s.report,
    }));
    return NextResponse.json({ sessions });
  } catch (e) {
    return errorResponse(e, 'Could not read sessions.', 500);
  }
}

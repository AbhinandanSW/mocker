import { NextResponse } from 'next/server';

/** Standard JSON error response used by every API route. */
export function errorResponse(error: unknown, fallbackMessage: string, status = 400) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}

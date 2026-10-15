import { NextResponse } from 'next/server';
import { checkOllama } from '@/lib/ollama';
import { checkWhisper } from '@/lib/whisper';
import type { RuntimeHealth } from '@/lib/types';

export const runtime = 'nodejs';

/** Reports whether Ollama (required) and Whisper (optional) are available. */
export async function GET() {
  const [ollama, whisper] = await Promise.all([checkOllama(), checkWhisper()]);
  const health: RuntimeHealth = { ...ollama, whisper };
  return NextResponse.json(health);
}

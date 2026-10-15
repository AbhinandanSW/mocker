import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/http';
import { transcribeAudio } from '@/lib/whisper';

export const runtime = 'nodejs';

/** 16 kHz mono WAV is ~1.9 MB per minute, so this allows ~15 minutes. */
const MAX_AUDIO_BYTES = 30 * 1024 * 1024;

/** Receives a recorded answer (WAV) and returns Whisper's transcript. */
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const audio = form.get('audio');
    const prompt = String(form.get('prompt') || '');

    if (!(audio instanceof File)) return NextResponse.json({ error: 'No audio was received.' }, { status: 400 });
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Recording is too long. Keep answers under ~15 minutes.' }, { status: 413 });
    }

    const text = await transcribeAudio(audio, prompt);
    return NextResponse.json({ text });
  } catch (e) {
    return errorResponse(e, 'Could not transcribe audio.', 502);
  }
}

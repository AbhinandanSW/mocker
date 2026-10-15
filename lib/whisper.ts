// Client for a local whisper.cpp server (`whisper-server`), used to turn
// recorded answers into text. See README → "Accurate voice transcription".

const baseUrl = (process.env.WHISPER_BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

const TRANSCRIBE_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 1_500;
/** Whisper only uses roughly the last 224 tokens of the prompt. */
const MAX_PROMPT_CHARS = 600;

/**
 * Transcribes a 16 kHz mono WAV file.
 * `prompt` primes Whisper's vocabulary (e.g. the interviewer's question),
 * which helps it spell technical terms like "useMemo" or "Kafka" correctly.
 */
export async function transcribeAudio(audio: Blob, prompt = ''): Promise<string> {
  const form = new FormData();
  form.append('file', audio, 'answer.wav');
  form.append('response_format', 'json');
  form.append('language', 'en');
  form.append('temperature', '0');
  if (prompt) form.append('prompt', prompt.slice(-MAX_PROMPT_CHARS));

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/inference`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS),
    });
  } catch {
    throw new Error(`Cannot reach Whisper at ${baseUrl}. Is whisper-server running?`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Whisper returned ${response.status}. ${detail.slice(0, 180)}`);
  }

  const data = (await response.json()) as { text?: string; error?: string };
  if (data.error) throw new Error(`Whisper error: ${data.error}`);
  return cleanTranscript(data.text || '');
}

/**
 * Removes Whisper's non-speech markers such as "[BLANK_AUDIO]", "[Music]" or
 * "(inaudible)" and tidies whitespace.
 */
function cleanTranscript(text: string) {
  return text
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function checkWhisper() {
  try {
    const response = await fetch(baseUrl, { cache: 'no-store', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return { ok: response.ok, message: response.ok ? 'Whisper is reachable.' : 'Whisper did not respond successfully.' };
  } catch {
    return { ok: false, message: `Whisper is not running at ${baseUrl}.` };
  }
}

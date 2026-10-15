import type { RuntimeHealth } from './types';

const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

const CHAT_TIMEOUT_MS = 180_000; // local models can be slow on modest hardware
const HEALTH_TIMEOUT_MS = 2_500;

/**
 * Sends a system + user prompt to Ollama and parses the reply as JSON.
 * Pass a JSON schema to force the shape of the model's output.
 */
export async function ollamaChat<T>(system: string, prompt: string, schema?: object): Promise<T> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      stream: false,
      format: schema || 'json',
      options: { temperature: 0.35, num_ctx: 8192 },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Ollama returned ${response.status}. Is Ollama running and model "${model}" installed? ${detail.slice(0, 180)}`,
    );
  }

  const payload = (await response.json()) as { message?: { content?: string } };
  const content = payload.message?.content;
  if (!content) throw new Error('Ollama returned an empty response. Try again or select another model.');

  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`Could not parse the model response as JSON. Try again. Response: ${content.slice(0, 160)}`);
  }
}

/** Checks that Ollama is reachable and the configured model is installed. */
export async function checkOllama(): Promise<RuntimeHealth> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, model, message: 'Ollama did not respond successfully.' };

    const data = (await response.json()) as { models?: { name: string }[] };
    const models = (data.models || []).map(m => m.name);
    const installed = models.some(name => name === model || name.startsWith(`${model}:`));

    return {
      ok: true,
      model,
      installed,
      models,
      message: models.length ? 'Ollama is reachable.' : 'Ollama is running but no models are installed.',
    };
  } catch {
    return { ok: false, model, message: `Cannot connect to Ollama at ${baseUrl}.` };
  }
}

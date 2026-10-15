// Thin wrappers around the browser's text-to-speech API (window.speechSynthesis).
import { resolveVoice, whenVoicesReady, type InterviewerPersona } from './voices';

function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Splits text into sentences. Speaking sentence by sentence gives natural
 * pauses, and avoids a Chrome bug that cuts off utterances longer than ~15 s.
 */
function splitSentences(text: string) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

/** Reads text aloud in the persona's voice, interrupting anything currently being spoken. */
export function speak(text: string, persona?: InterviewerPersona) {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();

  whenVoicesReady(() => {
    const voice = persona ? resolveVoice(persona) : undefined;
    for (const sentence of splitSentences(text)) {
      const utterance = new SpeechSynthesisUtterance(sentence);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = persona?.rate ?? 0.96;
      utterance.pitch = persona?.pitch ?? 1;
      window.speechSynthesis.speak(utterance);
    }
  });
}

export function stopSpeaking() {
  if (isSupported()) window.speechSynthesis.cancel();
}

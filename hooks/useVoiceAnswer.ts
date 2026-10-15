'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useSpeechRecognition } from './useSpeechRecognition';
import { toWhisperWav } from '@/lib/audio';
import { stopSpeaking } from '@/lib/speech';
import { errorMessage, fetchJson, joinText } from '@/lib/utils';

type Options = {
  answer: string;
  setAnswer: React.Dispatch<React.SetStateAction<string>>;
  /** True when the local Whisper server is running. */
  whisperReady: boolean;
  /** Text that primes Whisper's vocabulary — usually the current question. */
  promptHint: string;
};

/**
 * Voice answers, in two layers:
 *
 *  1. Recording (when Whisper is available): the whole answer is recorded and,
 *     when you stop, transcribed by Whisper on this machine. This is the
 *     accurate transcript that ends up in the answer box.
 *  2. Live preview: the browser's speech recognition shows words as you speak,
 *     so you can see the mic is working. Without Whisper, this preview *is*
 *     the transcript.
 */
export function useVoiceAnswer({ answer, setAnswer, whisperReady, promptHint }: Options) {
  const [transcribing, setTranscribing] = useState(false);
  const [notice, setNotice] = useState('');
  const recorder = useAudioRecorder();

  // Answer text as it was when capture started, and what the preview heard since.
  const baseAnswerRef = useRef('');
  const spokenRef = useRef('');
  const answerRef = useRef(answer);
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const appendSpoken = useCallback(
    (text: string) => {
      spokenRef.current = joinText(spokenRef.current, text.trim());
      setAnswer(prev => joinText(prev, text.trim()));
    },
    [setAnswer],
  );
  const preview = useSpeechRecognition(appendSpoken);

  const capturing = recorder.recording || preview.listening;

  async function start() {
    stopSpeaking(); // don't record the interviewer's voice
    setNotice('');
    baseAnswerRef.current = answerRef.current;
    spokenRef.current = '';

    if (whisperReady) {
      const error = await recorder.start();
      if (error) {
        setNotice(error);
        return;
      }
    }
    preview.start();
  }

  /** Stops capturing and resolves to the final answer text. */
  async function stop(): Promise<string> {
    preview.stop(); // also keeps any words it was still recognizing
    const previewAnswer = joinText(baseAnswerRef.current, spokenRef.current);

    if (!recorder.recording) return previewAnswer;
    const recording = await recorder.stop();
    if (!recording || recording.size === 0) return previewAnswer;

    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('audio', await toWhisperWav(recording), 'answer.wav');
      form.append('prompt', promptHint);
      const { text } = await fetchJson<{ text: string }>('/api/transcribe', { method: 'POST', body: form });

      if (!text) {
        setNotice('Whisper did not hear any speech, so the live transcript was kept. Please review it.');
        return previewAnswer;
      }
      const finalAnswer = joinText(baseAnswerRef.current, text);
      setAnswer(finalAnswer);
      setNotice('Transcribed with Whisper. Review or edit it, then submit.');
      return finalAnswer;
    } catch (e) {
      setNotice(`${errorMessage(e, 'Whisper transcription failed.')} Kept the browser's live transcript — please review it.`);
      return previewAnswer;
    } finally {
      setTranscribing(false);
    }
  }

  function statusMessage() {
    if (transcribing) return 'Transcribing your answer with Whisper…';
    if (recorder.recording) {
      return 'Recording your full answer. The live text is a rough preview — Whisper replaces it with an accurate transcript when you stop.';
    }
    if (preview.listening) {
      return 'Recording… your words appear in the box as you speak. Pause as long as you need, then stop recording to edit.';
    }
    return notice || preview.notice;
  }

  return {
    capturing,
    transcribing,
    /** Words still being recognized, to show live after the answer text. */
    liveText: preview.interimText,
    status: statusMessage(),
    start,
    stop,
  };
}

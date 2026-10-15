'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Records microphone audio with MediaRecorder. Unlike browser speech
 * recognition, a recording never stops on its own, so the whole answer is kept.
 */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  /** Starts recording. Resolves to an error message, or '' on success. */
  const start = useCallback(async (): Promise<string> => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return 'Audio recording is not supported in this browser.';
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Echo cancellation also stops the interviewer's spoken question
        // from leaking into the recording.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const denied = e instanceof DOMException && e.name === 'NotAllowedError';
      return denied
        ? 'Microphone permission was denied. Allow mic access from the browser address bar, or type your answer.'
        : 'Could not access the microphone. Check that one is connected, or type your answer.';
    }

    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start(1000); // collect data every second so nothing is lost if the tab crashes mid-answer
    setRecording(true);
    return '';
  }, []);

  /** Stops recording and resolves to the recorded audio (or null if nothing was recording). */
  const stop = useCallback(
    () =>
      new Promise<Blob | null>(resolve => {
        const recorder = recorderRef.current;
        recorderRef.current = null;
        setRecording(false);

        if (!recorder || recorder.state === 'inactive') {
          releaseMic();
          resolve(null);
          return;
        }

        recorder.onstop = () => {
          releaseMic();
          resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
        };
        recorder.stop();
      }),
    [releaseMic],
  );

  // Release the mic if the component unmounts mid-recording.
  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      releaseMic();
    },
    [releaseMic],
  );

  return { recording, start, stop };
}

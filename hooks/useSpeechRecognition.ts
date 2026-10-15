'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Minimal typings for the browser Web Speech API (not included in TS's DOM lib).
// ---------------------------------------------------------------------------
type SpeechRecognitionResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionClass = new () => SpeechRecognitionLike;
type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionClass;
  webkitSpeechRecognition?: SpeechRecognitionClass;
};

function getRecognitionClass() {
  if (typeof window === 'undefined') return undefined;
  const w = window as SpeechWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

/** Use the browser's English variant (e.g. en-IN) for better accent accuracy; fall back to en-US. */
function pickLanguage() {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  return lang?.toLowerCase().startsWith('en') ? lang : 'en-US';
}

// ---------------------------------------------------------------------------
// ContinuousRecognizer
//
// Browsers (Chrome/Edge) are bad at "continuous" recognition:
//   1. They end the session on their own every few seconds to a minute
//      (silence → 'no-speech', ~60 s limit, network blips).
//   2. When a session ends, words that weren't finalized yet are thrown away.
//   3. Restarting the *same* recognition object sometimes silently stops
//      delivering results — the mic looks on, but nothing is transcribed.
//
// So this class:
//   - creates a FRESH recognition object for every session (fixes 3)
//   - keeps unfinished words when a session ends instead of dropping them (fixes 2)
//   - restarts immediately whenever the browser ends a session (fixes 1)
//   - runs a watchdog that restarts a session that has gone silent/hung
// ---------------------------------------------------------------------------

const FATAL_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow mic access from the browser address bar, or type your answer.',
  'service-not-allowed': 'Speech recognition is blocked in this browser. You can continue by typing.',
  'audio-capture': 'No microphone was found. Check that one is connected, or type your answer.',
  'language-not-supported': 'Speech recognition does not support this language. You can continue by typing.',
};

/** Errors that are part of normal operation and shouldn't count as failures. */
const HARMLESS_ERRORS = new Set(['no-speech', 'aborted']);

const RESTART_DELAY_MS = 100;
/** If a session produces no events at all for this long, assume it's hung and replace it. */
const HUNG_SESSION_MS = 12_000;
const WATCHDOG_INTERVAL_MS = 3_000;
/** Give up after this many sessions in a row that errored without hearing anything. */
const MAX_CONSECUTIVE_FAILURES = 5;

type RecognizerCallbacks = {
  /** A finished phrase to append to the answer. */
  onFinal: (text: string) => void;
  /** Words still being recognized (replace, don't append). Empty string clears it. */
  onInterim: (text: string) => void;
  /** Recognition stopped by itself; `message` explains why. */
  onStopped: (message: string) => void;
};

class ContinuousRecognizer {
  private current: SpeechRecognitionLike | null = null;
  private wantListening = false;
  private interimText = '';
  private failures = 0;
  private lastEventAt = 0;
  private restartTimer: number | undefined;
  private watchdogTimer: number | undefined;

  constructor(private Recognition: SpeechRecognitionClass, private callbacks: RecognizerCallbacks) {}

  start() {
    this.wantListening = true;
    this.failures = 0;
    this.startSession();
    this.watchdogTimer = window.setInterval(() => this.checkForHang(), WATCHDOG_INTERVAL_MS);
  }

  /**
   * Stops listening. With `keepPending`, words still on screen are kept as
   * part of the answer; otherwise they're discarded (e.g. after submitting).
   */
  stop(keepPending: boolean) {
    this.wantListening = false;
    window.clearTimeout(this.restartTimer);
    window.clearInterval(this.watchdogTimer);
    this.endCurrentSession();
    if (keepPending) this.commitInterim();
    else this.setInterim('');
  }

  // --- internals ------------------------------------------------------------

  private startSession() {
    const recognition = new this.Recognition();
    recognition.lang = pickLanguage();
    recognition.continuous = true;
    recognition.interimResults = true;

    let heardSomething = false;
    let hadRealError = false;
    const isCurrent = () => this.current === recognition;
    const markAlive = () => {
      if (isCurrent()) this.lastEventAt = Date.now();
    };

    recognition.onstart = markAlive;
    recognition.onaudiostart = markAlive;
    recognition.onspeechstart = markAlive;

    recognition.onresult = event => {
      if (!isCurrent()) return;
      markAlive();
      heardSomething = true;
      this.failures = 0;

      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }

      if (finalText.trim()) this.callbacks.onFinal(finalText.trim() + ' ');
      this.setInterim(interimText.trim());
    };

    recognition.onerror = event => {
      if (!isCurrent()) return;
      markAlive();
      const fatalMessage = FATAL_ERRORS[event.error];
      if (fatalMessage) {
        this.stop(true);
        this.callbacks.onStopped(fatalMessage);
        return;
      }
      if (!HARMLESS_ERRORS.has(event.error)) hadRealError = true;
    };

    recognition.onend = () => {
      if (!isCurrent()) return;
      this.current = null;
      // The browser drops words it hadn't finalized yet — keep them instead.
      this.commitInterim();
      if (!this.wantListening) return;

      if (hadRealError && !heardSomething) this.failures += 1;
      if (this.failures >= MAX_CONSECUTIVE_FAILURES) {
        this.stop(true);
        this.callbacks.onStopped(
          'Speech recognition keeps disconnecting (check your internet connection). Click Speak answer to try again, or type.',
        );
        return;
      }
      this.scheduleRestart();
    };

    this.current = recognition;
    this.lastEventAt = Date.now();
    try {
      recognition.start();
    } catch {
      this.current = null;
      this.failures += 1;
      this.scheduleRestart();
    }
  }

  private scheduleRestart() {
    window.clearTimeout(this.restartTimer);
    this.restartTimer = window.setTimeout(() => {
      if (this.wantListening && !this.current) this.startSession();
    }, RESTART_DELAY_MS);
  }

  /** Replaces a session that has stopped sending any events. */
  private checkForHang() {
    if (!this.wantListening || !this.current) return;
    if (Date.now() - this.lastEventAt < HUNG_SESSION_MS) return;
    this.endCurrentSession();
    this.commitInterim();
    this.scheduleRestart();
  }

  /** Detaches and aborts the current session so its late events are ignored. */
  private endCurrentSession() {
    const recognition = this.current;
    this.current = null;
    if (!recognition) return;
    recognition.onstart = recognition.onaudiostart = recognition.onspeechstart = null;
    recognition.onresult = recognition.onerror = recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      // already stopped
    }
  }

  private setInterim(text: string) {
    this.interimText = text;
    this.callbacks.onInterim(text);
  }

  private commitInterim() {
    if (this.interimText) this.callbacks.onFinal(this.interimText + ' ');
    this.setInterim('');
  }
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Continuous speech-to-text that stays on until `stop()` is called.
 *  - finished phrases are passed to `onFinalText` (append them to the answer)
 *  - `interimText` holds words still being recognized, for a live preview
 */
export function useSpeechRecognition(onFinalText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [notice, setNotice] = useState('');
  const recognizerRef = useRef<ContinuousRecognizer | null>(null);

  // Keep the latest callback without re-creating the recognizer.
  const onFinalTextRef = useRef(onFinalText);
  useEffect(() => {
    onFinalTextRef.current = onFinalText;
  }, [onFinalText]);

  /**
   * Turns the mic off. Pass a message to show the user why.
   * Pass `discardPending` when the answer was already submitted, so words
   * still being recognized don't leak into the next answer.
   */
  const stop = useCallback((message = '', discardPending = false) => {
    recognizerRef.current?.stop(!discardPending);
    recognizerRef.current = null;
    setListening(false);
    setNotice(message);
  }, []);

  const start = useCallback(() => {
    const Recognition = getRecognitionClass();
    if (!Recognition) {
      setNotice('Speech recognition is not available in this browser. Try Chrome or Edge, or type your answer. Browser recognition may use an online service.');
      return;
    }

    recognizerRef.current?.stop(true); // never run two at once
    const recognizer = new ContinuousRecognizer(Recognition, {
      onFinal: text => onFinalTextRef.current(text),
      onInterim: setInterimText,
      onStopped: message => {
        if (recognizerRef.current !== recognizer) return;
        recognizerRef.current = null;
        setListening(false);
        setNotice(message);
      },
    });

    recognizerRef.current = recognizer;
    setNotice('');
    setListening(true);
    recognizer.start();
  }, []);

  // Release the mic when the component using this hook unmounts.
  useEffect(() => () => recognizerRef.current?.stop(false), []);

  return { listening, interimText, notice, start, stop };
}

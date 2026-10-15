'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, AudioLines, Check, CheckCircle2, Clock3, LoaderCircle, Mic, MicOff,
  Play, RotateCcw, Send, Square, Volume2, VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { useVoiceAnswer } from '@/hooks/useVoiceAnswer';
import { speak, stopSpeaking } from '@/lib/speech';
import { cx, formatDuration, joinText } from '@/lib/utils';
import { createPersona, loadPersona, resolveVoice, savePersona, whenVoicesReady } from '@/lib/voices';
import type { InterviewSession, Turn } from '@/lib/types';

type Props = {
  session: InterviewSession;
  busy: boolean;
  busyText: string;
  error: string;
  /** True when the local Whisper server is running (accurate transcription). */
  whisperReady: boolean;
  onDismissError: () => void;
  /** Sends the answer. Resolves to false if it failed (the answer is then restored). */
  onSubmitAnswer: (answer: string) => Promise<boolean>;
  onFinish: () => void;
  onLeave: () => void;
};

/**
 * The live interview screen. Owns everything that only matters while
 * answering: the answer text, the microphone, spoken questions and the timer.
 * Render it with `key={session.id}` so each session starts fresh.
 */
export function InterviewView({
  session, busy, busyText, error, whisperReady, onDismissError, onSubmitAnswer, onFinish, onLeave,
}: Props) {
  const [answer, setAnswer] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const elapsed = useElapsedSeconds();

  const lastTurn = session.turns[session.turns.length - 1];
  const currentQuestion = [...session.turns].reverse().find(t => t.role === 'interviewer')?.content || '';

  // --- Voice answer (recording + Whisper, with a live browser preview) ------
  const voice = useVoiceAnswer({
    answer,
    setAnswer,
    whisperReady,
    promptHint: `${session.role} interview. ${currentQuestion}`,
  });
  const locked = voice.capturing || voice.transcribing; // box is read-only meanwhile

  // While recording, show words that are still being recognized live in the box.
  const displayedAnswer = joinText(answer, voice.liveText);

  // --- Interviewer persona & spoken questions --------------------------------

  // The same interviewer (name + voice) for the whole session, even after a reload.
  const [persona] = useState(() => loadPersona(session.id) ?? createPersona(session.interviewerName));
  useEffect(() => {
    whenVoicesReady(() => {
      resolveVoice(persona); // lock in a voice now so it never changes mid-interview
      savePersona(session.id, persona);
    });
  }, [persona, session.id]);

  // Read each new interviewer question aloud (if voice is on).
  useEffect(() => {
    if (voiceEnabled && lastTurn?.role === 'interviewer') speak(lastTurn.content, persona);
    // Only when a new turn arrives — not when voice is toggled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.turns.length]);

  // Stop talking when leaving the interview screen.
  useEffect(() => () => stopSpeaking(), []);

  // Keep the transcript scrolled to the newest message.
  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [session.turns.length, busy]);

  // --- Actions --------------------------------------------------------------
  async function submit() {
    if (busy || voice.transcribing) return;

    // Still recording? Stop first (and wait for Whisper) so the whole answer is
    // sent, and so the mic doesn't pick up the next question being read aloud.
    const text = (voice.capturing ? await voice.stop() : displayedAnswer).trim();
    if (!text) return;

    setAnswer('');
    const ok = await onSubmitAnswer(text);
    if (!ok) setAnswer(text);
    answerRef.current?.focus();
  }

  async function readAloud(text: string) {
    if (voice.capturing) await voice.stop(); // don't record the interviewer's voice
    speak(text, persona);
  }

  function toggleVoice() {
    if (voiceEnabled) stopSpeaking();
    setVoiceEnabled(v => !v);
  }

  function toggleMic() {
    if (voice.capturing) void voice.stop();
    else void voice.start();
  }

  const answeredCount = session.turns.filter(t => t.role === 'candidate').length;

  return (
    <>
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onLeave}><ArrowLeft size={16} /> Setup</Button>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> LIVE SESSION
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Clock3 size={16} />{formatDuration(elapsed)}
          <span className="text-slate-300">|</span>{answeredCount} answered
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          {/* Session header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
            <div>
              <div className="text-sm font-bold">{session.role}</div>
              <div className="mt-1 text-xs text-slate-500">
                {session.mode} · {session.difficulty} · {session.company || 'Practice interview'} · Interviewer: {persona.name}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={voiceEnabled ? 'outline' : 'ghost'} size="sm" onClick={toggleVoice} title="Toggle spoken questions">
                {voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />} Voice
              </Button>
              <Button variant="danger" size="sm" disabled={busy} onClick={onFinish}>
                <Square size={13} /> End interview
              </Button>
            </div>
          </div>

          {/* Transcript */}
          <div ref={transcriptRef} className="h-[min(54vh,560px)] min-h-[340px] space-y-5 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
            {session.turns.map((turn, i) => (
              <TranscriptMessage
                key={`${turn.createdAt}-${i}`}
                turn={turn}
                interviewerName={persona.name}
                onReadAloud={text => void readAloud(text)}
              />
            ))}
            {busy && <ThinkingBubble text={busyText} />}
          </div>

          <ErrorBanner message={error} onDismiss={onDismissError} className="mx-4 mt-3 sm:mx-6" />

          {/* Answer composer */}
          <div className="border-t border-slate-200 bg-white p-4 sm:p-6">
            <label htmlFor="answer" className="mb-2 block text-xs font-bold text-slate-600">YOUR ANSWER</label>
            <textarea
              ref={answerRef}
              id="answer"
              value={displayedAnswer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') void submit();
              }}
              placeholder={voice.capturing ? 'Listening… start speaking' : 'Speak your answer or type here… (Ctrl/⌘ + Enter to submit)'}
              rows={4}
              disabled={busy}
              // Typing while the mic is writing into the box would garble the text.
              readOnly={locked}
              className={cx(
                'w-full resize-y rounded-xl border px-4 py-3 text-sm leading-6 outline-none focus:ring-4 disabled:bg-slate-50',
                locked
                  ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-violet-400 focus:ring-violet-100',
              )}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={voice.capturing ? 'danger' : 'outline'} disabled={busy || voice.transcribing} onClick={toggleMic}>
                  {voice.transcribing ? <><LoaderCircle className="animate-spin" size={15} /> Transcribing…</>
                    : voice.capturing ? <><MicOff size={15} /> Stop recording</>
                    : <><Mic size={15} /> Speak answer</>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setAnswer('')} disabled={!answer || busy || locked}>
                  <RotateCcw size={13} /> Clear
                </Button>
              </div>
              <Button disabled={busy || voice.transcribing || !displayedAnswer.trim()} onClick={() => void submit()}>
                {busy ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={15} />} Submit answer
              </Button>
            </div>

            {voice.status && <p className="mt-3 text-xs text-slate-500">{voice.status}</p>}
            <p className="mt-3 text-[11px] leading-5 text-slate-400">
              Interview mode hides scoring and answer suggestions until you finish.{' '}
              {whisperReady
                ? 'Answers are transcribed by Whisper on this machine.'
                : 'Using browser speech recognition. For accurate, private transcription run Whisper (see README).'}
            </p>
          </div>
        </Card>

        <InterviewSidebar session={session} answeredCount={answeredCount} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

/** Seconds since the component mounted, updated every second. */
function useElapsedSeconds() {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return elapsed;
}

type TranscriptMessageProps = { turn: Turn; interviewerName: string; onReadAloud: (text: string) => void };

function TranscriptMessage({ turn, interviewerName, onReadAloud }: TranscriptMessageProps) {
  const fromInterviewer = turn.role === 'interviewer';
  return (
    <div className={cx('flex gap-3', !fromInterviewer && 'flex-row-reverse')}>
      <div
        className={cx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          fromInterviewer ? 'bg-violet-100 text-brand' : 'bg-slate-200 text-slate-700',
        )}
      >
        {fromInterviewer ? <AudioLines size={17} /> : <span className="text-xs font-black">YOU</span>}
      </div>
      <div
        className={cx(
          'max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
          fromInterviewer ? 'rounded-tl-sm border border-slate-200 bg-white text-slate-800' : 'rounded-tr-sm bg-brand text-white',
        )}
      >
        <div className={cx('mb-1 text-[10px] font-bold uppercase tracking-wider', fromInterviewer ? 'text-slate-400' : 'text-violet-100')}>
          {fromInterviewer ? interviewerName : 'Your answer'}
        </div>
        <p className="whitespace-pre-wrap">{turn.content}</p>
        {fromInterviewer && (
          <button
            onClick={() => onReadAloud(turn.content)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800"
          >
            <Play size={11} /> Read aloud
          </button>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-brand">
        <AudioLines size={17} />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
        <span className="inline-flex items-center gap-2"><LoaderCircle size={15} className="animate-spin" />{text}</span>
      </div>
    </div>
  );
}

const INTERVIEWER_RULES = [
  'One question at a time',
  'Follow-ups adapt to your answer',
  'No hints during the session',
  'Finish whenever you are ready',
];

function InterviewSidebar({ session, answeredCount }: { session: InterviewSession; answeredCount: number }) {
  const checklist = [
    { label: 'Resume & JD reviewed', done: !!(session.resumeText || session.jobDescription) },
    { label: 'Technical depth', done: answeredCount >= 2 },
    { label: 'Follow-up questions', done: answeredCount >= 4 },
    { label: 'Final assessment', done: false },
  ];

  return (
    <aside className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Session checklist</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {checklist.map((item, i) => (
              <div key={item.label} className="flex items-center gap-2.5 text-sm">
                <div
                  className={cx(
                    'flex h-5 w-5 items-center justify-center rounded-full',
                    item.done ? 'bg-emerald-100 text-emerald-700' : 'border border-slate-200 text-slate-300',
                  )}
                >
                  {item.done ? <Check size={12} /> : <span className="text-[10px]">{i + 1}</span>}
                </div>
                <span className={item.done ? 'text-slate-700' : 'text-slate-400'}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Interviewer rules</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-xs leading-5 text-slate-500">
            {INTERVIEWER_RULES.map(rule => (
              <li key={rule} className="flex gap-2">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={15} /> {rule}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <strong>Tip:</strong> Explain your thinking, mention trade-offs, and use concrete examples from your work.
        It&apos;s okay to ask clarifying questions.
      </div>
    </aside>
  );
}

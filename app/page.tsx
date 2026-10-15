'use client';
import { useCallback, useEffect, useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { HistoryDrawer } from '@/components/HistoryDrawer';
import { InterviewView } from '@/components/interview/InterviewView';
import { ReportView } from '@/components/report/ReportView';
import { SetupView } from '@/components/setup/SetupView';
import { errorMessage, fetchJson, postJson } from '@/lib/utils';
import { createPersona, savePersona } from '@/lib/voices';
import type { InterviewSession, InterviewSetup, RuntimeHealth, SessionSummary } from '@/lib/types';

const DEFAULT_SETUP: InterviewSetup = {
  role: 'Frontend Engineer (SDE-2)',
  company: '',
  mode: 'Full Mock',
  difficulty: 'Medium',
  resumeText: '',
  jobDescription: '',
};

type SessionResponse = { session: InterviewSession };
type AnswerResponse = SessionResponse & { finished: boolean; question?: string };

/**
 * Top-level page. Holds the app state and talks to the API; each screen
 * (setup → interview → report) lives in its own component under components/.
 */
export default function Home() {
  const [health, setHealth] = useState<RuntimeHealth | null>(null);
  const [history, setHistory] = useState<SessionSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [setup, setSetup] = useState<InterviewSetup>(DEFAULT_SETUP);
  const [session, setSession] = useState<InterviewSession | null>(null);

  /** Non-empty while waiting for the model; shown as the loading message. */
  const [busyText, setBusyText] = useState('');
  const busy = busyText !== '';
  const [error, setError] = useState('');

  // --- Data loading -----------------------------------------------------------

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await fetchJson<RuntimeHealth>('/api/health'));
    } catch {
      setHealth({ ok: false, model: 'unknown', message: 'Could not reach local app server.' });
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    try {
      const data = await fetchJson<{ sessions: SessionSummary[] }>('/api/sessions');
      setHistory(data.sessions);
    } catch {
      // History is optional; ignore failures.
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
    void refreshHistory();
  }, [refreshHealth, refreshHistory]);

  // --- Interview actions ------------------------------------------------------

  async function startInterview() {
    setError('');
    setBusyText('Preparing your interview…');
    try {
      // A new random interviewer (name, gender, voice) for every practice session.
      const persona = createPersona();
      const data = await postJson<SessionResponse>(
        '/api/interview/start',
        { ...setup, interviewerName: persona.name },
        'Could not start interview.',
      );
      savePersona(data.session.id, persona);
      setSession(data.session);
      void refreshHistory();
      void refreshHealth(); // picks up Whisper if it was started after the page loaded
    } catch (e) {
      setError(errorMessage(e, 'Could not start interview.'));
    } finally {
      setBusyText('');
    }
  }

  /** Returns false if the answer could not be sent, so the UI can restore it. */
  async function submitAnswer(answer: string): Promise<boolean> {
    if (!session) return false;
    setError('');
    setBusyText('Thinking through your answer…');
    try {
      const data = await postJson<AnswerResponse>(
        '/api/interview/answer',
        { sessionId: session.id, answer },
        'Could not submit answer.',
      );
      setSession(data.session);
      if (data.finished) await finishInterview(data.session.id);
      void refreshHistory();
      return true;
    } catch (e) {
      setError(errorMessage(e, 'Could not submit answer.'));
      return false;
    } finally {
      setBusyText('');
    }
  }

  async function finishInterview(sessionId = session?.id) {
    if (!sessionId) return;
    setError('');
    setBusyText('Building your scorecard…');
    try {
      const data = await postJson<SessionResponse>('/api/interview/finish', { sessionId }, 'Could not generate report.');
      setSession(data.session);
      setShowHistory(false);
      void refreshHistory();
    } catch (e) {
      setError(errorMessage(e, 'Could not generate report.'));
    } finally {
      setBusyText('');
    }
  }

  async function openSession(id: string) {
    try {
      const data = await fetchJson<SessionResponse>(`/api/sessions/${id}`);
      setSession(data.session);
      setShowHistory(false);
      void refreshHealth();
    } catch {
      // Leave the history drawer open if the session can't be loaded.
    }
  }

  function backToSetup() {
    setSession(null);
    setError('');
  }

  // --- Render -----------------------------------------------------------------

  function renderScreen() {
    if (session?.report) {
      return <ReportView session={{ ...session, report: session.report }} onNew={backToSetup} />;
    }

    if (session?.status === 'active') {
      return (
        <InterviewView
          key={session.id}
          session={session}
          busy={busy}
          busyText={busyText}
          error={error}
          whisperReady={!!health?.whisper?.ok}
          onDismissError={() => setError('')}
          onSubmitAnswer={submitAnswer}
          onFinish={() => void finishInterview()}
          onLeave={backToSetup}
        />
      );
    }

    return (
      <SetupView
        setup={setup}
        onChange={patch => setSetup(prev => ({ ...prev, ...patch }))}
        health={health}
        onRecheckHealth={() => void refreshHealth()}
        busy={busy}
        busyText={busyText}
        error={error}
        onError={setError}
        onStart={() => void startInterview()}
      />
    );
  }

  return (
    <main className="min-h-screen pb-12">
      <AppHeader
        health={health}
        onOpenHistory={() => {
          setShowHistory(true);
          void refreshHistory();
        }}
      />

      {showHistory && (
        <HistoryDrawer sessions={history} onSelect={id => void openSession(id)} onClose={() => setShowHistory(false)} />
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 lg:px-8">{renderScreen()}</div>
    </main>
  );
}

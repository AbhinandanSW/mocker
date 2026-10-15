'use client';
import { useState } from 'react';
import {
  Activity, ArrowRight, Check, CircleHelp, FileText, Gauge, Headphones, Laptop,
  LoaderCircle, Mic, Plus, Settings2, ShieldCheck, Sparkles, WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { cx, errorMessage, fetchJson } from '@/lib/utils';
import { DIFFICULTIES, type InterviewMode, type InterviewSetup, type RuntimeHealth } from '@/lib/types';

const MODE_OPTIONS: { name: InterviewMode; description: string; icon: typeof Activity }[] = [
  { name: 'Technical', description: 'Concepts, fundamentals & trade-offs', icon: Settings2 },
  { name: 'DSA & Coding', description: 'Algorithms, complexity & edge cases', icon: Laptop },
  { name: 'System Design', description: 'Architecture, scale & reliability', icon: Activity },
  { name: 'Behavioral', description: 'Ownership, collaboration & STAR', icon: Headphones },
  { name: 'Resume Deep Dive', description: 'Projects, impact & decisions', icon: FileText },
  { name: 'Full Mock', description: 'A mixed, end-to-end interview', icon: Sparkles },
];

const BENEFITS = [
  { title: 'Adaptive questions', desc: 'Follow-ups respond to what you actually say.' },
  { title: 'Real interview flow', desc: 'One question at a time, no answer spoilers.' },
  { title: 'Evidence-based feedback', desc: 'Scores include reasons and concrete improvements.' },
  { title: 'Personalized study plan', desc: 'Leave knowing what to practice next.' },
];

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100';
const textareaClass =
  'w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100';

type Props = {
  setup: InterviewSetup;
  onChange: (patch: Partial<InterviewSetup>) => void;
  health: RuntimeHealth | null;
  onRecheckHealth: () => void;
  busy: boolean;
  busyText: string;
  error: string;
  onError: (message: string) => void;
  onStart: () => void;
};

/** The landing screen: choose role, mode, difficulty and add resume / JD. */
export function SetupView({ setup, onChange, health, onRecheckHealth, busy, busyText, error, onError, onStart }: Props) {
  const ollamaReady = !!(health?.ok && health.installed);
  const hasContext = !!(setup.resumeText.trim() || setup.jobDescription.trim());
  const canStart = !busy && hasContext && !!setup.role.trim();

  return (
    <>
      <Hero />

      {health && !ollamaReady && <OllamaWarning health={health} onRecheck={onRecheckHealth} />}
      <ErrorBanner message={error} onDismiss={() => onError('')} className="mb-5" />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <InterviewDetailsCard setup={setup} onChange={onChange} />
          <ContextCard setup={setup} onChange={onChange} onError={onError} />

          <Button className="w-full py-4 text-base" disabled={!canStart} onClick={onStart}>
            {busy ? (
              <><LoaderCircle className="animate-spin" size={18} />{busyText || 'Preparing…'}</>
            ) : (
              <><Sparkles size={18} /> Start voice interview <ArrowRight size={18} /></>
            )}
          </Button>
          <p className="text-center text-xs text-slate-400">
            Your answers are saved to a local SQLite database on this machine.
          </p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <BenefitsCard />
          <RuntimeCard health={health} ready={ollamaReady} />
        </aside>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------

function Hero() {
  const features = [
    { icon: <ShieldCheck className="mb-3 text-emerald-600" size={20} />, title: 'Local-first', desc: 'No paid AI API' },
    { icon: <Mic className="mb-3 text-violet-600" size={20} />, title: 'Voice mode', desc: 'Speak & listen' },
    { icon: <Gauge className="mb-3 text-blue-600" size={20} />, title: 'Scorecard', desc: 'Actionable feedback' },
  ];

  return (
    <div className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
          <Sparkles size={14} /> YOUR PRIVATE AI INTERVIEW COACH
        </div>
        <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
          Practice like it&apos;s the <span className="text-brand">real interview.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Personalized mock interviews from your resume and target job. Speak your answers, handle follow-ups, then
          get a practical scorecard — powered by your local LLM.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {features.map(f => (
          <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
            {f.icon}
            <div className="text-sm font-bold">{f.title}</div>
            <div className="mt-1 text-[11px] leading-4 text-slate-500">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OllamaWarning({ health, onRecheck }: { health: RuntimeHealth; onRecheck: () => void }) {
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <CircleHelp className="mt-0.5 shrink-0 text-amber-700" size={20} />
        <div>
          <div className="font-bold text-amber-950">Ollama needs attention</div>
          <p className="mt-1 text-sm text-amber-900">
            {health.message} Model selected: <code>{health.model}</code>. Install Ollama and run{' '}
            <code>ollama pull {health.model}</code>.
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRecheck}>Check again</Button>
    </div>
  );
}

type FormCardProps = { setup: InterviewSetup; onChange: (patch: Partial<InterviewSetup>) => void };

function InterviewDetailsCard({ setup, onChange }: FormCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>01 · Set up your interview</CardTitle>
            <p className="mt-1 text-sm text-slate-500">Tell your interviewer what you&apos;re preparing for.</p>
          </div>
          <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">2–3 min setup</span>
        </div>
      </CardHeader>
      <CardContent>
        {/* Role & company */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">Target role *</span>
            <input
              value={setup.role}
              onChange={e => onChange({ role: e.target.value })}
              placeholder="e.g. Frontend Engineer SDE-2"
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">Company (optional)</span>
            <input
              value={setup.company}
              onChange={e => onChange({ company: e.target.value })}
              placeholder="e.g. Figma, Microsoft"
              className={inputClass}
            />
          </label>
        </div>

        {/* Interview mode */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Interview type</span>
            <span className="text-xs text-slate-400">Choose one</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {MODE_OPTIONS.map(({ name, description, icon: Icon }) => {
              const selected = setup.mode === name;
              return (
                <button
                  key={name}
                  onClick={() => onChange({ mode: name })}
                  className={cx(
                    'rounded-xl border p-3 text-left transition',
                    selected ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={selected ? 'text-brand' : 'text-slate-500'} />
                    <span className="text-sm font-bold">{name}</span>
                    {selected && <Check size={14} className="ml-auto text-brand" />}
                  </div>
                  <div className="mt-1.5 text-[11px] leading-4 text-slate-500">{description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Difficulty */}
        <div className="mt-5">
          <span className="mb-2 block text-xs font-bold text-slate-700">Difficulty</span>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map(level => (
              <button
                key={level}
                onClick={() => onChange({ difficulty: level })}
                className={cx(
                  'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                  setup.difficulty === level ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContextCard({ setup, onChange, onError }: FormCardProps & { onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function uploadResume(file?: File) {
    if (!file) return;
    setUploading(true);
    onError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await fetchJson<{ text: string }>('/api/resume', { method: 'POST', body: form }, 'Could not read resume');
      onChange({ resumeText: data.text });
    } catch (e) {
      onError(errorMessage(e, 'Resume upload failed.'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>02 · Add your context</CardTitle>
        <p className="mt-1 text-sm text-slate-500">The interviewer uses these to make questions specific to you.</p>
      </CardHeader>
      <CardContent>
        {/* Resume */}
        <div className="mb-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="resume" className="text-xs font-bold text-slate-700">Resume</label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              {uploading ? <LoaderCircle className="animate-spin" size={13} /> : <Plus size={13} />} Upload PDF or TXT
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                className="hidden"
                disabled={uploading}
                onChange={e => void uploadResume(e.target.files?.[0])}
              />
            </label>
          </div>
          <textarea
            id="resume"
            value={setup.resumeText}
            onChange={e => onChange({ resumeText: e.target.value })}
            placeholder="Paste your resume here, or upload a PDF/TXT…"
            rows={5}
            className={textareaClass}
          />
          <div className="mt-1.5 text-[11px] text-slate-400">
            {setup.resumeText.length.toLocaleString()} characters · Processed by your local app
          </div>
        </div>

        {/* Job description */}
        <div>
          <label htmlFor="jd" className="mb-2 block text-xs font-bold text-slate-700">Job description</label>
          <textarea
            id="jd"
            value={setup.jobDescription}
            onChange={e => onChange({ jobDescription: e.target.value })}
            placeholder="Paste the target job description…"
            rows={5}
            className={textareaClass}
          />
          <div className="mt-1.5 text-[11px] text-slate-400">
            {setup.jobDescription.length.toLocaleString()} characters · At least resume or JD is required
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BenefitsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-violet-100 p-2 text-brand"><WandSparkles size={18} /></div>
          <CardTitle>What you&apos;ll get</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {BENEFITS.map(b => (
            <div className="flex gap-3" key={b.title}>
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Check size={14} />
              </div>
              <div>
                <div className="text-sm font-bold">{b.title}</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RuntimeCard({ health, ready }: { health: RuntimeHealth | null; ready: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Local runtime</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">AI engine</span>
            <span className="font-semibold">Ollama</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Model</span>
            <code className="rounded bg-slate-100 px-2 py-1 text-xs">{health?.model || 'qwen2.5:3b'}</code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Connection</span>
            <span className={cx('text-xs font-bold', ready ? 'text-emerald-600' : 'text-amber-600')}>
              {ready ? 'Connected' : 'Not ready'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Speech-to-text</span>
            <span className={cx('text-xs font-bold', health?.whisper?.ok ? 'text-emerald-600' : 'text-amber-600')}>
              {health?.whisper?.ok ? 'Whisper (local)' : 'Browser only'}
            </span>
          </div>
          <div className="border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
            LLM requests stay on this machine.{' '}
            {health?.whisper?.ok
              ? 'Recorded answers are transcribed locally by Whisper; the live preview uses browser speech recognition, which may use an online service.'
              : 'Browser speech recognition may use an online service. Run Whisper for accurate, local transcription — see the README.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

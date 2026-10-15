import { ArrowRight, Check, CheckCircle2, ChevronDown, Plus, WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clampScore, cx } from '@/lib/utils';
import type { InterviewReport, InterviewSession } from '@/lib/types';

type Props = { session: InterviewSession & { report: InterviewReport }; onNew: () => void };

/** The end-of-interview scorecard. */
export function ReportView({ session, onNew }: Props) {
  const { report } = session;
  const score = clampScore(report.overallScore);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Title */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={14} /> INTERVIEW COMPLETE
          </div>
          <h1 className="text-3xl font-black tracking-tight">Your practice feedback</h1>
          <p className="mt-2 text-sm text-slate-500">
            {session.role} · {session.mode} · {new Date(session.updatedAt).toLocaleString()}
          </p>
        </div>
        <Button onClick={onNew}><Plus size={16} /> New interview</Button>
      </div>

      {/* Overall score + category breakdown */}
      <div className="grid gap-4 md:grid-cols-[.75fr_1.25fr]">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-violet-700 to-indigo-600 p-6 text-white">
            <div className="text-sm font-semibold text-violet-100">Overall score</div>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-6xl font-black tracking-tighter">{score}</span>
              <span className="pb-2 text-lg text-violet-100">/100</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full bg-white" style={{ width: `${score}%` }} />
            </div>
            <p className="mt-4 text-sm leading-6 text-violet-50">{report.recommendation}</p>
          </div>
          <CardContent className="pt-5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Summary</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{report.summary}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill breakdown</CardTitle>
            <p className="mt-1 text-xs text-slate-500">Scores are model-generated estimates, not objective hiring predictions.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {report.categories.map(cat => (
                <div key={cat.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold">{cat.name}</span>
                    <span className="text-sm font-bold tabular-nums">
                      {Math.round(cat.score)}/100 <span className="text-xs font-normal text-slate-400">· {cat.weight}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={cx('h-full rounded-full', cat.score >= 75 ? 'bg-emerald-500' : cat.score >= 50 ? 'bg-amber-500' : 'bg-rose-500')}
                      style={{ width: `${clampScore(cat.score)}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-slate-500">{cat.rationale}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strengths & improvements */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600" /> What went well</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.strengths.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <Check size={15} className="mt-1 shrink-0 text-emerald-600" />{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><WandSparkles size={18} className="text-amber-600" /> Priority improvements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {report.improvements.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <ArrowRight size={15} className="mt-1 shrink-0 text-amber-600" />{item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Per-question feedback */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Question-by-question review</CardTitle>
          <p className="mt-1 text-sm text-slate-500">Use these to learn the concept, not memorize a script.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {report.questionFeedback.map((q, i) => (
              <QuestionFeedback key={`${i}-${q.question}`} index={i} item={q} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Study plan */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowRight size={18} className="text-brand" /> Your next practice plan</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {report.studyPlan.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-brand">{i + 1}</span>
                <span className="pt-1 text-sm leading-6 text-slate-700">{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
            AI-generated evaluations can be mistaken. Verify technical claims against reliable references and use the
            score as a practice signal rather than a definitive measure of interview readiness.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionFeedback({ index, item }: { index: number; item: InterviewReport['questionFeedback'][number] }) {
  const scoreColor = item.score >= 70 ? 'text-emerald-600' : item.score >= 50 ? 'text-amber-600' : 'text-rose-600';

  return (
    <details className="group rounded-xl border border-slate-200">
      <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold leading-6">{item.question}</div>
          <div className="mt-1 text-xs text-slate-500">
            Your score: <strong className={scoreColor}>{Math.round(item.score)}/100</strong>
          </div>
        </div>
        <ChevronDown size={17} className="mt-1 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-slate-100 px-4 py-4 pl-14">
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Your answer</div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.answer || 'No answer captured.'}</p>
        </div>
        <div>
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-600">Feedback</div>
          <p className="text-sm leading-6 text-slate-700">{item.feedback}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="mb-1 text-xs font-bold uppercase tracking-wide text-emerald-700">One strong way to answer</div>
          <p className="whitespace-pre-wrap text-sm leading-6 text-emerald-950">{item.idealAnswer}</p>
        </div>
      </div>
    </details>
  );
}

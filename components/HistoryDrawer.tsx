import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cx } from '@/lib/utils';
import type { SessionSummary } from '@/lib/types';

type Props = {
  sessions: SessionSummary[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

/** Slide-over panel listing past interviews. */
export function HistoryDrawer({ sessions, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose}>
      <aside
        className="ml-auto h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold">Interview history</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
            Your completed and active interviews will appear here.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="w-full rounded-xl border border-slate-200 p-4 text-left hover:border-violet-300 hover:bg-violet-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold">{item.role}</div>
                  <span
                    className={cx(
                      'rounded-full px-2 py-1 text-[10px] font-bold',
                      item.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {item.mode} · {new Date(item.createdAt).toLocaleString()}
                </div>
                {item.report && (
                  <div className="mt-3 text-sm font-semibold text-brand">Score: {item.report.overallScore}/100</div>
                )}
              </button>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

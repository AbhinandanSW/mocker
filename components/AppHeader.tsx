import { AudioLines, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cx } from '@/lib/utils';
import type { RuntimeHealth } from '@/lib/types';

type Props = { health: RuntimeHealth | null; onOpenHistory: () => void };

export function AppHeader({ health, onOpenHistory }: Props) {
  const ready = !!(health?.ok && health.installed);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-white shadow-sm">
            <AudioLines size={21} />
          </div>
          <div>
            <div className="font-extrabold tracking-tight">
              local<span className="text-brand">interviewer</span>
            </div>
            <div className="text-[11px] text-slate-500">Private mock interviews · On your machine</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ollama status pill */}
          <div
            className={cx(
              'hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold sm:flex',
              ready ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700',
            )}
          >
            <span className={cx('h-2 w-2 rounded-full', ready ? 'bg-emerald-500' : 'bg-amber-500')} />
            {ready ? `Ollama · ${health!.model}` : 'Connect Ollama'}
          </div>
          <Button variant="outline" size="sm" onClick={onOpenHistory}>
            <History size={15} /> History
          </Button>
        </div>
      </div>
    </header>
  );
}

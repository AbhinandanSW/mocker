import { CircleHelp, X } from 'lucide-react';

type Props = { message: string; onDismiss: () => void; className?: string };

export function ErrorBanner({ message, onDismiss, className = '' }: Props) {
  if (!message) return null;
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 ${className}`}>
      <CircleHelp size={16} className="mt-0.5 shrink-0" />
      {message}
      <button className="ml-auto" onClick={onDismiss} aria-label="Dismiss error">
        <X size={14} />
      </button>
    </div>
  );
}

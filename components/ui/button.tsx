import * as React from 'react';
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'danger'; size?: 'default' | 'sm' | 'icon' };
export function Button({ className = '', variant = 'default', size = 'default', ...props }: Props) {
  const variants = { default: 'bg-brand text-white hover:bg-violet-700 shadow-sm', outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50', ghost: 'text-slate-600 hover:bg-slate-100', danger: 'bg-red-600 text-white hover:bg-red-700' };
  const sizes = { default: 'px-4 py-2.5 text-sm', sm: 'px-3 py-2 text-xs', icon: 'h-10 w-10' };
  return <button className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}

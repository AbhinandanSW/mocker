import * as React from 'react';
export function Card({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-soft ${className}`} {...props} />; }
export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 pb-3 ${className}`} {...props} />; }
export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) { return <h2 className={`text-base font-bold text-slate-900 ${className}`} {...props} />; }
export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`p-5 pt-2 ${className}`} {...props} />; }

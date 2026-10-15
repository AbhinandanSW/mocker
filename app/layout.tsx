import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Local Interviewer', description: 'Private, local-first AI mock interviews powered by Ollama.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

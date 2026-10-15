import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#101828', muted: '#667085', brand: '#6558f5' }, boxShadow: { soft: '0 8px 30px rgba(16,24,40,.06)' } } }, plugins: [] } satisfies Config;
export default config;

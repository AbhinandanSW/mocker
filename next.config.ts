import type { NextConfig } from 'next';
// NEXT_DIST_DIR lets a second dev server (e.g. for testing) use its own build folder
// instead of sharing .next with the main one.
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'pdf-parse'],
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
export default nextConfig;

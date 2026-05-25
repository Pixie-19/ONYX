import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  // Pin the workspace root so Next stops hunting for stray lockfiles
  // (e.g. a leftover ~/package-lock.json from a global npm install).
  outputFileTracingRoot: path.resolve(__dirname, '..'),
  // Allow `NEXT_BUILD_DIR=.next-build next build` to run while `next dev`
  // is still serving from the default `.next/`. Avoids EPERM on Windows
  // when both processes touch `.next/trace` simultaneously.
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber', '@react-three/drei'],
  },
};

export default nextConfig;

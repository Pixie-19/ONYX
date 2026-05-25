'use client';
import Link from 'next/link';
import { FolderInput } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="h-full grid place-items-center text-onyx-100 p-10">
      <div className="text-center space-y-4">
        <div className="font-display text-[48px] tracking-[0.32em] glow-cyan">404</div>
        <div className="text-[11px] tracking-[0.32em] uppercase text-onyx-300">
          ROUTE NOT IN OPERATIONAL TOPOLOGY
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-cyan-glow/60 text-cyan-glow text-[10px] tracking-[0.22em] uppercase hover:bg-cyan-glow/10 transition mt-4"
        >
          <FolderInput size={11} /> RETURN TO CONNECTOR
        </Link>
      </div>
    </div>
  );
}

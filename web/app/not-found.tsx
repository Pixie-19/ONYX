'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="h-full grid place-items-center p-10 surface-base">
      <div className="text-center max-w-[440px]">
        <div className="text-[64px] font-semibold tracking-tight text-primary leading-none">404</div>
        <div className="text-[14px] text-secondary mt-2">
          Route not in operational topology
        </div>
        <p className="text-[12.5px] text-tertiary mt-3 leading-relaxed">
          The page you're looking for doesn't exist or has been moved. Head back to the overview to
          continue.
        </p>
        <Link href="/" className="btn btn-primary h-9 px-4 mt-5 text-[12.5px]">
          <ArrowLeft size={13} /> Return to overview
        </Link>
      </div>
    </div>
  );
}

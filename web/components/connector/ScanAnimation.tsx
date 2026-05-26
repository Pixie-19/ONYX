'use client';
import { motion } from 'framer-motion';

/**
 * Calm scanning visual — concentric rings and a slow sweeping radial line.
 * Used during workspace ingestion to convey "we're indexing your repo".
 */
export function ScanAnimation({
  size = 120,
  accent = '#4F46E5',
}: {
  size?: number;
  accent?: string;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: accent + '40' }}
          animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 3.2, delay: i * 0.24, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute inset-[18%] rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accent}18, transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 origin-left h-[1.5px]"
        style={{
          width: size / 2 - 4,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: accent, boxShadow: `0 0 0 4px ${accent}22` }}
      />
    </div>
  );
}

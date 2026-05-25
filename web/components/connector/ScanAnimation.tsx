'use client';
import { motion } from 'framer-motion';

/**
 * Cinematic scanning visual — concentric rings + sweeping radial line.
 * Used during workspace ingestion to convey "scanning the repo".
 */
export function ScanAnimation({ size = 220, accent = '#22e8ff' }: { size?: number; accent?: string }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: accent, boxShadow: `0 0 24px ${accent}33` }}
          animate={{ scale: [1, 1.05, 1], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 2.4, delay: i * 0.18, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="absolute inset-[14%] rounded-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${accent}22, transparent 70%)`,
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 origin-left h-[1px]"
        style={{
          width: size / 2,
          background: `linear-gradient(90deg, ${accent}, transparent)`,
          boxShadow: `0 0 8px ${accent}`,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
      />
    </div>
  );
}

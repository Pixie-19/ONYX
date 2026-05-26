'use client';
import { useMemo } from 'react';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  thresholds?: { warn?: number; crit?: number };
  max?: number;
  min?: number;
}

/**
 * Minimal sparkline — soft, premium feel. Default colour is the brand indigo;
 * area gradient is faint so the line stays the focal point.
 */
export function Sparkline({
  values,
  width = 220,
  height = 40,
  stroke = '#4F46E5',
  fill = 'rgba(79,70,229,0.10)',
  thresholds,
  max,
  min,
}: SparklineProps) {
  const { path, area, last } = useMemo(() => {
    if (values.length === 0) return { path: '', area: '', last: 0 };
    const lo = min ?? Math.min(...values);
    const hi = max ?? Math.max(...values);
    const range = hi - lo || 1;
    const step = width / Math.max(1, values.length - 1);
    let p = '';
    let a = '';
    values.forEach((v, i) => {
      const x = i * step;
      const y = height - ((v - lo) / range) * (height - 4) - 2;
      p += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      a += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
    });
    a += `L ${width} ${height} L 0 ${height} Z`;
    return { path: p.trim(), area: a, last: values[values.length - 1] ?? 0 };
  }, [values, width, height, min, max]);

  return (
    <svg width={width} height={height} className="block">
      {thresholds?.warn !== undefined && (
        <line
          x1="0"
          x2={width}
          y1={height - thresholds.warn * height}
          y2={height - thresholds.warn * height}
          stroke="rgba(245,158,11,0.30)"
          strokeDasharray="3 4"
        />
      )}
      {thresholds?.crit !== undefined && (
        <line
          x1="0"
          x2={width}
          y1={height - thresholds.crit * height}
          y2={height - thresholds.crit * height}
          stroke="rgba(239,68,68,0.30)"
          strokeDasharray="3 4"
        />
      )}
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {values.length > 0 && (
        <circle
          cx={width - 1}
          cy={
            height -
            ((last - (min ?? Math.min(...values))) /
              ((max ?? Math.max(...values)) - (min ?? Math.min(...values)) || 1)) *
              (height - 4) -
            2
          }
          r="2.5"
          fill={stroke}
        />
      )}
    </svg>
  );
}

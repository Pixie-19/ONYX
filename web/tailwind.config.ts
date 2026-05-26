import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ──────────────────────────────────────────────────────────────
        // ONYX next-gen palette
        // Calm, premium, infrastructure intelligence.
        // The `onyx` ramp is overloaded to map to a *neutral surface system*
        // that reads beautifully in light mode and elegant in dark mode.
        // All historic classes (onyx-950, onyx-100 etc) still resolve.
        // ──────────────────────────────────────────────────────────────
        onyx: {
          50:  '#FFFFFF',
          100: '#111827', // primary text
          200: '#1F2937',
          300: '#6B7280', // secondary text
          400: '#9CA3AF',
          500: '#D1D5DB',
          600: '#E7EAF0', // border (legacy: was deep slate)
          700: '#F1F3F7',
          800: '#F7F8FA', // subtle surface
          850: '#F9FAFB',
          900: '#FFFFFF',
          950: '#FFFFFF', // base background (legacy: was near-black)
        },
        surface: {
          base:   '#F7F8FA',
          raised: '#FFFFFF',
          sunken: '#F1F3F7',
          inset:  '#FAFBFD',
        },
        line: {
          subtle:  '#EEF0F4',
          DEFAULT: '#E7EAF0',
          strong:  '#D9DEE6',
        },
        ink: {
          900: '#0B0F1A',
          700: '#111827',
          500: '#374151',
          400: '#6B7280',
          300: '#9CA3AF',
          200: '#D1D5DB',
        },
        brand: {
          violet: '#7C3AED',
          indigo: '#4F46E5',
          blue:   '#3B82F6',
        },
        // Re-route legacy accent tokens to the new restrained palette so
        // existing class usage stays valid without screaming neon.
        cyan: {
          glow: '#4F46E5', // legacy alias → brand indigo
        },
        violet: {
          glow: '#7C3AED', // legacy alias → brand violet
        },
        signal: {
          info:     '#4F46E5',
          warn:     '#F59E0B',
          error:    '#EF4444',
          critical: '#DC2626',
          ok:       '#10B981',
        },
      },
      fontFamily: {
        mono:    ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans:    ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        // Soft, layered shadows — Stripe / Linear style
        'cyan-glow':   '0 1px 2px rgba(17,24,39,0.04), 0 4px 12px rgba(79,70,229,0.10)',
        'violet-glow': '0 1px 2px rgba(17,24,39,0.04), 0 4px 12px rgba(124,58,237,0.10)',
        'panel':       '0 1px 2px rgba(17,24,39,0.04), 0 1px 0 rgba(17,24,39,0.02)',
        'panel-lg':    '0 1px 2px rgba(17,24,39,0.04), 0 8px 24px -12px rgba(17,24,39,0.10)',
        'card':        '0 1px 2px rgba(17,24,39,0.04)',
        'focus':       '0 0 0 3px rgba(79,70,229,0.18)',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      animation: {
        'pulse-slow': 'pulseSoft 3.4s ease-in-out infinite',
        'sweep':      'sweep 6s linear infinite',
        'fade-in':    'fadeIn 240ms ease-out',
        'rise':       'rise 280ms ease-out',
      },
      keyframes: {
        pulseSoft: {
          '0%,100%': { opacity: '0.55' },
          '50%':     { opacity: '1' },
        },
        sweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to':   { opacity: '1' },
        },
        rise: {
          'from': { opacity: '0', transform: 'translateY(4px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

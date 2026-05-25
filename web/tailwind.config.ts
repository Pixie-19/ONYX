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
        // ONYX palette — deep graphite + cyan/violet glow accents
        onyx: {
          950: '#040608',
          900: '#070a0e',
          850: '#0a0e14',
          800: '#0d1218',
          700: '#121922',
          600: '#1a2230',
          500: '#22304a',
          400: '#2f3f5f',
          300: '#506583',
        },
        cyan: {
          glow: '#22e8ff',
        },
        violet: {
          glow: '#9b6cff',
        },
        signal: {
          info:     '#22e8ff',
          warn:     '#ffb84a',
          error:    '#ff5d6f',
          critical: '#ff2d6b',
          ok:       '#46f5b8',
        },
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'IBM Plex Mono', 'monospace'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'cyan-glow':   '0 0 18px rgba(34,232,255,0.35), 0 0 4px rgba(34,232,255,0.6)',
        'violet-glow': '0 0 18px rgba(155,108,255,0.35), 0 0 4px rgba(155,108,255,0.6)',
        'panel':       'inset 0 0 0 1px rgba(80,101,131,0.18), 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      animation: {
        'pulse-slow': 'pulseGlow 3.4s ease-in-out infinite',
        'sweep': 'sweep 6s linear infinite',
        'flicker': 'flicker 4s steps(8, end) infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%,100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        sweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        flicker: {
          '0%,30%,32%,100%': { opacity: '1' },
          '31%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

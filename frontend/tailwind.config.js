/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // UX-DR1: Primary background palette
        primary: '#6366f1',
        'primary-hover': '#818cf8',
        'primary-pressed': '#4f46e5',
        'bg-primary': '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-elevated': '#273548',
        // UX-DR2: Semantic status colors
        danger: '#ef4444',
        warning: '#f97316',
        success: '#22c55e',
        neutral: '#475569',
        info: '#38bdf8',
        // Legacy aliases (keep for backward compat)
        'bg-base': '#0f172a',
        'bg-surface': '#1e293b',
        accent: '#6366f1',
        'text-primary': '#e2e8f0',
        'text-secondary': '#94a3b8',
      },
      fontFamily: {
        // UX-DR3: Inter (Latin) / PingFang SC (Chinese) / JetBrains Mono (code/IDs)
        sans: ['Inter', 'PingFang SC', 'Noto Sans SC', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      maxWidth: {
        // UX-DR4: Content area max width 1200px
        content: '1200px',
      },
      backdropBlur: {
        xl: '20px',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'hero': 'clamp(3rem, 8vw, 7.5rem)',
        'h2': 'clamp(2rem, 4vw, 3.5rem)',
        'body': ['1.0625rem', { lineHeight: '1.65' }],
        'label': ['0.75rem', { lineHeight: '1', letterSpacing: '0.05em' }],
      },
      letterSpacing: {
        'display': '-0.035em',
        'tight-display': '-0.045em',
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        'accent-ink': 'var(--accent-ink)',
        'accent-tint': 'var(--accent-tint)',
        destructive: 'var(--destructive)',
        success: 'var(--success)',
      },
      borderRadius: {
        DEFAULT: '2px',
        sm: '1px',
        md: '2px',
        lg: '2px',
      },
      boxShadow: {
        'hard': '6px 6px 0 var(--text)',
        'hard-sm': '3px 3px 0 var(--text)',
        'hard-accent': '6px 6px 0 var(--accent)',
        'hard-accent-sm': '3px 3px 0 var(--accent)',
      },
      gridTemplateColumns: {
        'editorial': 'repeat(12, 1fr)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

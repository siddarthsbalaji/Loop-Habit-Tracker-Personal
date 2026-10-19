/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Semantic tokens backed by CSS variables (see src/index.css) so a single
        // class set works for both light and dark themes.
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      spacing: {
        'safe-t': 'env(safe-area-inset-top)',
        'safe-b': 'env(safe-area-inset-bottom)',
        'safe-l': 'env(safe-area-inset-left)',
        'safe-r': 'env(safe-area-inset-right)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgb(255 255 255 / 0.04) inset, 0 8px 24px -12px rgb(0 0 0 / 0.45)',
        sheet: '0 -20px 60px -20px rgb(0 0 0 / 0.6)',
        glow: '0 0 0 1px rgb(var(--c-accent) / 0.35), 0 10px 30px -10px rgb(var(--c-accent) / 0.6)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(0.82)' },
          '70%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        'rise': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'slide-up': 'slide-up 320ms cubic-bezier(0.32, 0.72, 0, 1) both',
        'slide-in-right': 'slide-in-right 340ms cubic-bezier(0.32, 0.72, 0, 1) both',
        pop: 'pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        rise: 'rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'toast-in': 'toast-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

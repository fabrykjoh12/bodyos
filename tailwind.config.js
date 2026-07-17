/** @type {import('tailwindcss').Config} */
// BodyOS design system — ported from the user's mockup (Dashboard Phone.dc.html).
// Volt lime is the sole accent; ice blue means "reference / last-time" data only.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black surface stack
        base: '#0E1013',
        surface: {
          DEFAULT: '#1B1F24', // card
          2: '#21262C', // input / raised inset
          3: '#2A3037', // hover / active fill
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.16)',
        },
        content: {
          DEFAULT: '#F4F6F8', // primary text
          muted: '#A7AFB9', // secondary
          faint: '#656E79', // muted
        },
        // Volt — the one brand accent
        accent: {
          DEFAULT: '#CDFB45',
          soft: 'rgba(205,251,69,0.14)',
          strong: '#B4E82A',
        },
        ink: '#0A0C05', // near-black text on volt fills
        // Ice — reference / "last time" data ONLY
        ice: {
          DEFAULT: '#5FA8FF',
          soft: 'rgba(95,168,255,0.14)',
        },
        // Semantic
        success: { DEFAULT: '#4ADE80', soft: 'rgba(74,222,128,0.14)' },
        caution: { DEFAULT: '#FBBF24', soft: 'rgba(251,191,36,0.14)' },
        danger: { DEFAULT: '#FB5A5A', soft: 'rgba(251,90,90,0.14)' },
      },
      fontFamily: {
        sans: ['Archivo Variable', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Geist Mono Variable', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.02', letterSpacing: '-0.03em', fontWeight: '800' }],
        stat: ['1.7rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '0.875rem', // 14px inputs/chips
        '2xl': '1.125rem', // 18px cards
        '3xl': '1.5rem', // 24px sheets
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.35)',
        lift: '0 8px 24px rgba(0,0,0,0.45)',
        sheet: '0 -12px 40px rgba(0,0,0,0.55)',
        'accent-glow': '0 0 0 1px #B4E82A, 0 6px 20px rgba(205,251,69,0.35)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.94)', opacity: '0' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'flash-success': {
          '0%': { boxShadow: '0 0 0 0 rgba(205,251,69,0.5)' },
          '100%': { boxShadow: '0 0 0 14px rgba(205,251,69,0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'grow-bar': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        'page-in': {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.22,1,0.36,1)',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.22,1,0.36,1)',
        'flash-success': 'flash-success 0.6s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'grow-bar': 'grow-bar 0.32s cubic-bezier(0.22,1,0.36,1)',
        'page-in': 'page-in 0.24s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
};

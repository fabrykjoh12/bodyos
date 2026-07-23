/** @type {import('tailwindcss').Config} */
// BodyOS design system — "precision instrument" language.
// One accent (volt) for action + achievement; ice strictly means "reference /
// last-time" data. Deep graphite surfaces lit from above; typography carries
// the hierarchy, motion carries the reward.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Graphite surface stack — deep but never pure black.
        base: '#0B0D11',
        surface: {
          DEFAULT: '#171B21', // card
          2: '#1E232B', // input / raised inset
          3: '#28303A', // hover / active fill
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.06)',
          strong: 'rgba(255,255,255,0.13)',
        },
        content: {
          DEFAULT: '#F5F7F9', // primary text
          muted: '#9AA3AF', // secondary
          faint: '#5E6773', // tertiary / labels
        },
        // Volt — the one brand accent
        accent: {
          DEFAULT: '#CDFB45',
          soft: 'rgba(205,251,69,0.10)',
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
        // Typography does the heavy lifting: a real display scale.
        'display-xl': [
          '3.4rem',
          { lineHeight: '0.98', letterSpacing: '-0.04em', fontWeight: '750' },
        ],
        display: ['2.6rem', { lineHeight: '1.0', letterSpacing: '-0.035em', fontWeight: '740' }],
        title: ['1.9rem', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '720' }],
        heading: ['1.35rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        stat: ['1.7rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '0.875rem', // 14px inputs/chips
        '2xl': '1.25rem', // 20px cards
        '3xl': '1.625rem', // 26px hero cards
        '4xl': '2rem', // 32px sheets
      },
      boxShadow: {
        // Physical cards: a whisper of top light + soft ambient depth.
        card: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 1px 2px rgba(0,0,0,0.3), 0 12px 28px -18px rgba(0,0,0,0.7)',
        lift: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 48px -20px rgba(0,0,0,0.75)',
        sheet: '0 -16px 56px rgba(0,0,0,0.6)',
        float: '0 8px 32px -8px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.4)',
        'accent-glow': '0 0 0 1px rgba(205,251,69,0.5), 0 8px 28px -6px rgba(205,251,69,0.35)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'spring-soft': 'cubic-bezier(0.32, 0.72, 0, 1)',
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
        rise: {
          '0%': { transform: 'translateY(18px)', opacity: '0' },
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
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 1px rgba(205,251,69,0.45), 0 6px 24px -4px rgba(205,251,69,0.28)',
          },
          '50%': {
            boxShadow: '0 0 0 1px rgba(205,251,69,0.6), 0 10px 36px -4px rgba(205,251,69,0.45)',
          },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(240%)' },
        },
        'ping-once': {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.4)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.32s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 0.34s cubic-bezier(0.22,1,0.36,1)',
        rise: 'rise 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'sheet-up': 'sheet-up 0.38s cubic-bezier(0.32,0.72,0,1)',
        'flash-success': 'flash-success 0.6s ease-out',
        'fade-in': 'fade-in 0.22s ease-out',
        'grow-bar': 'grow-bar 0.5s cubic-bezier(0.22,1,0.36,1)',
        'page-in': 'page-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        'glow-pulse': 'glow-pulse 2.4s ease-in-out infinite',
        shimmer: 'shimmer 1.8s ease-in-out 0.4s',
        'ping-once': 'ping-once 0.7s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Layered dark surfaces
        base: '#0A0B0D',
        surface: {
          DEFAULT: '#131519',
          2: '#1B1E24',
          3: '#23272E',
        },
        line: {
          DEFAULT: '#262B33',
          strong: '#333944',
        },
        content: {
          DEFAULT: '#F3F5F7', // off-white primary
          muted: '#9BA1AC', // muted gray secondary
          faint: '#666C77', // tertiary
        },
        // One restrained electric-blue accent
        accent: {
          DEFAULT: '#4C8DFF',
          soft: 'rgba(76, 141, 255, 0.14)',
          strong: '#2E6BFF',
        },
        // Semantic
        success: { DEFAULT: '#34D399', soft: 'rgba(52, 211, 153, 0.14)' },
        caution: { DEFAULT: '#F5A524', soft: 'rgba(245, 165, 36, 0.14)' },
        danger: { DEFAULT: '#F0526B', soft: 'rgba(240, 82, 107, 0.14)' },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        // Big numeric display for workout values
        display: ['3.75rem', { lineHeight: '1', letterSpacing: '-0.03em', fontWeight: '700' }],
        stat: ['2.25rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
        lift: '0 12px 40px -12px rgba(0,0,0,0.7)',
        'accent-glow': '0 8px 30px -8px rgba(76,141,255,0.45)',
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
          '0%': { boxShadow: '0 0 0 0 rgba(52,211,153,0.5)' },
          '100%': { boxShadow: '0 0 0 14px rgba(52,211,153,0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.28s cubic-bezier(0.22,1,0.36,1)',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.22,1,0.36,1)',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.22,1,0.36,1)',
        'flash-success': 'flash-success 0.6s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

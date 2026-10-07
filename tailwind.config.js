/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#70020F',
          50: '#FDF2F3',
          100: '#F9E4E6',
          200: '#F2C8CC',
          300: '#E69DA4',
          400: '#D56E79',
          500: '#B83B49',
          600: '#8F1828',
          700: '#70020F',
          800: '#57010B',
          900: '#3A0007',
        },
        canvas: '#F7F8FA',
        surface: {
          DEFAULT: '#FFFFFF',
          secondary: '#F2F4F7',
        },
        line: {
          DEFAULT: '#E4E7EC',
          strong: '#D0D5DD',
          control: '#7A8699',
        },
        ink: {
          DEFAULT: '#101828',
          secondary: '#475467',
          muted: '#667085',
        },
        success: '#15803D',
        'success-bg': '#F0FDF4',
        warning: '#B7791F',
        'warning-ink': '#92400E',
        'warning-bg': '#FFFBEB',
        danger: '#C53030',
        'danger-bg': '#FEF2F2',
        info: '#2563EB',
        'info-bg': '#EFF6FF',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        pill: '999px',
      },
      boxShadow: {
        raised: '0 2px 8px rgba(16, 24, 40, 0.06)',
        elevated: '0 8px 24px rgba(16, 24, 40, 0.08)',
        soft: '4px 4px 12px rgba(16, 24, 40, 0.08), -4px -4px 12px rgba(255, 255, 255, 0.9)',
      },
      transitionDuration: {
        quick: '180ms',
        panel: '300ms',
      },
    },
  },
  plugins: [],
};
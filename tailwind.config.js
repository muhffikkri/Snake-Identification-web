/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryBg: '#F5F5F5',
        charcoal: '#1E1E1E',
        panic: '#70020F',
        tealAccent: '#2E7D6F',
        tealLight: '#5A9A8F',
        amberBadge: '#F57C00',
        greenBadge: '#388E3C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}

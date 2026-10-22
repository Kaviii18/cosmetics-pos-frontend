/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
        blush: {
          50: '#fffdfa',
          100: '#fdf2f8',
          200: '#fbcfe8',
          300: '#f472b6',
          400: '#e879f9',
        },
        cream: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(244, 63, 94, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 30px -5px rgba(244, 63, 94, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
        'inner-light': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.6)'
      }
    },
  },
  plugins: [],
}

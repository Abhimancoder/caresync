/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a', // Core Navy
          950: '#172554',
        },
        teal: {
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        },
        surface: {
          DEFAULT: '#ffffff',
          soft: '#f0f7ff',
          muted: '#f8fafc',
          border: '#e2e8f0',
        },
        elderly: {
          bg: '#fcfdff',
          card: '#ffffff',
          text: '#0f172a',
          accent: '#0284c7',
        }
      },
      fontSize: {
        'accessible-sm': '1.05rem',
        'accessible-base': '1.2rem',
        'accessible-lg': '1.35rem',
        'accessible-xl': '1.6rem',
        'accessible-2xl': '2rem',
        'accessible-3xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'accessible': '0 0 0 3px rgba(37, 99, 235, 0.5)',
      }
    },
  },
  plugins: [],
};

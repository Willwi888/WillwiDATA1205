/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: {
          dark: '#0f172a',
          darker: '#020617',
          accent: '#38bdf8',
          gold: '#fbbf24',
          surface: '#1e293b'
        }
      }
    },
  },
  plugins: [],
}

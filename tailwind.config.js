/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7B5EA7',
          light: '#E8DFF5',
          dark: '#4A3570',
        },
      },
      fontFamily: {
        sans: ['Sarabun', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF4FB',
          100: '#D5E5F5',
          200: '#AECBEB',
          300: '#7EAADE',
          400: '#4E89D1',
          500: '#2B6CB0',
          600: '#1B4F8A',
          700: '#163F6E',
          800: '#112F52',
          900: '#0C2036',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(27,79,138,0.12)',
        'card-hover': '0 8px 32px rgba(27,79,138,0.20)',
      },
    },
  },
  plugins: [],
}

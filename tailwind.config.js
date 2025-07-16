/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-main': 'radial-gradient(ellipse at top, hsla(26, 83%, 53%, 0.15), transparent 60%)',
      }
    },
  },
  plugins: [],
}

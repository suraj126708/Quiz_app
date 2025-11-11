/** @type {import('tailwindcss').Config} */
export default {
  // CRITICAL: Point to all files that contain Tailwind classes
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
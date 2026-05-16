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
				dark: '#181a1c',
				darklight: "#3b4246",
				blackish: "#0b0d0e",
      },
    },
  },
  plugins: [],
}

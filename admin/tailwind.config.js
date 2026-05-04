/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#893EF5", light: "#a66af7", dark: "#6b2dc4" },
        surface: { DEFAULT: "#0f0f14", card: "#16161e", hover: "#1e1e2a" },
        border: "#2a2a3a",
      },
    },
  },
  plugins: [],
};

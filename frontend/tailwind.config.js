/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stitch: {
          primary: "#3525cd",
          "primary-container": "#4f46e5",
          "on-primary": "#ffffff",
          secondary: "#0058be",
          background: "#f9f9ff",
          surface: "#f9f9ff",
          "surface-container": "#e7eefe",
          "surface-container-high": "#e2e8f8",
          "surface-container-highest": "#dce2f3",
          "surface-container-low": "#f0f3ff",
          "surface-container-lowest": "#ffffff",
          "on-surface": "#151c27",
          "on-surface-variant": "#464555",
          outline: "#777587",
          "outline-variant": "#c7c4d8",
          error: "#ba1a1a",
        }
      },
      fontFamily: {
        sans: ["var(--font-geist)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      borderRadius: {
        stitch: "8px",
      }
    },
  },
  plugins: [],
}

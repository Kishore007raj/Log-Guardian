/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#050505',
          panel: '#0A0A0A',
          border: '#333333',
          text: '#E0E0E0',
          muted: '#808080',
          accent: '#00F0FF',
          danger: '#FF003C',
          warning: '#FFB800',
          success: '#00FF66'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}

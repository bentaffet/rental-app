import daisyui from "daisyui";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#19231F",
        moss: "#596B4E",
        clay: "#B85C38",
        skyglass: "#D9EEF2",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        leaselens: {
          primary: "#596B4E",
          secondary: "#B85C38",
          accent: "#2F7D8C",
          neutral: "#25302B",
          "base-100": "#FCFBF7",
          "base-200": "#F2F0EA",
          "base-300": "#E4DFD4",
          info: "#2F7D8C",
          success: "#3F7C5F",
          warning: "#C8802E",
          error: "#B23A48",
        },
      },
    ],
  },
};

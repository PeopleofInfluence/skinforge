import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#0f1117",
          panel: "#161b22",
          border: "#21262d",
          accent: "#7c3aed",
          "accent-hover": "#6d28d9",
          text: "#e6edf3",
          "text-muted": "#8b949e",
          success: "#3fb950",
          warning: "#d29922",
          danger: "#f85149",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

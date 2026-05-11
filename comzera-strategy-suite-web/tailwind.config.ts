import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-main)",
        card: "var(--bg-card)",
        sidebar: "var(--bg-sidebar)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
        },
        secondary: "var(--secondary)",
        main: "var(--text-main)",
        muted: "var(--text-muted)",
        "accent-red": "var(--accent-red)",
        "accent-green": "var(--accent-green)",
        "accent-orange": "var(--accent-orange)",
        border: "var(--border)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      boxShadow: {
        glow: "var(--glow)",
      },
    },
  },
  plugins: [],
};
export default config;

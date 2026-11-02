import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "64px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
        "glass-inset": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)",
        "glass-light": "0 8px 32px 0 rgba(31, 38, 135, 0.08)",
        "glass-light-inset": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.8)",
        "siri-glow": "0 0 25px rgba(168, 85, 247, 0.4), 0 0 50px rgba(59, 130, 246, 0.3)",
        "ios-toggle-active": "0 0 16px rgba(16, 185, 129, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
      },
      animation: {
        "float-slow": "floatSlow 14s ease-in-out infinite alternate",
        "float-reverse": "floatReverse 18s ease-in-out infinite alternate",
        "breathe": "appleBreathe 3s ease-in-out infinite",
        "siri-shimmer": "siriShimmer 3s ease infinite",
      },
      keyframes: {
        floatSlow: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(40px, -30px) scale(1.08)" },
          "100%": { transform: "translate(-30px, 20px) scale(0.95)" },
        },
        floatReverse: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "50%": { transform: "translate(-50px, 40px) scale(1.1)" },
          "100%": { transform: "translate(30px, -20px) scale(0.92)" },
        },
        appleBreathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1.08)" },
        },
        siriShimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAFA",
        paper: "#F3F2EF",
        ink: {
          DEFAULT: "#1A1A1A",
          2: "#55514B",
          3: "#8A867F",
        },
        blue: {
          DEFAULT: "#0047FF",
          ink: "#0036C4",
          bright: "#2E6BFF",
          sky: "#5B9BFF",
          mist: "#E8EEFF",
        },
        line: {
          DEFAULT: "#E6E4DF",
          2: "#D9D6CF",
        },
        critical: "#E63946",
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "Times New Roman", "serif"],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      spacing: {
        "4.5": "1.125rem",
        "5.5": "1.375rem",
      },
      maxWidth: {
        wrap: "1180px",
        wide: "1320px",
      },
      borderRadius: {
        "4xl": "32px",
        "5xl": "44px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        lift: "0 24px 60px -24px rgba(0,71,255,0.28)",
        glow: "0 0 0 1px rgba(0,71,255,0.12), 0 18px 50px -18px rgba(0,71,255,0.45)",
        card: "0 2px 4px rgba(16,24,40,0.04), 0 20px 48px -24px rgba(16,24,40,0.18)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(.22,.61,.36,1)",
        spring: "cubic-bezier(.34,1.56,.64,1)",
      },
      keyframes: {
        "float-y": {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(0,71,255,0.45)" },
          "70%": { boxShadow: "0 0 0 16px rgba(0,71,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0,71,255,0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "float-y": "float-y 6s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [],
};

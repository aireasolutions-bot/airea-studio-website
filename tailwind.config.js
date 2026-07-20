/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // All brand colors resolve through CSS variables (RGB triplets set in
      // src/index.css and overridden at runtime by the admin's Design page) —
      // <alpha-value> keeps every /opacity utility working.
      colors: {
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--c-ink) / <alpha-value>)",
          2: "rgb(var(--c-ink-2) / <alpha-value>)",
          3: "rgb(var(--c-ink-3) / <alpha-value>)",
        },
        blue: {
          DEFAULT: "rgb(var(--c-blue) / <alpha-value>)",
          ink: "rgb(var(--c-blue-ink) / <alpha-value>)",
          bright: "rgb(var(--c-blue-bright) / <alpha-value>)",
          sky: "rgb(var(--c-blue-sky) / <alpha-value>)",
          mist: "rgb(var(--c-blue-mist) / <alpha-value>)",
        },
        line: {
          DEFAULT: "rgb(var(--c-line) / <alpha-value>)",
          2: "rgb(var(--c-line-2) / <alpha-value>)",
        },
        critical: "#E63946",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Times New Roman", "serif"],
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
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
        lift: "0 24px 60px -24px rgb(var(--c-blue) / 0.28)",
        glow: "0 0 0 1px rgb(var(--c-blue) / 0.12), 0 18px 50px -18px rgb(var(--c-blue) / 0.45)",
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
          "0%": { boxShadow: "0 0 0 0 rgb(var(--c-blue) / 0.45)" },
          "70%": { boxShadow: "0 0 0 16px rgb(var(--c-blue) / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(var(--c-blue) / 0)" },
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

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Stripe-style light palette. `forge.*` names are kept (many
        // components reference them) but remapped to light surfaces.
        forge: {
          bg: "#f6f9fc", // page background
          panel: "#ffffff", // card surface
          line: "#e3e8ee", // hairline border
          accent: "#635bff", // blurple
        },
        ink: "#0a2540", // headings
        body: "#425466", // body text
        muted: "#8792a2", // secondary/labels
        brand: {
          DEFAULT: "#635bff",
          hover: "#5851e6",
          soft: "#efeffe",
        },
        good: "#1ea672",
        warn: "#b45309",
        bad: "#df1b41",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,37,64,0.06), 0 1px 3px rgba(10,37,64,0.04)",
        pop: "0 4px 12px rgba(10,37,64,0.10)",
      },
      borderRadius: {
        xl: "0.75rem",
      },
    },
  },
  plugins: [],
};

export default config;

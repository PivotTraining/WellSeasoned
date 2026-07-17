import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "#09090b",
          panel: "#18181b",
          line: "#27272a",
          accent: "#f97316",
        },
      },
    },
  },
  plugins: [],
};

export default config;

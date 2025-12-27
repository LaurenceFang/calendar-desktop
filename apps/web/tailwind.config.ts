import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 12px 30px rgba(15, 23, 42, 0.08)",
        soft: "0 6px 16px rgba(15, 23, 42, 0.08)"
      },
      colors: {
        panel: "#f6f7fb",
        border: "#e6e8f0"
      }
    }
  },
  plugins: []
} satisfies Config;

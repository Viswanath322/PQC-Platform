import type { Config } from "tailwindcss";
const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"Geist Mono Variable"', "ui-monospace", "monospace"],
      },
      colors: {
        background: c("background"), foreground: c("foreground"), border: c("border"),
        surface: { DEFAULT: c("surface"), 2: c("surface-2") },
        muted: { foreground: c("muted-foreground") },
        primary: { DEFAULT: c("primary"), foreground: c("primary-foreground") },
        critical: c("critical"), high: c("high"), medium: c("medium"), low: c("low"), success: c("success"),
      },
      borderRadius: { xl: "var(--radius)" },
      backdropBlur: { xs: "2px" },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

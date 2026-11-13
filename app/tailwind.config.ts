import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

// Farben kommen aus src/theme/tokens.css (HSL-Tripel → Transparenz per Tailwind möglich).
const hslVar = (v: string) => `hsl(var(${v}) / <alpha-value>)`;
const toneFamily = (name: string, shades: string[]) =>
  Object.fromEntries(shades.map((s) => [s, `var(--tone-${name}-${s})`]));
const std = ["main", "dark", "medium", "light", "contrast"];

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        head: ["AppHead", "system-ui", "sans-serif"],
        text: ["AppText", "system-ui", "sans-serif"],
        sans: ["AppText", "system-ui", "sans-serif"],
        mono: ["AppMono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "heading-900": ["96px", { lineHeight: "106px", fontWeight: "500" }],
        "heading-800": ["88px", { lineHeight: "96px", fontWeight: "500" }],
        "heading-700": ["72px", { lineHeight: "88px", fontWeight: "500" }],
        "heading-600": ["64px", { lineHeight: "72px", fontWeight: "500" }],
        "heading-500": ["56px", { lineHeight: "64px", fontWeight: "400" }],
        "heading-400": ["48px", { lineHeight: "56px", fontWeight: "500" }],
        "heading-300": ["40px", { lineHeight: "48px", fontWeight: "500" }],
        "heading-200": ["36px", { lineHeight: "40px", fontWeight: "500" }],
        "heading-100": ["28px", { lineHeight: "32px", fontWeight: "500" }],
        "body-500": ["24px", { lineHeight: "36px" }],
        "body-400": ["20px", { lineHeight: "32px" }],
        "body-300": ["16px", { lineHeight: "24px" }],
        "body-200": ["14px", { lineHeight: "20px" }],
        "body-100": ["12px", { lineHeight: "20px" }],
      },
      colors: {
        ink: hslVar("--ink"),
        brand: hslVar("--brand"),
        canvas: hslVar("--canvas"),
        sand: hslVar("--sand"),
        slate: hslVar("--slate"),
        highlight: hslVar("--highlight"),
        border: hslVar("--border"),
        input: hslVar("--input"),
        ring: hslVar("--ring"),
        background: hslVar("--background"),
        foreground: hslVar("--foreground"),
        primary: { DEFAULT: hslVar("--primary"), foreground: hslVar("--primary-foreground") },
        secondary: { DEFAULT: hslVar("--secondary"), foreground: hslVar("--secondary-foreground") },
        accent: { DEFAULT: hslVar("--accent"), foreground: hslVar("--accent-foreground") },
        muted: { DEFAULT: hslVar("--muted"), foreground: hslVar("--muted-foreground") },
        destructive: { DEFAULT: hslVar("--destructive"), foreground: hslVar("--destructive-foreground") },
        card: { DEFAULT: hslVar("--card"), foreground: hslVar("--card-foreground") },
        popover: { DEFAULT: hslVar("--popover"), foreground: hslVar("--popover-foreground") },
        tone: {
          primary: toneFamily("primary", [...std, "neutral"]),
          secondary: toneFamily("secondary", std),
          tertiary: toneFamily("tertiary", [...std, "strong", "warm", "neutral"]),
          success: toneFamily("success", std),
          warning: toneFamily("warning", std),
          info: toneFamily("info", std),
          error: toneFamily("error", std),
          skyBlue: toneFamily("skyBlue", std),
          red: toneFamily("red", std),
          blue: toneFamily("blue", std),
          violet: toneFamily("violet", std),
          yellow: toneFamily("yellow", std),
          grey: toneFamily("grey", [...std, "strong", "warm", "neutral"]),
          white: "var(--tone-white)",
          black: "var(--tone-black)",
        },
      },
      borderRadius: { sm: "2px", DEFAULT: "var(--radius)" },
      boxShadow: { overlay: "var(--overlay-shadow)" },
    },
  },
  plugins: [animate, typography],
} satisfies Config;

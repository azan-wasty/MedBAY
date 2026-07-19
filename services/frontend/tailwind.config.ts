import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1200px",
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        // MedBAY brand system — clinical teal (primary action / trust) +
        // clinical azure (structure / secondary) + deep navy ink (dark
        // surfaces + headline color). Named scales so every shade is
        // reachable via utilities (bg-brand-600, text-azure-700, ...).
        brand: {
          50: "#EFFBF9",
          100: "#D7F3EE",
          200: "#AFE7DD",
          300: "#7DD5C7",
          400: "#47B8A9",
          500: "#279586",
          600: "#0F7A6C",
          700: "#0B6257",
          800: "#0A4E46",
          900: "#08403A",
          950: "#04241F",
        },
        azure: {
          50: "#EEF5FC",
          100: "#D9E9F8",
          200: "#B3D3F1",
          300: "#82B6E6",
          400: "#4C93D6",
          500: "#2C74BE",
          600: "#1D5FA6",
          700: "#164B84",
          800: "#133D6B",
          900: "#12335A",
          950: "#0B203B",
        },
        ink: {
          50: "#F4F6F9",
          100: "#E7EBF1",
          200: "#CBD4E0",
          300: "#9FADC2",
          400: "#6D7F9C",
          500: "#4C5F7C",
          600: "#374A64",
          700: "#283A52",
          800: "#1A2740",
          900: "#0A1628",
          950: "#060D18",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 6px)",
        "2xl": "calc(var(--radius) + 14px)",
      },
      boxShadow: {
        "soft-xs": "0 1px 2px 0 rgb(10 22 40 / 0.04)",
        "soft-sm": "0 2px 8px -2px rgb(10 22 40 / 0.06), 0 1px 2px -1px rgb(10 22 40 / 0.04)",
        soft: "0 8px 24px -8px rgb(10 22 40 / 0.10), 0 2px 6px -2px rgb(10 22 40 / 0.05)",
        "soft-lg": "0 20px 48px -12px rgb(10 22 40 / 0.16), 0 4px 12px -4px rgb(10 22 40 / 0.06)",
        "soft-xl": "0 30px 70px -20px rgb(10 22 40 / 0.22), 0 8px 20px -8px rgb(10 22 40 / 0.08)",
        "brand-glow": "0 12px 32px -8px rgb(15 122 108 / 0.35)",
        "inner-line": "inset 0 0 0 1px rgb(10 22 40 / 0.06)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgb(10 22 40 / 0.045) 1px, transparent 1px), linear-gradient(to bottom, rgb(10 22 40 / 0.045) 1px, transparent 1px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-drift": {
          "0%, 100%": { transform: "translate(0%, 0%) scale(1)" },
          "50%": { transform: "translate(-4%, 3%) scale(1.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(var(--tilt, 0deg))" },
          "50%": { transform: "translateY(-10px) rotate(var(--tilt, 0deg))" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.25s ease-out",
        "accordion-up": "accordion-up 0.25s ease-out",
        "gradient-drift": "gradient-drift 18s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite linear",
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

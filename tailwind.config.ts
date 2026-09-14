import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Lotus-pond palette, taken directly from brand tokens.
        pond: {
          DEFAULT: "#0A3323", // Dark green — ink, headers, deep surfaces
          50: "#E7EFE9",
          100: "#C7DACB",
          200: "#95B69C",
          300: "#5F8D6C",
          400: "#2F5F42",
          500: "#0A3323",
          600: "#082A1D",
          700: "#062017",
          800: "#041610",
          900: "#020C08",
        },
        moss: {
          DEFAULT: "#839958",
          50: "#F1F4E9",
          100: "#E1E8CD",
          200: "#C4D19E",
          300: "#A7BB70",
          400: "#93AA5F",
          500: "#839958",
          600: "#687A44",
          700: "#4F5C34",
          800: "#363E23",
          900: "#1D2113",
        },
        clarity: {
          DEFAULT: "#F7F4D5", // Beige — paper, light surfaces
          50: "#FFFFFF",
          100: "#FDFCF3",
          200: "#F7F4D5",
          300: "#EFE9B3",
          400: "#E4DB88",
          500: "#D8CC5C",
        },
        rosy: {
          DEFAULT: "#D3968C",
          50: "#FAEEEC",
          100: "#F3DAD5",
          200: "#E7B6AC",
          300: "#D3968C",
          400: "#C17667",
          500: "#A85647",
          600: "#833F33",
        },
        midnight: {
          DEFAULT: "#105666",
          50: "#E5EEF0",
          100: "#BFD8DD",
          200: "#83B2BC",
          300: "#4C8B99",
          400: "#276E7F",
          500: "#105666",
          600: "#0C4250",
          700: "#082E39",
          800: "#051B21",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "ripple-radial":
          "radial-gradient(circle at center, transparent 0%, transparent 40%, currentColor 41%, currentColor 42%, transparent 43%)",
      },
      keyframes: {
        ripple: {
          "0%": { transform: "scale(0.3)", opacity: "0.6" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        drift: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-10px) translateX(6px)" },
        },
        settle: {
          "0%": { transform: "translateY(-6px) scale(1.02)", filter: "blur(2px)" },
          "100%": { transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        ripple: "ripple 2.4s cubic-bezier(0.2, 0.6, 0.35, 1) infinite",
        "fade-up": "fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 1s ease both",
        drift: "drift 6s ease-in-out infinite",
        settle: "settle 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 2.5s linear infinite",
      },
      boxShadow: {
        pond: "0 20px 60px -15px rgba(10, 51, 35, 0.35)",
        soft: "0 8px 30px -8px rgba(10, 51, 35, 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
export default config;

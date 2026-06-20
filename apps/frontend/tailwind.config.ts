import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: "#1a4731",
          light: "#235c3e",
          dark: "#133624",
        },
        chip: {
          gold: "#f0c040",
          silver: "#c0c0c0",
          red: "#c0392b",
        },
        card: {
          bg: "#fdf6e3",
          border: "#d4c5a9",
        },
      },
      fontFamily: {
        poker: ["Georgia", "serif"],
      },
      animation: {
        "card-deal": "cardDeal 0.3s ease-out",
        "chip-in": "chipIn 0.4s ease-out",
        "winner-glow": "winnerGlow 1s ease-in-out infinite alternate",
        "card-flip": "cardFlip 0.5s ease-in-out",
      },
      keyframes: {
        cardDeal: {
          "0%": { transform: "scale(0) rotate(-10deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        chipIn: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        winnerGlow: {
          "0%": { boxShadow: "0 0 10px #f0c040" },
          "100%": { boxShadow: "0 0 30px #f0c040, 0 0 60px #f0c04066" },
        },
        cardFlip: {
          "0%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

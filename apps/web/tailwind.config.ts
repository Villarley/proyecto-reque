import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orbit: {
          void: "#050507",
          surface: "#0D0D14",
          raised: "#13131E",
          border: "#1F1F30",
          "border-accent": "rgba(124,58,237,0.4)",
          violet: "#7C3AED",
          "violet-light": "#8B5CF6",
          indigo: "#4F46E5",
          gold: "#F59E0B",
          "gold-light": "#FCD34D",
          stellar: "#1DB8C6",
          text: "#F4F4FF",
          "text-2": "rgba(244,244,255,0.65)",
          "text-3": "rgba(244,244,255,0.35)",
          success: "#10B981",
          error: "#EF4444",
        },
      },
      backgroundImage: {
        "orbit-gradient":
          "linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #1DB8C6 100%)",
        "gold-gradient":
          "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
        "surface-sheen":
          "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)",
      },
      boxShadow: {
        "orbit-sm": "0 0 12px rgba(124,58,237,0.25)",
        "orbit-md":
          "0 0 24px rgba(124,58,237,0.35), 0 0 48px rgba(79,70,229,0.15)",
        "orbit-gold": "0 0 20px rgba(245,158,11,0.3)",
        "card-inset":
          "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      animation: {
        "pulse-violet": "pulse-violet 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "pulse-violet": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(124,58,237,0)" },
          "50%": {
            boxShadow: "0 0 24px 6px rgba(124,58,237,0.4)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

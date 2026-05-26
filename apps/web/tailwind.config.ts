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
          void: "#f8f9fc",
          surface: "#ffffff",
          raised: "#f4f4f5",
          border: "#e4e4e7",
          "border-accent": "rgba(79,70,229,0.3)",
          violet: "#4f46e5",
          "violet-light": "#6366f1",
          indigo: "#4f46e5",
          gold: "#f59e0b",
          "gold-light": "#fcd34d",
          stellar: "#0891b2",
          text: "#111827",
          "text-2": "rgba(17,24,39,0.6)",
          "text-3": "rgba(17,24,39,0.35)",
          success: "#059669",
          error: "#dc2626",
        },
      },
      backgroundImage: {
        "orbit-gradient":
          "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
        "surface-sheen":
          "linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 100%)",
      },
      boxShadow: {
        "orbit-sm": "0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(79,70,229,0.08)",
        "orbit-md": "0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(79,70,229,0.10)",
        "orbit-gold": "0 2px 8px rgba(245,158,11,0.2)",
        "card-inset": "inset 0 1px 0 rgba(255,255,255,0.9)",
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

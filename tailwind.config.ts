import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Leg accents — DESIGN_RULES.md §Colors
        "leg-order": "#F97316",   // orange-500; Swiggy Food is #FC8019 — never use exactly
        "leg-cook": "#2563EB",    // blue-600; Instamart rebrand 2025
        "leg-dineout": "#F43F5E", // rose-500; Dineout is #FA5754 — never use exactly
        // Surface
        surface: "#F8F7F5",
        // FSSAI food markers — regulatory, exact
        veg: "#008000",
        nonveg: "#963A2F",
      },
      fontFamily: {
        sans: ["Sora", "Poppins", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "12px",
        sheet: "24px",
        chip: "9999px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.08)",
        sheet: "0 -4px 16px rgba(0,0,0,0.12)",
      },
      fontSize: {
        // Food-app dense: nothing bigger than 24
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        xl: ["20px", "28px"],
        "2xl": ["24px", "32px"],
      },
    },
  },
  plugins: [],
};

export default config;

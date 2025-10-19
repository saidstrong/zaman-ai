import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--z-cloud)",
        foreground: "var(--z-ink)",
        ring: 'rgb(var(--z-ring) / <alpha-value>)' 
      },
      borderRadius: { 
        xl: 'var(--radius-xl)', 
        '2xl': 'var(--radius-2xl)' 
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,.06)',
        soft: '0 2px 10px rgba(13, 63, 53, .08)'
      }
    },
  },
  plugins: [],
};

export default config;

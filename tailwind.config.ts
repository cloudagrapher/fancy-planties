import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Use CSS custom properties for colors
        primary: {
          50: 'var(--color-mint-50)',
          100: 'var(--color-mint-100)',
          200: 'var(--color-mint-200)',
          300: 'var(--color-mint-300)',
          400: 'var(--color-mint-400)',
          500: 'var(--color-mint-500)',
          600: 'var(--color-mint-600)',
          700: 'var(--color-mint-700)',
          800: 'var(--color-mint-800)',
          900: 'var(--color-mint-900)',
        },
        mint: {
          50: 'var(--color-mint-50)',
          100: 'var(--color-mint-100)',
          200: 'var(--color-mint-200)',
          300: 'var(--color-mint-300)',
          400: 'var(--color-mint-400)',
          500: 'var(--color-mint-500)',
          600: 'var(--color-mint-600)',
          700: 'var(--color-mint-700)',
          800: 'var(--color-mint-800)',
          900: 'var(--color-mint-900)',
        },
        salmon: {
          50: 'var(--color-salmon-50)',
          100: 'var(--color-salmon-100)',
          200: 'var(--color-salmon-200)',
          300: 'var(--color-salmon-300)',
          400: 'var(--color-salmon-400)',
          500: 'var(--color-salmon-500)',
          600: 'var(--color-salmon-600)',
          700: 'var(--color-salmon-700)',
          800: 'var(--color-salmon-800)',
          900: 'var(--color-salmon-900)',
        },
        lavender: {
          50: 'var(--color-lavender-50)',
          100: 'var(--color-lavender-100)',
          200: 'var(--color-lavender-200)',
          300: 'var(--color-lavender-300)',
          400: 'var(--color-lavender-400)',
          500: 'var(--color-lavender-500)',
          600: 'var(--color-lavender-600)',
          700: 'var(--color-lavender-700)',
          800: 'var(--color-lavender-800)',
          900: 'var(--color-lavender-900)',
        },
        peach: {
          50: 'var(--color-peach-50)',
          100: 'var(--color-peach-100)',
          200: 'var(--color-peach-200)',
          300: 'var(--color-peach-300)',
          400: 'var(--color-peach-400)',
          500: 'var(--color-peach-500)',
          600: 'var(--color-peach-600)',
          700: 'var(--color-peach-700)',
          800: 'var(--color-peach-800)',
          900: 'var(--color-peach-900)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
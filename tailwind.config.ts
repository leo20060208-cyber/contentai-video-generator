import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#000000', // Black background (dark theme)
        foreground: '#ffffff', // White text
        surface: '#0a0a0a',    // Dark gray for cards
        'surface-elevated': '#111111', // Slightly lighter for elevated elements

        primary: {
          DEFAULT: '#ff6b00', // Orange
          dark: '#cc5500',
          light: '#ff8533',
          foreground: '#ffffff'
        },

        secondary: {
          DEFAULT: '#ffffff',
          foreground: '#000000'
        },

        accent: {
          DEFAULT: '#ff6b00', // Orange for accents too
          purple: '#bd00ff'
        },

        border: '#27272a', // zinc-800
        'border-hover': '#3f3f46', // zinc-700
      },

      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-hero': 'radial-gradient(circle at center, rgba(255, 107, 0, 0.08), transparent 70%)',
        'gradient-text': 'linear-gradient(to right, #ff6b00, #ff9e00)',
      },

      animation: {
        shimmer: 'shimmer 2s infinite',
      },

      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

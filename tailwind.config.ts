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
        background: '#ffffff', // White background
        surface: '#f8f8f8',    // Light gray for cards
        'surface-elevated': '#ffffff', // White for elevated elements

        primary: {
          DEFAULT: '#ff6b00', // Orange
          dark: '#cc5500',
          light: '#ff8533',
          foreground: '#ffffff'
        },

        secondary: {
          DEFAULT: '#000000',
          foreground: '#ffffff'
        },

        accent: {
          DEFAULT: '#ff6b00', // Orange for accents too
          purple: '#bd00ff'
        },

        border: '#e5e5e5',
        'border-hover': '#d4d4d4',
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

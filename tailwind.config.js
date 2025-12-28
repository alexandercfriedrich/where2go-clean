/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Perplexity-inspired brand colors
        brand: {
          turquoise: '#20B8CD', // True Turquoise - Primary accent
          peacock: '#218090', // Peacock - Hover states
          sky: '#BADFDE', // Sky - Light accents
          'teal-dark': '#13343B', // Teal Dark - Dark mode surfaces
          'teal-medium': '#2E565D', // Teal Medium - Secondary surfaces
          offblack: '#091717', // Offblack - Dark mode background
          'paper-white': '#FCFAF6', // Paper White - Light mode background
          ecru: '#E5E3D4', // Ecru - Neutral surfaces
          apricot: '#FFD2A6', // Apricot - Positive/highlights
          'terra-cotta': '#A94B30', // Terra Cotta - Warnings
          boysenberry: '#954456', // Boysenberry - Errors
        },
        // Keep existing primary for backward compatibility
        primary: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      fontFamily: {
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Manrope', 'system-ui', 'sans-serif'],
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      aspectRatio: {
        '4/5': '4 / 5',
      },
      zIndex: {
        '60': '60',
        '70': '70',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
}

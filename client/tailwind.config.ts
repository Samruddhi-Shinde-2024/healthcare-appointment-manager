import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf8',
          500: '#0f766e',
          700: '#115e59',
          950: '#042f2e',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

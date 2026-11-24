import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14241c',
        forest: '#1f4d32',
        leaf: '#3f7a3a',
        gold: '#7ea85a',
        cream: '#e4efe4',
        paper: '#ffffff',
        line: '#d5e3f5',
        muted: '#5c6e62',
        danger: '#8d3428',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(28, 61, 48, 0.04)',
      },
    },
  },
  plugins: [],
}

export default config

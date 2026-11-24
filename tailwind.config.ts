import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#10203f',
        forest: '#0a4fd4',
        leaf: '#2f6bff',
        gold: '#7aa2ff',
        cream: '#d5e6fb',
        paper: '#ffffff',
        line: '#d5e3f5',
        muted: '#5c6d8a',
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

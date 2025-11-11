import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#182334'
        }
      }
    }
  },
  plugins: []
};

export default config;

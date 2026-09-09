import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

/**
 * Theme: warm & editorial. Neutral `stone` surfaces with a plum/rose accent
 * (`primary`) — reads well for weddings without being saccharine.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.rose,
        surface: colors.stone,
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

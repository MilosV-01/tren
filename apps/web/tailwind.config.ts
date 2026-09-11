import type { Config } from 'tailwindcss';

/**
 * "Disposable film camera" identity: warm cream surfaces, near-black ink for
 * text/buttons, a small mustard accent for camera-readout details. `surface`
 * and `primary` keep their old names (stone/rose before) so every existing
 * className in the app (bg-surface-50, text-primary-700, …) picks up the new
 * palette automatically — only bespoke components need new classes.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm cream → near-black ramp. surface-50 is the page background.
        surface: {
          50: '#F4EFE6',
          100: '#ECE2D2',
          200: '#DDCEB2',
          300: '#C6B18A',
          400: '#A88F68',
          500: '#877152',
          600: '#6C5B45',
          700: '#4E4235',
          800: '#332B22',
          900: '#1E1915',
          950: '#120F0C',
        },
        // Ink — used for buttons, links, focus rings, emphasis.
        primary: {
          50: '#F5F3EF',
          100: '#E7E1D7',
          200: '#CBBFA9',
          300: '#A9987A',
          400: '#83715A',
          500: '#5B4D3D',
          600: '#332B22',
          700: '#241E18',
          800: '#191410',
          900: '#100D0A',
          950: '#0A0807',
        },
        // Real red, reserved for errors only (primary is no longer red).
        danger: {
          50: '#FDF2F2',
          200: '#F3C6C6',
          600: '#C23A3A',
          700: '#9E2E2E',
        },
        // Small camera-readout accent (LCD-style yellow).
        film: {
          400: '#E8D889',
          500: '#D8C465',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 var(--tw-shadow-color)',
        'hard-sm': '2px 2px 0 0 var(--tw-shadow-color)',
      },
    },
  },
  plugins: [],
};

export default config;

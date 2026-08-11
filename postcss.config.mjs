/**
 * ⚠️ Adding this file routes EVERY stylesheet through PostCSS, including app/globals.css — 455
 * lines of hand-tuned brand CSS that the proposal form depends on. That is safe (PostCSS without
 * plugins that touch it is a pass-through), but it is why SC-008 requires `/` to be verified
 * pixel-identical before this is merged, rather than assumed.
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;

// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Static, content-focused multi-page site. No SSR/adapter: there is no
// server-side feature in scope (the AI solver is out of scope for now).
// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});

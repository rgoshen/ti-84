// @ts-check
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// Static, content-focused multi-page site with React islands for the interactive
// calculators. No SSR/adapter: there is no server-side feature in scope.
// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // Matches the "@/*" -> "src/*" alias used by shadcn/ui and tsconfig paths.
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});

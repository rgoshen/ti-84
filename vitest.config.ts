/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Astro's helper wires the project's Vite config into Vitest so tests can import
// the same modules the site builds. Pure-logic tests run in the node environment.
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
  },
});

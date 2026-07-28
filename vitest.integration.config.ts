/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

/**
 * Integration tests run separately from `npm test`.
 *
 * They drive real infrastructure (Docker), so folding them into the unit config would
 * make the fast feedback loop depend on a running daemon. The default suite stays
 * hermetic and sub-second; CI runs this one as its own step.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // Image build plus container start dominates; the default 5s timeout would trip.
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});

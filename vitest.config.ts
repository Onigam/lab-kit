import { defineConfig } from 'vitest/config';

// The tests of the kit's pure modules, from their source. The self-tests of the narration and the look stay in tools/.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});

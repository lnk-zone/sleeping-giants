import type { UserConfig } from 'vitest/config';

const baseConfig: UserConfig = {
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    watch: false,
  },
};

export default baseConfig;

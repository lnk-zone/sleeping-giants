module.exports = {
  root: true,
  extends: ['../../config/eslint/base.cjs'],
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    node: true,
  },
};

# Sleeping Giants Reader

This package hosts the reader-facing application shell. The project is intentionally
minimal and is meant to be extended with domain-specific features.

## Available scripts

- `pnpm dev` – run the TypeScript compiler in watch mode.
- `pnpm build` – emit JavaScript and declaration files to `dist/`.
- `pnpm lint` – run ESLint on source and test files.
- `pnpm test` – execute unit tests with Vitest.
- `pnpm typecheck` – validate types without emitting build artifacts.

## Project layout

- `src/` contains the application entry point.
- `tests/` contains Vitest unit tests.
- `ci/` contains automation placeholders for future pipelines.

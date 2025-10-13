# Sleeping Giants Shared Package

Common utilities and types that are reused across applications and services live here.
The module is empty by design so teams can start from a clean slate.

## Available scripts

- `pnpm dev` – run the TypeScript compiler in watch mode.
- `pnpm build` – emit JavaScript and declaration files to `dist/`.
- `pnpm lint` – run ESLint on source and test files.
- `pnpm test` – execute unit tests with Vitest.
- `pnpm typecheck` – validate types without emitting build artifacts.

## Project layout

- `src/` contains shareable TypeScript utilities.
- `tests/` contains Vitest unit tests.
- `ci/` contains automation placeholders for future pipelines.

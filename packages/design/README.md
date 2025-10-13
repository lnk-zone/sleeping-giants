# Sleeping Giants Design Package

Centralized design primitives (such as tokens and component contracts) will live in
this workspace. Use it to share styling concerns across applications.

## Available scripts

- `pnpm dev` – run the TypeScript compiler in watch mode.
- `pnpm build` – emit JavaScript and declaration files to `dist/`.
- `pnpm lint` – run ESLint on source and test files.
- `pnpm test` – execute unit tests with Vitest.
- `pnpm typecheck` – validate types without emitting build artifacts.

## Project layout

- `src/` contains design tokens and helpers.
- `tests/` contains Vitest unit tests.
- `ci/` contains automation placeholders for future pipelines.

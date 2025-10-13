# Sleeping Giants MCP Service

This workspace provides the foundations for the Messaging Control Plane (MCP) service.
The scaffold is intentionally lean and ready to be integrated with infrastructure-
specific logic.

## Available scripts

- `pnpm dev` – run the TypeScript compiler in watch mode.
- `pnpm build` – emit JavaScript and declaration files to `dist/`.
- `pnpm lint` – run ESLint on source and test files.
- `pnpm test` – execute unit tests with Vitest.
- `pnpm typecheck` – validate types without emitting build artifacts.

## Project layout

- `src/` contains the service entry point.
- `tests/` contains Vitest unit tests.
- `ci/` contains automation placeholders for future pipelines.

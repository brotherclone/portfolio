# Change: Add Dev Tooling (Ruff + Husky)

## Why

No linting, formatting, or pre-commit enforcement exists. Ruff replaces
flake8/black/isort for Python in a single fast tool. Husky enforces
frontend lint and type checks before every commit reaches the remote.

## What Changes

- Add `ruff` to backend and scripts dev dependencies; configure via `pyproject.toml`
- Add `husky` + `lint-staged` to frontend; configure pre-commit hook
- Pre-commit hook runs: ruff (Python), tsc --noEmit (TypeScript), vitest (frontend unit tests)
- Add `vitest` as the frontend test runner (zero-config, Vite-native)

## Impact

- Affected specs: `dev-tooling` (new capability)
- Affected code: `backend/pyproject.toml`, `scripts/pyproject.toml`,
  `frontend/package.json`, root `.husky/pre-commit`
- No breaking changes to existing code

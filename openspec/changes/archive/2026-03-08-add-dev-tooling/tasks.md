## 1. Python — Ruff

- [x] 1.1 Add `ruff` to `[dependency-groups] dev` in `backend/pyproject.toml`
- [x] 1.2 Add `ruff` to `[dependency-groups] dev` in `scripts/pyproject.toml`
- [x] 1.3 Configure ruff in root `pyproject.toml`: line-length 100, select E/F/I/UP, target py312
- [x] 1.4 Run `ruff check . --fix` and `ruff format .` across backend + scripts; confirm clean

## 2. Frontend — Husky + lint-staged + Vitest

- [x] 2.1 Add `husky`, `lint-staged`, `vitest`, `typescript` to `frontend/package.json` devDependencies
- [x] 2.2 Add `lint-staged` config to `frontend/.lintstagedrc.mjs`: run `tsc --noEmit` + `vitest run`
- [x] 2.3 Run `npx husky init` and write `.husky/pre-commit` to invoke `lint-staged` in `frontend/`
- [x] 2.4 Add placeholder `frontend/src/__tests__/smoke.test.ts` so vitest has at least one test

## 3. Validation

- [x] 3.1 Confirm `ruff check backend/ scripts/` exits 0
- [x] 3.2 Confirm `cd frontend && npx vitest run` exits 0
- [x] 3.3 Make a test commit and confirm hook fires without error

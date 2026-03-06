## 1. Python — Ruff

- [ ] 1.1 Add `ruff` to `[dependency-groups] dev` in `backend/pyproject.toml`
- [ ] 1.2 Add `ruff` to `[dependency-groups] dev` in `scripts/pyproject.toml`
- [ ] 1.3 Configure ruff in root `pyproject.toml`: line-length 100, select E/F/I/UP, target py312
- [ ] 1.4 Run `ruff check . --fix` and `ruff format .` across backend + scripts; confirm clean

## 2. Frontend — Husky + lint-staged + Vitest

- [ ] 2.1 Add `husky`, `lint-staged`, `vitest`, `typescript` to `frontend/package.json` devDependencies
- [ ] 2.2 Add `lint-staged` config to `frontend/package.json`: run `tsc --noEmit` + `vitest run`
- [ ] 2.3 Run `npx husky init` and write `.husky/pre-commit` to invoke `lint-staged` in `frontend/`
- [ ] 2.4 Add placeholder `frontend/src/__tests__/smoke.test.ts` so vitest has at least one test

## 3. Validation

- [ ] 3.1 Confirm `ruff check backend/ scripts/` exits 0
- [ ] 3.2 Confirm `cd frontend && npx vitest run` exits 0
- [ ] 3.3 Make a test commit and confirm hook fires without error

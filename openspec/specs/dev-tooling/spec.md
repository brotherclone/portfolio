# dev-tooling Specification

## Purpose
TBD - created by archiving change add-dev-tooling. Update Purpose after archive.
## Requirements
### Requirement: Python Linting and Formatting (Ruff)
The project SHALL use `ruff` as the single tool for Python linting, formatting,
and import sorting across `backend/` and `scripts/`. Ruff MUST be configured
in the root `pyproject.toml` and available as a dev dependency in both Python
sub-projects. Running `ruff check . --fix && ruff format .` from any Python
sub-project root MUST exit 0 on clean code.

#### Scenario: Ruff passes on committed Python code
- **WHEN** `ruff check backend/ scripts/` is run from the repo root
- **THEN** exit code is 0 with no errors or warnings

#### Scenario: Ruff available in both Python environments
- **WHEN** `uv run --group dev ruff --version` is run in `backend/` or `scripts/`
- **THEN** a version string is printed and exit code is 0

---

### Requirement: Frontend Pre-commit Hook (Husky)
The project SHALL use `husky` to run a pre-commit hook on every `git commit`.
The hook MUST invoke `lint-staged` scoped to `frontend/`, which runs
`tsc --noEmit` (type check) and `vitest run` (unit tests). A commit MUST be
blocked if either check fails.

#### Scenario: Hook blocks commit on type error
- **WHEN** a TypeScript file with a type error is staged and `git commit` is run
- **THEN** the commit is rejected and the type error is printed to stderr

#### Scenario: Hook passes on clean commit
- **WHEN** no type errors exist and all vitest tests pass
- **THEN** the commit proceeds without intervention

---

### Requirement: Frontend Unit Test Runner (Vitest)
The frontend SHALL use `vitest` as its unit test runner. At minimum one smoke
test MUST exist so `vitest run` always has a suite to execute. Tests are
co-located under `frontend/src/__tests__/`.

#### Scenario: Vitest exits 0 with passing tests
- **WHEN** `cd frontend && npx vitest run` is executed
- **THEN** exit code is 0 and at least one test is reported as passed


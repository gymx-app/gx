# Contributing to GX Fitness

## Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to enforce quality gates on every commit and push.

### Pre-commit

Runs automatically before each commit:

- **lint-staged** — ESLint (zero warnings) + Prettier on staged files
- **tsc --noEmit** — full TypeScript type check

### Pre-push

Runs automatically before each push:

- **vitest run** — full test suite
- **vitest run --coverage** — coverage thresholds enforced

### Policy

Do not use `--no-verify` to bypass git hooks. If a gate is failing, fix the issue. The only exception is an emergency hotfix to main, which requires a second developer to review within 24 hours.

# GX Fitness

![Quality](https://github.com/gymx-app/gx/actions/workflows/quality.yml/badge.svg)

## Development

```bash
npm install
npm run dev
```

## Quality Gates

| Gate | Command | Runs on |
|------|---------|---------|
| Lint | `npm run lint` | pre-commit, CI |
| Format | `npm run format:check` | pre-commit, CI |
| Type check | `npm run typecheck` | pre-commit, CI |
| Test + coverage | `npm run test:coverage` | pre-push, CI |
| Security audit | `npm audit --audit-level=high` | CI |

See [CONTRIBUTING.md](CONTRIBUTING.md) for git hook details.

## Branch Protection

Configure in GitHub Settings > Branches > Add rule for `main`:
- Require status checks: **Lint & Format**, **Type Check**, **Test & Coverage**
- Require branches to be up to date before merging
- Do not allow bypassing the above settings

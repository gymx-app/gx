# Technical Debt — Gx Fitness App

Last updated: 2026-06-10

## CRITICAL

_None currently._

## HIGH

| # | Issue | File(s) | Notes |
|---|-------|---------|-------|
| H1 | No offline queue — writes fail silently when offline | `services/*` | Implement `syncQueue.js` using IndexedDB to queue mutations and replay on reconnect |
| H2 | No `useOnlineStatus` hook | — | Navigator.onLine + event listeners. Show offline banner in TopBar |
| H3 | Security: RLS policies not audited | Supabase schema | Verify all tables enforce `user_id = auth.uid()` on SELECT/INSERT/UPDATE |
| H4 | No rate limiting on auth | `authService.js` | Add client-side throttle on failed login attempts |

## MEDIUM

| # | Issue | File(s) | Notes |
|---|-------|---------|-------|
| M1 | `useTodayData` fetches all data in one waterfall | `useTodayData.js` | Split into parallel fetches with `Promise.all`; consider SWR/React Query |
| M2 | No `useAsync` hook — async boilerplate repeated | Multiple | Generic hook: `{ data, error, loading, execute }` |
| M3 | Today.jsx is still ~680 lines | `Today.jsx` | Extract FinisherBlock and CooldownSection into own files |
| M4 | No skeleton loading states | — | Show placeholder cards during data fetch instead of blank screen |
| M5 | Bundle size — React vendor chunk is 452 KB | `index-*.js` | Consider preact-compat or tree-shake unused react-router features |
| M6 | No test coverage | — | Add Vitest + Testing Library for service layer and critical flows |
| M7 | No Sentry/error reporting | `ErrorBoundary.jsx` | Add production error tracking service |

## LOW

| # | Issue | File(s) | Notes |
|---|-------|---------|-------|
| L1 | FinisherBlock still uses raw `supabase` import | `Today.jsx` | Migrate to `checklistService.upsertChecklistLog` |
| L2 | CooldownSection in Today.jsx still uses raw supabase | `Today.jsx` | Same as L1 |
| L3 | `getWeekNumber` imported but unused in Today.jsx | `Today.jsx` | Remove unused import |
| L4 | PWA icons not optimized | `public/dev/`, `public/prod/` | Run through imageoptim/squoosh |
| L5 | No `<meta name="description">` | `index.html` | Add for SEO/sharing |
| L6 | exercise_logs query in LissDay still uses raw supabase for fetchPrev | `LissDay.jsx` | Migrate to service |
| L7 | WarmupSection button + Checkbox both handle toggle (double tap) | `WarmupSection.jsx` | Remove outer button onClick or Checkbox onToggle |

# Debugging Session: website-not-working-ssr-error

## 📅 Status: [OPEN]
- **Session ID**: website-not-working-ssr-error
- **Started At**: 2026-06-01

## 🚨 Symptoms
- User reports "the website is not working".
- `npm run dev` and `npx vite dev` appear to exit immediately with code 0 or success but no server is accessible.
- Previous reports of "SSR HTTPError 500" and syntax errors.

## 🧪 Hypotheses
1. **[H1] Silent Startup Failure**: The server process exits immediately due to a configuration error or missing dependency that doesn't trigger a non-zero exit code.
2. **[H2] SSR Crash on Initial Request**: The server starts but crashes immediately on the first request due to a syntax/runtime error in a shared module (e.g., `use-auth.tsx`).
3. **[H3] Environment Variable Mismatch**: Supabase keys are present in `.env` but not correctly loaded or accessible to the server process.
4. **[H4] Port Conflict**: The default port is taken, and the process exits without a clear error message.

## 📝 Evidence Collected
- [2026-06-01] `npm run dev` exited with code 0 almost immediately.
- [2026-06-01] `npx tsc --noEmit` passed, so no static type errors.

## 🛠 Instrumentation Plan
1. Add a global error listener and log reporter to `src/server.ts` to capture early startup or request errors.
2. Start the Debug Server to collect these logs.

## ✅ Fix Verification
- [ ] Pre-fix logs captured.
- [ ] Root cause identified.
- [ ] Minimal fix applied.
- [ ] Post-fix logs verify resolution.

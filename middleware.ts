// Standard NextAuth v5 middleware pattern (node_modules/next-auth/index.d.ts,
// NextAuthResult.auth doc comment): re-export `auth` itself as the middleware
// function. Gating happens entirely in `callbacks.authorized` in auth.ts —
// this file only decides, via `matcher`, which requests reach that callback
// at all.
export { auth as middleware } from "@/auth";

// Middleware defaults to the Edge runtime, which lacks Node's `crypto`
// module. `auth.ts` imports DrizzleAdapter + the `pg` driver (Node-only), so
// without this the middleware throws "The edge runtime does not support
// Node.js 'crypto' module" on every request (confirmed by running the dev
// server against this middleware without the override — a 500 on every
// protected route, not a graceful redirect). Confirmed valid here via
// node_modules/next/dist/build/analysis/get-page-static-info.js: `runtime`
// is read from a plain `export const runtime = ...` in the middleware file
// (this codepath is distinct from `proxy.ts`, Next 16's newer convention,
// which the "middleware file convention is deprecated" build warning points
// at and which runs on Node.js unconditionally — not used here because the
// plan calls for `middleware.ts`).
export const runtime = "nodejs";

// Exclusion is done here (matcher) rather than by inspecting the pathname
// inside `authorized`, per node_modules/next-auth/index.d.ts's own example:
// middleware doesn't even run for excluded paths, so this is strictly
// cheaper than a request that runs middleware only to allow itself through.
//
// Every alternative below is anchored with `(?:/|$)`, not left as a bare
// string. A negative lookahead only asserts a *prefix* match — `(?!login)`
// rejects "login-history" and "login-foo" just as much as it rejects
// "login", since both start with the literal characters "login". Confirmed
// live pre-fix: `GET /api/authorize-something` and `GET /login-history` both
// 404'd with no redirect, i.e. middleware silently treated them as public.
// `(?:/|$)` forces the character right after the excluded segment to be
// either `/` (a real sub-path) or nothing (an exact match), so "login-history"
// no longer satisfies "login" followed by `/` or end-of-string. This is the
// only defense layer here — callbacks.authorized in auth.ts deliberately does
// not re-check the pathname — so every entry needs the same anchoring, not
// just the two that were probed.
//
// Excluded:
// - /login: the sign-in page itself (created in a later task) — must stay
//   reachable unauthenticated, otherwise no one could ever sign in.
// - /api/auth/*: NextAuth's own routes (app/api/auth/[...nextauth]/route.ts)
//   — magic-link request/callback, session, CSRF, etc. all need to work
//   before a session exists.
// - _next/static, _next/image, favicon.ico: Next.js's own convention for
//   framework-served assets (framework JS/CSS chunks, next/image optimizer).
// - The rest are every static file app/layout.tsx's metadata references
//   directly: manifest.webmanifest (metadata.manifest), favicon.svg and
//   app-icon.svg (metadata.icons), plus sw.js — not in layout.tsx's metadata,
//   but registered client-side (app/script-studio.tsx,
//   navigator.serviceWorker.register("/sw.js")); the browser refetches a
//   registered service worker's script on its own to check for updates, so
//   it must stay reachable the same way the page that registers it does.
export const config = {
  matcher: [
    "/((?!login(?:/|$)|api/auth(?:/|$)|_next/static(?:/|$)|_next/image(?:/|$)|favicon\\.ico(?:/|$)|favicon\\.svg(?:/|$)|app-icon\\.svg(?:/|$)|manifest\\.webmanifest(?:/|$)|sw\\.js(?:/|$)).*)",
  ],
};

"use server";

import { signOut } from "@/auth";

// signOut({ redirectTo }) redirects internally by throwing Next.js's
// NEXT_REDIRECT signal (node_modules/next-auth/lib/actions.js:
// `if (options?.redirect ?? true) return redirect(res.redirect)`), so this
// must stay a plain uncaught `await` — never wrapped in try/catch here, and
// the caller must invoke it as a <form action={signOutAction}> (Next.js's
// documented pattern, see node_modules/next-auth/index.d.ts's own signOut
// example), not from a client-side .then()/.catch() call, which would treat
// the thrown redirect as a rejected promise and swallow it.
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

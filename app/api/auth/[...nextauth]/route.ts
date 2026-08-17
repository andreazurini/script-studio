// auth.ts exports `handlers` as a single object (`NextAuthResult.handlers:
// AppRouteHandlers`, node_modules/next-auth/index.d.ts), not individual GET/POST
// bindings — so `export { GET, POST } from "@/auth"` would fail (no such named
// exports). Destructuring here is the form next-auth's own docs show for this
// export shape (node_modules/next-auth/index.d.ts, NextAuthResult.handlers doc
// comment): `export const { handlers: { GET, POST }, auth } = NextAuth({...})`
// re-exported from the route file.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;

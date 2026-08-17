import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { isAllowedEmail } from "@/db/validate";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      // Resend's own shared testing domain — works without a verified custom
      // domain. Placeholder until Andrea sets up a verified sending domain
      // for Script Studio (see Traccia A task 9, "Cose che richiedono Andrea").
      from: "Script Studio <onboarding@resend.dev>",
    }),
  ],
  // Sessioni JWT (non database session): evita un round-trip DB in più per ogni
  // richiesta su Vercel serverless, dove app/page.tsx è già force-dynamic (vedi
  // piano, Traccia A). sessionsTable resta nello schema solo per completezza di
  // tipo dell'adapter — a runtime non viene mai scritta.
  session: { strategy: "jwt" },
  callbacks: {
    // Boundary di sicurezza reale dell'app. Il provider Email chiama questo
    // callback due volte (node_modules/@auth/core/src/lib/actions/signin/send-token.ts
    // e .../callback/index.ts → handleAuthorized):
    //   1. PRIMA di creare il verificationToken e di invocare
    //      sendVerificationRequest — con `email: { verificationRequest: true }` —
    //      cioè prima ancora che un token esista o che un'email parta. Restituire
    //      `false` qui lancia AccessDenied e blocca tutto: nessuna riga in
    //      verificationTokens, nessuna email inviata.
    //   2. Di nuovo al click sul link (senza `email.verificationRequest`), come
    //      difesa in profondità — in pratica irraggiungibile per un indirizzo
    //      non in allowlist, perché al punto 1 non è mai stato creato un token.
    // `user.email` è popolato in entrambe le chiamate (send-token.ts costruisce
    // `defaultUser = { id, email, emailVerified: null }` quando l'utente non
    // esiste ancora), quindi isAllowedEmail(user.email) è il controllo giusto
    // in entrambi i casi, senza bisogno di guardare `email?.verificationRequest`.
    signIn: async ({ user }) => isAllowedEmail(user.email ?? ""),
    // Usato dal middleware (middleware.ts, `export { auth as middleware }`).
    // Firma e comportamento di default confermati in
    // node_modules/next-auth/lib/index.d.ts (`authorized?: (params: { request:
    // NextRequest; auth: Session | null }) => Awaitable<boolean | NextResponse
    // | Response | undefined>`) e node_modules/next-auth/lib/index.js
    // (handleAuth): quando questo callback restituisce `false`, NextAuth
    // stesso genera il redirect — non serve costruirlo a mano — verso
    // `config.pages?.signIn ?? "${basePath}/signin"`. Da qui la necessità di
    // `pages.signIn` sotto: senza, il redirect andrebbe a `/api/auth/signin`
    // (pagina che questa app non ha) invece che a `/login`.
    // Il pathname non va controllato qui: `middleware.ts` esclude già via
    // `matcher` /login, /api/auth/*, e gli asset statici, quindi ogni
    // richiesta che arriva a questo callback è già una rotta da proteggere.
    authorized: ({ auth }) => !!auth,
  },
  // Pagina di login personalizzata (app/login/page.tsx, task successivo di
  // questo piano). Richiesta perché `callbacks.authorized` sopra restituisce
  // `false` per un redirect automatico — vedi commento lì per la fonte esatta
  // nel codice di next-auth.
  pages: {
    signIn: "/login",
  },
  // AUTH_SECRET: NextAuth v5 lo legge automaticamente da process.env.AUTH_SECRET
  // (fallback NEXTAUTH_SECRET) in next-auth/src/lib/env.ts (setEnvDefaults:
  // `config.secret ??= process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET`),
  // quindi non va passato esplicitamente qui — omesso di proposito, non per
  // dimenticanza. Generato con `npx auth secret` (piano, Traccia A task 9).
  //
  // Non serve nemmeno un callback `session` custom per esporre
  // `session.user.email`: sia la callback `jwt` che quella `session` di
  // default (node_modules/@auth/core/src/lib/init.ts, defaultCallbacks) si
  // limitano a restituire/copiare i valori che arrivano già popolati —
  // l'email finisce sul token al momento del sign-in (defaultToken.email in
  // .../lib/actions/callback/index.ts) e da lì su session.user.email
  // (node_modules/@auth/core/src/lib/actions/session.ts). Aggiungere qui gli
  // stessi callback duplicherebbe comportamento già di default.
});

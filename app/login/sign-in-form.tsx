"use client";

import { useState, type FormEvent } from "react";
// Client-safe import: `next-auth/react` (non `@/auth`, che trascinerebbe
// DrizzleAdapter + il driver `pg` — codice server-only — nel bundle client).
// Confermato in node_modules/next-auth/react.d.ts: `signIn` qui è pensato
// esplicitamente per i Client Component ("This method can only be used from
// Client Components"), a differenza del `signIn` esportato da `@/auth`
// (quello, per Server Action). Non serve `<SessionProvider>` per usarlo: in
// node_modules/next-auth/react.js `signIn` legge la config dal modulo
// `__NEXTAUTH` a livello di modulo, non da React Context (a differenza di
// `useSession`, che invece richiede il provider).
import { signIn } from "next-auth/react";

// Messaggio unico e fisso: identico per indirizzo in allowlist o no. La vera
// verifica (isAllowedEmail) avviene lato server nel callback `signIn` di
// auth.ts — qui non dobbiamo (e non dobbiamo poter) distinguere i due casi.
const NEUTRAL_MESSAGE =
  "Se l'indirizzo è abilitato, riceverai un'email con il link di accesso a breve.";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      // Il risultato non viene ispezionato: che l'indirizzo sia in allowlist
      // o no, il flusso lato client deve comportarsi in modo indistinguibile.
      await signIn("resend", { email, redirect: false });
    } finally {
      // Anche in caso di errore di rete la UI mostra lo stesso messaggio
      // neutro: nessun ramo che dipenda dall'esito.
      setPending(false);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return <p>{NEUTRAL_MESSAGE}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="email" style={{ display: "block", marginBottom: 6 }}>
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={{ display: "block", width: "100%", padding: 8, marginBottom: 12 }}
      />
      <button type="submit" disabled={pending}>
        {pending ? "Invio…" : "Invia link di accesso"}
      </button>
    </form>
  );
}

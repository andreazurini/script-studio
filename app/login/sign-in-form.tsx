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

// Un indirizzo in allowlist fa fare al server un giro reale (scrittura del
// verificationToken su Postgres + chiamata all'API di Resend); un indirizzo
// rifiutato torna subito dopo un confronto sincrono in isAllowedEmail. Senza
// normalizzare i tempi, la durata dello stato "Invio…" da sola rivelerebbe
// quale indirizzo è quello valido — un canale laterale a orologio, niente
// devtools necessari. Il padding sotto garantisce che il messaggio neutro
// compaia sempre non prima di MINIMUM_MS dall'invio, qualunque sia l'esito.
// Valore tenuto volutamente alto: essere lenti quando si potrebbe essere
// veloci è invisibile, il contrario è la fuga di informazione.
const MINIMUM_MS = 1500;

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const startedAt = Date.now();
    // Il risultato non viene ispezionato: che l'indirizzo sia in allowlist o
    // no, il flusso lato client deve comportarsi in modo indistinguibile. Il
    // .catch inerte serve solo a evitare una unhandled rejection (es. errore
    // di rete genuino) — non cambia in alcun modo cosa viene mostrato.
    await signIn("resend", { email, redirect: false }).catch(() => {});
    const elapsed = Date.now() - startedAt;
    const remaining = MINIMUM_MS - elapsed;
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
    setPending(false);
    setSubmitted(true);
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

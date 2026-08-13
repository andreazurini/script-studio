# Script Studio — dalla demo statica all'app live

Data: 2026-08-13
Stato: approvato per esecuzione autonoma (/loop)

## Contesto

Script Studio è oggi uno scaffold `vinext` (fork Cloudflare-specific di Next.js,
pensato per l'hosting interno "ChatGPT Sites" di OpenAI): un unico componente
client-side con stato in `localStorage`, nessun backend. Le sezioni MCP e
"Provider API" nella UI sono mockup ("DA ATTIVARE" / "Non configurato").

Obiettivo: un'app live, sul solito stack Vercel/Railway, con:
- persistenza vera degli script (non `localStorage`)
- login magic link (Resend)
- vault per le chiavi dei provider AI, usato dalle azioni AI già disegnate in editor
- un server MCP reale con i 4 tool già descritti in UI

## Decomposizione

Quattro sotto-progetti in sequenza, ciascuno dipendente dal precedente:

1. **Fondamenta** — via da vinext/Cloudflare, Next.js standard + Postgres, deploy live
2. **Login magic link** — richiede DB e sessione utente dalle fondamenta
3. **Vault chiavi AI** — richiede utente autenticato a cui associare le chiavi
4. **Server MCP reale** — richiede DB (script) e autenticazione (token MCP)

Solo la fase 1 ha un piano di implementazione dettagliato ora. Le fasi 2-4 sono
decise a livello di architettura qui sotto, ma la loro implementazione avrà un
proprio giro di verifica prima di partire.

## Assunzioni esplicite (rivedibili)

- **Single-user**: lo strumento resta personale di Andrea (coerente con "Andrea
  Zurini · Workspace personale" già hardcoded in UI). Il login serve a
  impedire l'accesso a chi trova l'URL pubblico, non a gestire un team.
- Nessuna modalità offline: oggi `localStorage` funge anche da "database"
  offline-first. Con un backend vero, il Postgres diventa la fonte di verità
  e il client non ha più bisogno di quella logica di sync manuale.

## Fase 1 — Fondamenta

**Rimuovere**: `vinext`, `wrangler`, `@cloudflare/vite-plugin`, `worker/index.ts`,
`.openai/hosting.json`, `app/chatgpt-auth.ts` (SIWC è specifico dell'hosting
OpenAI, inutile altrove), i binding D1/R2.

**Aggiungere**: Next.js standard (App Router, mantiene la struttura già in
`app/`), Postgres su Railway, `drizzle-orm` ripuntato da D1/SQLite a Postgres
(resta la stessa libreria, cambia solo il dialetto).

**Persistenza**: tabella `scripts` (id, title, body, format, status, source,
tags, created_at, updated_at). Le mutazioni (crea, modifica, segna pronto)
passano da Server Actions invece che da `localStorage` + `useEffect`. Le
funzioni client-only (teleprompter, camera, registrazione via
`MediaRecorder`/`getUserMedia`) restano identiche: non toccano il backend.

**Deploy**: repo GitHub → Vercel (build automatica su push a `main`) per
l'app; Railway per il Postgres. Variabili d'ambiente (`DATABASE_URL` per
iniziare) configurate su Vercel.

**Definizione di fatto**: app raggiungibile su un dominio Vercel, libreria
script letta/scritta dal Postgres reale, editor/teleprompter/registrazione
funzionanti come oggi, nessun residuo Cloudflare-specifico nel codice.

## Fase 2 — Login magic link (Resend)

Auth.js (NextAuth v5), provider Email con Resend come mailer, adapter Drizzle
sullo stesso Postgres. Allowlist di una sola email (quella di Andrea) via
variabile d'ambiente: chi richiede un magic link con un indirizzo diverso non
riceve nulla. Tutto il resto dell'app richiede sessione autenticata: gli script
sono personali, così come le chiavi AI che arriveranno in fase 3. Scelta di
Auth.js invece di un magic-link fatto in casa: l'autenticazione è un'area dove
un bug fatto in casa costa caro, meglio una libreria matura e testata.

Richiede `RESEND_API_KEY` (dominio verificato su Resend, fornito da Andrea) e
`AUTH_SECRET`.

## Fase 3 — Vault chiavi AI

Tabella `provider_keys` (provider: anthropic | openai | custom, chiave
cifrata, base_url e modello per l'opzione "endpoint compatibile"). Cifratura
AES-256-GCM con una chiave server-only (`ENCRYPTION_KEY`); la chiave in chiaro
non torna mai al client dopo il salvataggio — la UI mostra solo "configurato".
Le tre azioni AI già presenti nell'editor ("Più naturale e orale", "Riduci del
20%", "Crea tre aperture") diventano Server Actions che leggono la chiave
decifrata lato server e chiamano il provider corrispondente.

## Fase 4 — Server MCP reale

`@modelcontextprotocol/sdk`, trasporto Streamable HTTP, montato come Route
Handler Next.js su `/mcp`. Autenticazione via token MCP generato dalla pagina
Connessioni, salvato hashato, associato all'utente. Espone i 4 tool già
descritti in UI (`script_create_draft`, `script_list`, `script_get`,
`script_create_revision`), scrivendo sulla stessa tabella `scripts` (con
l'aggiunta di un concetto minimo di revisione, progettato quando si arriva a
questa fase — non anticipato in fase 1 per non introdurre struttura non
ancora necessaria). Ogni consegna via MCP entra come bozza in stato "Da
rivedere", mai "Pronto": nessuna pubblicazione automatica, coerente con il
messaggio di sicurezza già presente in UI.

## Testing

- Fase 1: verifica manuale in browser (Playwright/browser tool) del flusso
  libreria → editor → teleprompter → registrazione contro il nuovo backend;
  smoke test delle Server Actions (crea, modifica, segna pronto).
- Fase 2: verifica end-to-end dell'invio e consumo del magic link.
- Fase 3: verifica che la chiave cifrata non compaia mai in risposta client
  e che le tre azioni AI producano output plausibile con una chiave di test.
- Fase 4: verifica con un client MCP (Claude) che i 4 tool creino/leggano
  correttamente bozze, rispettando lo stato "Da rivedere".

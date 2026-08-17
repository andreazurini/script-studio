# Script Studio — Fase 2: Login + Ottimizzazione UI/UX

## Contesto

Script Studio è live (https://script-studio-sepia.vercel.app) dopo la Fase 1
(migrazione a Next.js + Postgres). L'app oggi è ancora un mockup parziale in
alcuni punti: la voce "Andrea Zurini" nel menù è testo statico (nessun login
vero), diversi elementi della UI sono decorativi o mostrano dati finti (badge
MCP sempre "1 nuova bozza", timestamp "4 min fa" che non cambia mai), e mancano
azioni base come eliminare/duplicare uno script.

L'utente ha chiesto un'analisi per migliorare la webapp, con una voce
"Account" nel menù, e un piano per ottimizzare UI/UX e capire come aggiungere
le funzionalità già decise in `docs/superpowers/specs/2026-08-13-live-app-design.md`
(login magic link, vault chiavi AI, server MCP). Ha inoltre condiviso
un'ambizione a lungo termine: app a pagamento, pubblicazione su Play
Store/iOS, possibile integrazione nell'ecosistema Exanova, base per una futura
app di gestione contenuti social con AI.

**Decisioni prese con l'utente per questo giro:**
1. La voce Account ha poco senso senza un login vero (il nome è oggi testo
   hardcoded) → **questa ondata include sia la ripulitura UX/UI sia
   l'implementazione del login magic link** (Fase 2 della spec), non solo la
   voce di menù.
2. Le ambizioni a lungo termine **non generano lavoro concreto ora** — servono
   solo da principio guida per non prendere decisioni oggi che le renderebbero
   più difficili domani.

### Principi guida per l'orizzonte lungo (nessun lavoro concreto ora)

- **Mobile/store**: l'app è già una PWA installabile (manifest, service
  worker, prompt di installazione). La strada più economica verso Play
  Store/iOS quando sarà il momento è impacchettare questa stessa PWA (Trusted
  Web Activity / Capacitor) invece di riscriverla nativa — non fare nulla che
  renda questa strada più difficile (es. non introdurre API solo-browser che
  non sopravvivrebbero a un wrapper WebView).
- **Pagamento/multi-tenant**: il login di Fase 2 usa Auth.js con adapter
  Drizzle, che crea di fatto una tabella `users` reale. Questo rende naturale,
  in futuro, aggiungere altri utenti/piani a pagamento senza una riscrittura —
  ma resta a singolo utente per ora, nessuna UI multi-tenant.
- **Ecosistema Exanova / base per app social AI**: tenere il vault chiavi AI
  (Fase 3, non in questo piano) disaccoppiato dalla UI specifica di Script
  Studio (Server Actions dedicate, non logica sparsa nel componente) così è
  estraibile in futuro.

---

## Le due tracce di lavoro

Le due parti sono state progettate insieme (la traccia UX espone i punti di
aggancio che la traccia Auth dovrà riempire) ma sono in gran parte
indipendenti: la maggior parte della traccia UX **non dipende** dal login e
può partire subito.

### Traccia A — Login magic link (Fase 2 della spec)

Segue le decisioni già bloccate nella spec: Auth.js (NextAuth v5, versione
beta più recente `5.0.0-beta.32`, compatibile con `next@16.2.6`/`react@19.2.6`
verificato via peerDependencies), provider Email con Resend, adapter Drizzle
sullo stesso Postgres, **sessioni JWT** (non database session — evita un
round-trip DB in più per ogni richiesta su Vercel serverless, dove
`app/page.tsx` è già `force-dynamic`), allowlist di una sola email via env var
(rifiuto silenzioso e identico nell'interfaccia per qualunque altro indirizzo,
per non rivelare quale sia quello valido).

**File principali coinvolti**: `db/schema.ts` (nuove tabelle `users`,
`accounts`, `sessions`, `verificationTokens` — `users.id` come `text`, non
`uuid`, per compatibilità con l'adapter Auth.js e per restare un buon target
di foreign key quando la Fase 3 aggiungerà `provider_keys.user_id`),
`db/validate.ts` (nuova `isAllowedEmail()`, stesso pattern di validazione
condivisa già usato per gli script), nuovo `auth.ts` in root, nuovo
`app/api/auth/[...nextauth]/route.ts`, nuovo `middleware.ts`, nuovo
`app/login/page.tsx`, nuovo `app/actions/auth.ts` (`signOutAction`),
`app/page.tsx` (passa l'email di sessione a `<ScriptStudio>`),
`app/actions/scripts.ts` (controllo sessione anche lato Server Action, non
solo a livello di middleware).

**Task, in ordine (ognuno con commit separato)**:

1. **Spike di compatibilità** — installare `next-auth@5.0.0-beta.32` e
   `@auth/drizzle-adapter@1.11.3`, leggere i tipi installati per confermare la
   forma esatta richiesta dall'adapter con `drizzle-orm@0.45.2` e se il
   provider Resend richiede il pacchetto npm `resend` oltre a
   `RESEND_API_KEY`. Nessuna riga di schema/config va scritta prima di aver
   confermato questo.
2. **Schema**: aggiungere le tabelle Auth.js a `db/schema.ts` (con commento
   che spiega la scelta `text` per `users.id`), aggiungere `isAllowedEmail()`
   a `db/validate.ts` con test in `tests/validate.test.ts` (match esatto,
   rifiuto di email diverse, case-insensitive, fail-closed se la env var manca).
3. **Migrazione**: `npm run db:generate` + `npm run db:migrate` sul Postgres
   Railway già in uso — verificare che le nuove tabelle esistano e che
   `scripts` resti intatta.
4. **`auth.ts`**: config NextAuth (adapter Drizzle riusando il `db` esistente
   da `db/index.ts`, provider Resend, `session: { strategy: "jwt" }`,
   callback `signIn` che applica `isAllowedEmail()`, callback `session` che
   espone `session.user.email`).
5. **Route handler**: `app/api/auth/[...nextauth]/route.ts` (`export const {
   GET, POST } = handlers`).
6. **`middleware.ts`**: protegge tutte le rotte tranne `/login` e
   `/api/auth/*`; callback `authorized` in `auth.ts`.
7. **Pagina di login**: `app/login/page.tsx` + form minimale — nessuno stile
   elaborato, quello arriva dalla traccia B se serve. Un solo messaggio fisso
   dopo l'invio ("Se l'indirizzo è abilitato, riceverai un'email a breve"),
   identico per indirizzo valido o no.
8. **Sessione nelle Server Actions**: `app/page.tsx` passa
   `session?.user?.email ?? null` a `<ScriptStudio>`; `app/actions/auth.ts`
   con `signOutAction()`; `createScript`/`updateScript` in
   `app/actions/scripts.ts` rifiutano senza sessione (difesa in profondità,
   non solo affidamento al middleware).
9. **Variabili d'ambiente**: `.env.example` aggiorna con `RESEND_API_KEY`,
   `AUTH_SECRET`, `ALLOWED_EMAIL`. `AUTH_SECRET` si genera in automatico
   (`npx auth secret`, nessun intervento manuale). Su Vercel via CLI:
   `AUTH_SECRET` e `ALLOWED_EMAIL` impostabili subito; `RESEND_API_KEY` solo
   dopo che Andrea fornisce la chiave. **In questo stesso passaggio va anche
   colmato un buco già esistente**: `DATABASE_URL` su Vercel oggi è impostata
   solo per Production, non per Preview — se non si aggiunge anche lì, i
   deploy di anteprima smetteranno di funzionare non appena `middleware.ts`
   (che ha bisogno del DB) va live.
10. **Test end-to-end del magic link** — dato che non c'è una vera inbox in
    CI: un test automatico legge il token direttamente dalla tabella
    `verificationTokens` dopo la richiesta (verifica il meccanismo reale, non
    un mock), colpisce l'URL di callback come farebbe un click reale, e
    verifica che si ottenga un cookie di sessione valido; verifica anche che
    zero righe vengano create per un indirizzo non in allowlist. La verifica
    che un'email *arrivi davvero* in produzione resta manuale (serve
    l'inbox reale di Andrea).
11. **Deploy e verifica live**: visita non autenticata reindirizza a
    `/login`; login con l'email di Andrea funziona end-to-end; le funzionalità
    della Fase 1 (libreria/editor/teleprompter) continuano a funzionare da
    autenticati; il sign-out pulisce la sessione.

**Cose che richiedono Andrea, non automatizzabili**: account Resend con
dominio di invio verificato (passaggio DNS, nessuna scorciatoia via CLI/API),
la chiave `RESEND_API_KEY` una volta ottenuta, conferma dell'indirizzo esatto
da mettere in allowlist (default proposto: `info@andreazurini.it` — da
confermare esplicitamente, essendo l'unico punto d'accesso a tutta l'app), e
la verifica finale che l'email arrivi davvero in una inbox reale.

---

### Traccia B — Ottimizzazione UI/UX + voce Account

Analisi UI/UX completa già fatta leggendo `app/script-studio.tsx` (573 righe,
unico componente client) e `app/globals.css`. Convenzioni da rispettare: CSS
scritta a mano con classi semantiche (`.sidebar`, `.script-row`, ecc.),
Tailwind importato ma non usato via classi utility — non introdurre un nuovo
sistema. Nessuna dipendenza UI esiste oggi (tutto fatto a mano: wake lock,
countdown, cambio camera, prompt PWA) — restare coerenti, niente librerie
nuove per problemi piccoli.

**Voce Account — dove va**: non un 4° elemento in `.side-nav` (quello è per
le tre destinazioni di contenuto). Il blocco `.sidebar-bottom > .profile`
(oggi `<div>` con ingranaggio decorativo, riga 452 di `script-studio.tsx`) è
già lo spazio riservato per identità/impostazioni — diventa un `<button>`
reale che apre una nuova pagina `"account"`. Su mobile, dove oggi non esiste
alcun accesso a un profilo, la barra inferiore (griglia CSS fissa a 4 colonne,
`app/globals.css` righe 353-358) passa a 5 colonne per ospitare Account senza
nasconderlo dietro un altro menù.

**Contenuto pagina Account (oggi, prima delle Fasi 3/4)**: riusa le classi
`.connection-card`/`.connection-grid`/`.connections-hero` già esistenti
(stesso pattern visivo di Connessioni, niente CSS nuovo) per mostrare
l'email di sessione + pulsante di sign-out (collegato a `signOutAction` della
Traccia A), e le preferenze del teleprompter (dimensione testo, velocità,
cue, specchio — oggi salvate in `localStorage` ma invisibili fuori dal
teleprompter stesso) con un pulsante "Ripristina predefiniti".

**Le altre criticità trovate, e come vengono trattate**:

| Cosa | Decisione |
|---|---|
| Due pulsanti "•••" (libreria, editor) senza `onClick` | Diventano menù reali: Duplica / Elimina, con due nuove Server Action in `app/actions/scripts.ts` che seguono lo stesso pattern di `createScript`/`updateScript` |
| Puntino di notifica sempre acceso su "Connessioni" | Rimosso — non esiste nessun dato reale dietro |
| `⌘K` nella ricerca non è collegato a nulla | Diventa uno scorciatoia reale che porta il focus sulla ricerca |
| `⌘S` nell'editor è fuorviante (il salvataggio è già automatico a ogni tasto) | Sostituito con un'indicazione onesta ("Salvataggio automatico") |
| Card "IN ARRIVO VIA MCP" (libreria) e "INBOX MCP" (Connessioni) mostrano un finto messaggio di Claude con timestamp "4 min fa" che non cambia mai | Il dato finto va rimosso (è quello che erode la fiducia in un'app usata ogni giorno); resta un'anteprima onesta "in arrivo" senza dati inventati. I badge "DA ATTIVARE"/"Non configurato" sulle card provider/MCP restano — sono accurati, non ingannano |
| Focus non gestito all'apertura del teleprompter/registrazione | Gestione manuale del focus (nessuna libreria — coerente con lo stile del progetto) |
| Nav senza `aria-current` per la pagina attiva | Aggiunto su tutti i pulsanti di navigazione |

**Fuori da questo giro** (segnalato, non implementato ora): caricare il video
registrato sul server (serve una decisione di storage e uno schema nuovo,
merita una spec a parte come le Fasi 2-4); stato "archiviato" per gli script
(nessun bisogno chiaro distinto da elimina/duplica).

**Task, in ordine**:

1. `⌘K` mette a fuoco la ricerca in libreria
2. Sostituire l'indicazione `⌘S` fuorviante con "Salvataggio automatico"
3. Rimuovere il puntino di notifica finto su "Connessioni"
4. `aria-current` sui pulsanti di navigazione (sidebar + mobile)
5. Gestione del focus per teleprompter e dialogo di registrazione
6. Rimuovere i dati finti dalle card MCP, sostituire con anteprima onesta
7. Duplica/Elimina script tramite i due menù "•••" esistenti (nuove Server
   Action + conferma prima di eliminare)
8. Struttura della pagina Account (con pulsante sign-out disabilitato finché
   la Traccia A non è pronta — nessuna dipendenza per iniziare)
9. `.profile` diventa il punto d'accesso reale ad Account (sidebar)
10. Barra mobile a 5 colonne con Account
11. **Dipende dalla Traccia A**: collegare il sign-out reale
    (`signOutAction`) e l'email di sessione vera al posto del testo
    hardcoded
12. Verifica finale su tutti i breakpoint (1180px, 900px, 560px, orientamento
    orizzontale del teleprompter) e da tastiera

I task 1-10 possono partire e completarsi indipendentemente dalla Traccia A;
solo il task 11 aspetta che la Traccia A produca `signOutAction` e la sessione
in `app/page.tsx`.

---

## Verifica end-to-end (a lavoro completato)

- `npm test` verde (nuovi test su `isAllowedEmail` inclusi)
- `npm run build` pulito, nessun residuo di prerendering statico su `/`
- Da browser sull'URL live: visita anonima → redirect a `/login`; login con
  l'email in allowlist funziona; libreria/editor/teleprompter continuano a
  funzionare da autenticati; voce Account raggiungibile da sidebar desktop e
  da barra mobile, mostra l'email reale, sign-out funziona e torna al login;
  duplica/elimina funzionano dai due menù; `⌘K` mette a fuoco la ricerca;
  nessuna card mostra più dati finti con timestamp statico
- Test da tastiera: Tab attraverso la nav espone `aria-current`; apertura del
  teleprompter sposta il focus sul pulsante di chiusura

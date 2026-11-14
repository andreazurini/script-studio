# Script Studio — Piano di pubblicazione open source (Step 1)

Data: 2026-09-19
Destinatario: una **nuova sessione Claude Code** che lo esegue in autonomia, con i punti di decisione (D1-D6) da sottoporre ad Andrea.
Repo: `andreazurini/script-studio` — worktree di lavoro: `C:\repos\personale\script-studio\.worktrees\fase2-login-ux` (branch `feature/fase2-login-ux`).

## Obiettivo

Trasformare Script Studio in un progetto open source presentabile sulla bacheca GitHub pubblica di Andrea (oggi vuota): autonomo, self-hostable, senza contenuti personali, con licenza, README, CI e istruzioni di setup verificate da zero.

Fuori scope: il Content Hub (Step 2, in brainstorming separato), le Fasi 3-4 della spec (vault chiavi AI, server MCP), pagamenti, app mobile.

## Fatti verificati il 2026-09-19 (non darli per scontati: ricontrolla i primi tre)

1. Il repo GitHub **è già PUBBLICO** (creato/pushato il 13/08/2026), **senza licenza**, descrizione vuota. `main` = `1dc9081` (Fase 1).
2. **Nessun segreto reale nella cronologia** di tutti i branch (scansione con pattern su `postgresql://user:pass@`, `re_…`, `AUTH_SECRET=…`, prefisso della password Railway): solo il placeholder `postgresql://user:password@host:port/database` in `.env.example` e nel piano di Fase 1. `.env.local` è ignorato e non è mai stato tracciato.
3. **Contenuti personali già pubblici su `main`**: `db/seed.ts` contiene 4 script completi di Andrea, uno con `source: "Copione H-FARM"` e tag `H-FARM`/`Exanova`.
4. Altri riferimenti personali nei file tracciati sul branch Fase 2: fallback `"Andrea Zurini"` / `"AZ"` / `"Workspace personale"` in `app/script-studio.tsx`; `info@andreazurini.it` in `tests/validate.test.ts`; nome/email/strategia (app a pagamento, Play Store, ecosistema Exanova) in `docs/superpowers/specs/` e `docs/superpowers/plans/`; `.claude/launch.json` tracciato dal branch.
5. `feature/fase2-login-ux`: 30 commit avanti a `main`, working tree pulito, **non unito**. La task A9 (variabili d'ambiente) è stata **interrotta a metà**: verifica lo stato reale con `vercel env ls` e `git status`, non fidarti di questo documento.
6. Il progetto Vercel `script-studio` (scope `andreazurinis-projects`) ha l'integrazione Git: **ogni push su `main` fa un deploy in produzione**. Vedi vincolo critico sotto.
7. Non ci sono `LICENSE`, campo `license` in `package.json`, CI, `CONTRIBUTING`, `SECURITY`.

## Vincolo critico di ordine (leggi prima di toccare `main`)

Il branch Fase 2 mette **tutto** dietro login (`middleware.ts`). Se lo unisci a `main` e fai push **prima** di aver impostato su Vercel `AUTH_SECRET`, `ALLOWED_EMAIL` e `RESEND_API_KEY`, il deploy automatico va in produzione con l'app protetta e nessun modo di accedere (o va in errore a runtime). L'app live di Andrea resterebbe chiusa fuori.
→ **Nessun push su `main` finché la Fase 1.2 non è completa e Andrea ha confermato D1.** Lavora sul branch; puoi pushare il branch (crea solo preview, che non ha ancora le env: è accettabile).

## Decisioni da chiedere ad Andrea (una alla volta, con raccomandazione)

- **D1 — Resend.** Serve una `RESEND_API_KEY` vera. Il mittente `onboarding@resend.dev` recapita **solo all'email dell'account Resend** (va bene per Andrea, ma è un test, non un dominio verificato). Raccomandazione: account Resend di Andrea + `onboarding@resend.dev` per ora, dominio verificato dopo. Senza chiave non si può deployare la Fase 2. Non chiedere mai di incollare la chiave in chat se evitabile: fai impostare a lui `vercel env add RESEND_API_KEY production`, oppure usa il flusso che preferisce.
- **D2 — Cronologia.** (a) Tenere la cronologia e sostituire il seed d'ora in poi (il testo vecchio resta nella storia e nei cloni già possibili dal 13/08); (b) creare una storia nuova (branch orfano) e fare **force-push** su `main`. Raccomandazione: (a), perché il contenuto non è un segreto e riscrivere la storia di un repo pubblico è distruttivo. Se Andrea considera H-FARM riservato → (b): **richiede la sua conferma esplicita** e va eseguito come da Fase 5.
- **D3 — Licenza.** Raccomandazione: MIT, titolare "Andrea Zurini".
- **D4 — Lingua.** UI resta italiana (nessuna i18n in questo giro). README principale in **inglese** (pubblico GitHub) con una sezione breve in italiano. Conferma con Andrea.
- **D5 — Repo name/descrizione/topic.** Raccomandazione: nome invariato; descrizione "Teleprompter and script studio for short-form video creators — Next.js, Postgres, magic-link auth"; topic `teleprompter`, `nextjs`, `postgres`, `drizzle`, `pwa`, `content-creation`.
- **D6 — Documenti di processo.** `docs/superpowers/` contiene piani lunghi con boilerplate da agenti e paragrafi di strategia privata. Raccomandazione: **copiarli nella KB** (`C:\Knowledge Base AZ\`, chiedi ad Andrea in quale cartella; scrittura sicura: prima `.tmp` poi `mv`) e **rimuoverli dal repo pubblico**, tenendo un `docs/ARCHITECTURE.md` breve e pulito. Alternativa: tenerli ripuliti dai riferimenti personali.

## Regole per la sessione esecutrice

- Lavora **solo nel worktree** indicato, mai `cd` nel checkout principale per modificare file.
- Commit piccoli e separati, messaggi in inglese come i precedenti (`git log`), con il trailer `Co-Authored-By` richiesto dalla sessione.
- Stile del repo: CSS scritta a mano in `app/globals.css`, nessuna libreria UI nuova; versioni npm **esatte** (senza `^`).
- Ambiente Windows + Git Bash. **Mai** `taskkill /IM node.exe` (uccide tutti i processi Node della macchina, incluse altre sessioni): termina i dev server **per PID** o per porta.
- `vercel` CLI: usa sempre `--scope andreazurinis-projects`. `vercel env add` in modo non interattivo richiede `--value … --yes`; per `preview` senza branch il comando può chiedere il branch: se fallisce, aggiungi la variabile per il branch `feature/fase2-login-ux` o dalla dashboard.
- `drizzle-kit migrate` **non** legge `.env.local`: esporta `DATABASE_URL` nella shell (la Fase 3 lo sistema per tutti).
- Browser pane: `preview_start` può puntare a un `.claude/launch.json` di un altro repo. Avvia `npm run dev` da Bash e usa `navigate`. Gli screenshot possono fallire ("pane not displayed"): verifica via DOM (`read_page`/`get_page_text`/`javascript_tool`).
- Non stampare mai valori di segreti nei log o nei report. Non toccare i dati del database di produzione oltre a quanto scritto qui.
- Azioni visibili all'esterno (push su `main`, tag, release, impostazioni del repo, force-push): eseguile solo dopo la conferma indicata nella fase corrispondente.

## Fase 0 — Verifica dello stato (nessuna modifica)

1. `git status`, `git log --oneline main..HEAD` (attesi: pulito, 30 commit), `git worktree list`.
2. `gh repo view andreazurini/script-studio --json visibility,licenseInfo,description` (atteso: PUBLIC, nessuna licenza).
3. `vercel env ls --scope andreazurinis-projects` dal progetto collegato: annota quali tra `DATABASE_URL`, `AUTH_SECRET`, `ALLOWED_EMAIL`, `RESEND_API_KEY` esistono e per quali ambienti.
4. `npm ci && npx tsc --noEmit && npm test && npm run lint` sul branch. Tutto deve essere verde prima di proseguire (test attesi: 11).
5. Riporta ad Andrea un riepilogo di 5 righe e chiedi D1.

## Fase 1 — Chiudere la Fase 2 (login), perché fa parte del progetto pubblico

Rif. dettaglio: `docs/superpowers/plans/2026-08-17-fase2-login-ux.md` (Traccia A e B). Task A1-A8 e B1-B11 sono **fatte** e revisionate. Restano:

**1.1 Completare A9 (env)**
- `.env.example`: aggiungi `RESEND_API_KEY=`, `AUTH_SECRET=`, `ALLOWED_EMAIL=`. Commit.
- `.env.local`: genera `AUTH_SECRET` (`npx auth secret` o `openssl rand -base64 32`) senza sovrascrivere `DATABASE_URL`.
- Vercel: `AUTH_SECRET` e `ALLOWED_EMAIL` per Production **e** Preview; `DATABASE_URL` anche per Preview (oggi solo Production). `ALLOWED_EMAIL=info@andreazurini.it` (già confermato da Andrea in sessione).
- `RESEND_API_KEY`: dopo D1. Il mittente è in `auth.ts` (`from: "Script Studio <onboarding@resend.dev>"`); se Andrea verifica un dominio, cambia solo quello, idealmente leggendolo da una variabile `AUTH_EMAIL_FROM` con default `onboarding@resend.dev`.

**1.2 A10 — test end-to-end del magic link** (vedi piano Fase 2): leggi il token da `verificationToken`, colpisci `/api/auth/callback/resend`, verifica cookie di sessione; per un'email non in allowlist verifica **zero righe** create. Nota: importare `auth.ts` con Node puro non funziona (`next/server` senza `exports`, alias `@/`): esegui il test contro un `next dev`/`next start` in esecuzione via HTTP, non importando i moduli.

**1.3 Follow-up emersi dalle review, da fare prima del rilascio pubblico**
- Estrarre `requireSession()` in un helper condiviso (oggi il controllo è duplicato 5 volte in `app/actions/scripts.ts`) e aggiungere test dei gate di autenticazione.
- **Debounce del salvataggio** dell'editor (oggi una Server Action a ogni tasto; scritture fuori ordine possono lasciare nel DB testo più vecchio): 400-600 ms + guardia `WHERE updated_at <= …` o controllo di revisione.
- Un errore di sessione scaduta mostra un toast "riprova" che non può riuscire (già mitigato con testo "ricarica la pagina"); migliorare solo se semplice (ricarica su `UnrecognizedActionError`).
- Unificare i tipi `Format`/`Status` importando `ScriptFormat`/`ScriptStatus` da `db/validate.ts` in `app/page.tsx` e `app/script-studio.tsx`.
- Il warning di Next 16 su `middleware.ts` → `proxy.ts`: valutare la migrazione (permette di togliere `export const runtime = "nodejs"`); non bloccante.
- Verifica manuale, in un browser vero, di una registrazione da tastiera con il dialogo di revisione (il pane sandbox blocca `getUserMedia`, quindi non è mai stato provato dal vivo).

**1.4 B12 — QA finale**: breakpoint 1180/900/560 e teleprompter in orizzontale, navigazione da tastiera, `aria-current`, focus del teleprompter.

**1.5 Unione a `main` e deploy** — solo dopo 1.1 completa, D1 risolta e test verdi:
1. `git merge` (fast-forward se possibile) in `main` dal checkout principale; `npm test` sul risultato.
2. Push di `main` (parte il deploy di produzione). Verifica in browser: `/` reindirizza a `/login`; login con l'email di Andrea (l'email arriva davvero: **chiedere ad Andrea di confermare la ricezione**); la libreria mostra ancora i suoi 4 script; sign-out funziona.
3. Se qualcosa va storto: `vercel rollback`/promuovi il deployment precedente, non improvvisare.

## Fase 2 — De-personalizzazione (su un nuovo branch da `main`, es. `chore/open-source-prep`)

Non toccare il database di produzione: il seed inserisce solo in tabelle vuote, quindi i dati reali di Andrea restano.

2.1 **Seed generico** in `db/seed.ts`: 3-4 esempi neutri in italiano (es. "Come usare il teleprompter", "Hook per un reel in 3 secondi", "Struttura di una lezione breve"), niente nomi di clienti/aziende, `source: "Esempio"`. Aggiorna gli eventuali test/descrizioni.
2.2 **Fallback UI** in `app/script-studio.tsx`: sostituisci `"Andrea Zurini"`, `"AZ"`, `"Workspace personale"` con valori neutri (es. nome = email di sessione, iniziali da `initialsFromEmail`, fallback `"SS"`, sottotitolo "Workspace"). Aggiorna la copia della pagina Account se cita la persona.
2.3 **Test e docs**: `info@andreazurini.it` → `owner@example.com` in `tests/validate.test.ts`. Applica D6 ai documenti di processo.
2.4 **File di ambiente locale**: rimuovi `.claude/launch.json` dal tracciato e aggiungi `.claude/` a `.gitignore`. Verifica che `git ls-files` non contenga altro di locale.
2.5 **Metadati**: `package.json` (`name`, `description`, `license: "MIT"`, `repository`, `keywords`, `author`, `homepage` solo se vuoi); `app/layout.tsx` e `public/manifest.webmanifest` (titolo/nome/descrizione neutri, coerenti con PWA).
2.6 **Grep di controllo** (deve tornare vuoto, salvo `LICENSE`/`author`): `git grep -n -i -E "zurini|h-farm|hfarm|exanova|appgprj|railway|andreazurinis"` sull'albero tracciato.

## Fase 3 — Scaffolding open source

3.1 `LICENSE` (MIT, anno 2026, titolare come da D3).
3.2 `README.md` in inglese (D4): cosa fa e perché, funzionalità (teleprompter, registrazione, libreria, Account, magic link), stack, screenshot (`docs/images/`, catturati con il seed generico), **quickstart da zero** (Node ≥ 22.13, Postgres, variabili d'ambiente in tabella, migrazioni, seed, `npm run dev`), deploy su Vercel + Railway/Neon, note di sicurezza (accesso a singola email in allowlist, cosa NON è: non multi-utente), roadmap breve, come contribuire, licenza. Sezione breve in italiano.
3.3 Rendi il quickstart davvero eseguibile: `db:migrate` deve funzionare senza esportare a mano la variabile (per esempio in `drizzle.config.ts` `process.loadEnvFile?.(".env.local")` con try/catch, Node 22 lo supporta) e aggiungi gli script `db:migrate` e `db:seed` se mancano; aggiungi `docker-compose.yml` con `postgres:16` per lo sviluppo locale (facoltativo ma consigliato).
3.4 `CONTRIBUTING.md` (breve: setup, test, stile, PR), `SECURITY.md` (usa GitHub private vulnerability reporting).
3.5 CI `.github/workflows/ci.yml`: `npm ci`, `tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` con variabili finte (`DATABASE_URL`, `AUTH_SECRET`, `ALLOWED_EMAIL`) — il build non deve richiedere segreti veri.
3.6 (facoltativo) Dependabot per npm e GitHub Actions.

## Fase 4 — Verifiche prima di pubblicare

4.1 **Scansione segreti su tutta la storia e sull'albero**: usa `gitleaks` o `trufflehog` se disponibili (anche via Docker); altrimenti ripeti i pattern della scansione già fatta. Esito atteso: nessun segreto. Segnala ad Andrea qualunque cosa trovata **senza stampare il valore**.
4.2 `git grep` di controllo (2.6) vuoto.
4.3 **Prova da zero** in una cartella temporanea: `git clone` del branch, segui il README riga per riga con un Postgres **nuovo** (Docker o un database usa-e-getta; **non** il Postgres di produzione), verifica avvio, login (con `AUTH_SECRET`/`ALLOWED_EMAIL` di prova), creazione script, teleprompter. Ogni passaggio del README che non funziona va corretto nel README o nel codice.
4.4 `npm audit --omit=dev`: nessuna vulnerabilità high/critical non motivata.
4.5 CI verde sul branch (apri una PR verso `main` o usa `gh run watch`).

## Fase 5 — Pubblicazione

Il repo è già pubblico: si tratta di rifinirlo e mettere in evidenza.

5.1 Unisci `chore/open-source-prep` a `main` (PR o merge locale), push, verifica che il deploy Vercel resti sano.
5.2 Se D2 = (b), storia nuova — **solo con conferma esplicita di Andrea in quella stessa sessione**: crea un branch orfano dal contenuto pulito, un commit iniziale "Initial public release", `git push --force-with-lease origin <orfano>:main`; poi controlla che l'integrazione Git di Vercel funzioni ancora e che i vecchi commit non siano raggiungibili dal repo (restano nei cloni/cache già esistenti: dillo ad Andrea).
5.3 Impostazioni del repo (dopo D5): descrizione, topic, abilita "private vulnerability reporting", verifica che la licenza sia rilevata.
5.4 Tag `v0.1.0` e release con note brevi (funzioni + limiti noti).
5.5 Suggerisci ad Andrea (non farlo senza richiesta) di fissare (pin) il repo sul profilo e, se vuole, di creare il repository profilo `andreazurini/andreazurini` con un README di presentazione.

## Fase 6 — Chiusura

6.1 Aggiungi `script-studio` all'inventario `personale/` in `C:\repos\CLAUDE.md` **e** `C:\repos\AGENTS.md` (i due file devono restare identici): "Script Studio — teleprompter e libreria di script per creator, open source (MIT). In produzione su Vercel + Railway".
6.2 Aggiorna la memoria del progetto solo per fatti non derivabili dal repo (es. decisione D2, dominio/mittente Resend scelto).
6.3 Pulizia: rimuovi il worktree `fase2-login-ux` dopo il merge (`git worktree remove`, branch già unito); niente branch orfani.
6.4 Report finale ad Andrea: URL del repo, cosa è stato cambiato, esito di ogni verifica, decisioni prese e cose rimaste aperte.

## Definizione di fatto

- Repo pubblico con licenza MIT, README in inglese con quickstart **verificato da zero**, CI verde, nessun contenuto personale né segreto (verificato con scansione e grep), app live di Andrea funzionante con login magic link e i suoi dati intatti, release `v0.1.0`.

## Prompt di avvio per la nuova sessione

> Leggi `C:\repos\personale\script-studio\.worktrees\fase2-login-ux\docs\superpowers\plans\2026-09-19-step1-open-source.md` ed eseguilo dalla Fase 0. Lavora nel worktree indicato. Chiedimi le decisioni D1-D6 una alla volta quando servono e non fare push su `main` prima che il vincolo critico sia soddisfatto.

# Script Studio

Libreria di copioni e teleprompter per scrivere, provare e registrare reel,
video e lezioni. Next.js (App Router) + Postgres (Drizzle), deploy su Vercel.

## Sviluppo locale

```bash
npm install
cp .env.example .env.local   # imposta DATABASE_URL con il Postgres Railway
npm run dev
```

## Database

- `npm run db:generate` — genera una nuova migrazione dopo un cambio a `db/schema.ts`
- `npm run db:migrate` — applica le migrazioni al Postgres puntato da `DATABASE_URL`
- `npm run db:seed` — inserisce gli script di esempio (solo se la tabella è vuota)

## Test

```bash
npm test
```

## Deploy

L'app è collegata a Vercel (build automatica su push a `main`); il Postgres
gira su Railway. Variabili d'ambiente richieste su Vercel: `DATABASE_URL`.

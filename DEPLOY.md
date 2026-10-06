# Deploying to Cloudflare Pages

This Next.js app is configured to run on **Cloudflare Pages** (Workers runtime)
via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Because
Pages/Workers have no persistent filesystem, the local SQLite file DB is
replaced at runtime by **Cloudflare D1** (edge SQLite). `bun run dev` keeps
using the local SQLite file, so local development is unchanged.

## One-time setup

### 1. Provision a D1 database

```bash
npx wrangler d1 create deface-archive
```

This prints a `database_id`. Paste it into `wrangler.jsonc` (replace
`REPLACE_WITH_YOUR_D1_DATABASE_ID`).

### 2. Create the schema on D1 (remote)

```bash
bun run db:d1:apply
```

This runs `migrations/0001_init.sql` against your D1 (creates `Hacker`,
`Defacement`, `Stat` tables).

### 3. Seed D1 (optional — fill demo data)

The seed script uses `getDb()`, which auto-detects D1 when running under
`wrangler`. To seed the remote D1:

```bash
npx wrangler d1 execute deface-archive --remote --file=migrations/seed.sql
```

(Generate a seed SQL with `bunx prisma db seed` style tooling, or run the
script under `wrangler pages dev` after `db:d1:apply:local`.)

## Build & deploy

```bash
bun run deploy:cf
```

This runs `opennextjs-cloudflare build` (produces `.open-next/`) and
`wrangler pages deploy`.

## Local Cloudflare preview

```bash
bun run preview:cf
```

Builds then runs `wrangler pages dev` locally (uses a local D1 — run
`bun run db:d1:apply:local` first to create the schema).

## Configuration files

- `wrangler.jsonc` — Pages config: `nodejs_compat` flag, D1 binding `DB`,
  admin credentials as `vars`.
- `open-next.config.ts` — OpenNext build config.
- `migrations/0001_init.sql` — D1 schema (generated from `prisma/schema.prisma`
  via `bunx prisma migrate diff --from-empty --to-schema-datamodel ... --script`).

## How the dual-mode DB works

`src/lib/db.ts` exports:

- `db` — local SQLite singleton (dev / Node scripts).
- `getDb()` — async accessor used by API routes. On Cloudflare it calls
  `getCloudflareContext()` from `@opennextjs/cloudflare`, reads the `DB` D1
  binding, and constructs a `PrismaClient` with `@prisma/adapter-d1`. Locally
  it falls back to the SQLite singleton.

All API routes (`/api/defacements`, `/api/stats`, `/api/leaderboard`,
`/api/submit`, `/api/defacer`, `/api/team`, `/api/admin/promote`) and
`src/lib/promote.ts` use `const db = await getDb()`.

## Environment

`.env` (local dev) and `wrangler.jsonc` `vars` (Cloudflare) both define:

```
ADMIN_USERNAME=GadaLuBau
ADMIN_PASSWORD=slametwkw
```

Change these to your own admin credentials before deploying for real.

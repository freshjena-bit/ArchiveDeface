# Deploying to Cloudflare Pages

This Next.js app deploys to **Cloudflare Pages** (NOT Workers) via
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). The build
produces `.open-next/assets/` (contains `_worker.js` + static files) which
Pages deploys directly. The local SQLite DB is replaced at runtime by
**Cloudflare D1** (edge SQLite).

## Deploy via Cloudflare Pages dashboard (recommended — no CLI needed after setup)

### 1. Create a D1 database
- Dashboard → **Storage & Databases → D1 → Create**
- Name: `zonedefacer`
- Copy the **Database ID** (shown after creation, or on the database's Overview tab)

### 2. Apply schema to D1
- Open the D1 database → **Console** tab
- Copy the entire contents of `migrations/0001_init.sql` from the repo
- Paste into the Console query box → **Execute**
- Verify: go to **Tables** tab → should show 4 tables (Hacker, Defacement, Stat, News)

### 3. Connect repo to Cloudflare Pages
- Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
- Authorize GitHub → select repo `ArchiveDeface`
- **Build settings:**
  - **Framework preset:** None (custom)
  - **Build command:** `npm run build:cf`
  - **Build output directory:** `.open-next/assets`
  - **Environment variables (Production):** add:
    - `ADMIN_USERNAME` = `GadaLuBau`
    - `ADMIN_PASSWORD` = `slametwkw`
    - (optional) `NODE_VERSION` = `20`
- **Save and Deploy**

### 4. After first deploy — configure D1 binding + compat flag
Go to the Pages project → **Settings**:

- **Settings → Functions → D1 database bindings:**
  - Add binding → Variable name: `DB` → select `zonedefacer` database

- **Settings → Functions → Compatibility flags:**
  - Compatibility date: `2025-05-01` (or later)
  - Compatibility flags: add `nodejs_compat`

- **Settings → Environment variables (Production):** (if not set in step 3)
  - `ADMIN_USERNAME` = `GadaLuBau`
  - `ADMIN_PASSWORD` = `slametwkw`

### 5. Redeploy
After configuring the D1 binding + compat flag → trigger a new deployment
(Deployments → Retry deployment / push a commit to GitHub).

Your site: `https://zonedefacer.pages.dev` (or your custom domain).

## Deploy via CLI (alternative)

```bash
npx wrangler login
npx wrangler d1 create zonedefacer        # → paste database_id somewhere (not needed for Pages CLI)
npm run db:d1:apply                        # apply schema to D1 remote
npm run deploy:cf                           # = opennext build + wrangler pages deploy .open-next/assets
```

Note: for Pages CLI deploy, D1 binding + compat flags must still be configured
in the Pages project settings (dashboard). `wrangler pages deploy` deploys the
files but does not set bindings.

## Local Cloudflare preview

```bash
npm run db:d1:apply:local       # create schema in local D1
npm run preview:cf               # build + wrangler pages dev (localhost:8788)
```

## How the dual-mode DB works

`src/lib/db.ts` exports:
- `db` — local SQLite singleton (dev / Node scripts)
- `getDb()` — async accessor. On Cloudflare it calls
  `getCloudflareContext()` from `@opennextjs/cloudflare`, reads the `DB` D1
  binding, and constructs a `PrismaClient` with `@prisma/adapter-d1`.
  Locally it falls back to the SQLite singleton.

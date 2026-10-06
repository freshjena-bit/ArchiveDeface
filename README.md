# ZONEDEFACER

An open, mirror-backed registry of website defacement incidents — incident
archive, top-defacers & team leaderboards, mirror snapshots, on-hold
verification flow, special archives, news, and a hidden admin panel.

Built with Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui +
Prisma. Runs locally on SQLite; deploys to **Cloudflare Pages** with **D1**
(edge SQLite) via OpenNext.

## Quick start (local)

```bash
bun install
cp .env.example .env          # then edit ADMIN_* if you want
bun run db:push               # create local SQLite schema
bun run scripts/seed.ts       # fill demo data (defacements + hackers + news)
bun run dev                   # http://localhost:3000
```

## Routes (hash router — all on `/`)

| Route | Page |
|---|---|
| `/#/` | Home dashboard (stats + live ticker + latest activity + top 10 defacers) |
| `/#/archive` | All incidents (verified) — search, swipe table, mirror snapshots |
| `/#/special` | Special archive (domain patterns `*.gov.*`, `*.go.*`, `*.ac.*`, `*.edu.*`) |
| `/#/onhold` | On-hold records (pending verification) |
| `/#/ranking` | Top Defacers & Teams leaderboard + year filter |
| `/#/submit` | Submit defacement (URLs, attacker, team, PoC, reason) |
| `/#/news` | News & announcements (public read) |
| `/#/about` | Manifesto + charter |
| `/#/defacer/<handle>` | Defacer profile (their archive + counts + Verified/On Hold filter) |
| `/#/team/<name>` | Team profile (their archive + members + counts) |
| `/#/admin` | **Hidden** admin login + dashboard (promote on-hold, post/delete news) |

### Admin login (hidden)

Open `/#/admin` — credentials come from `ADMIN_USERNAME` / `ADMIN_PASSWORD`
(`.env` locally, `wrangler.jsonc` `vars` on Cloudflare).

## Deploy to Cloudflare Pages (from 0)

See **[DEPLOY.md](./DEPLOY.md)** for the full step-by-step (provision D1, apply
schema, build & deploy).

```bash
npx wrangler d1 create zonedefacer        # 1. create D1, paste database_id into wrangler.jsonc
bun run db:d1:apply                        # 2. apply schema to D1
bun run deploy:cf                          # 3. build + deploy to Cloudflare Pages
```

## Tech

- Next.js 16 (App Router, hash routing) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons + Framer Motion
- Prisma 6 (SQLite local / D1 on Cloudflare via `@prisma/adapter-d1`)
- SWR for data fetching + live revalidation
- Recharts for charts
- OpenNext for Cloudflare (`@opennextjs/cloudflare`) for Pages deployment

## Notes

- All handles, teams, target URLs and incident records are demo/fictional.
- The mirror viewer fetches a real screenshot of each target URL via
  `image.thum.io` (falls back to a generated capture if unreachable).
- Submissions are held on-hold for a 10-minute verification window before
  promotion to the verified archive; admins can promote manually.

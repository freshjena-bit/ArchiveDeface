# DEFACERZONEID

An open, mirror-backed registry of website defacement incidents — incident
archive, top-defacers & team leaderboards, mirror snapshots, on-hold
verification flow, special archives, news, and a hidden admin panel.

Built with Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui +
Prisma + PostgreSQL. Deploys to **Vercel** (native Next.js + Neon Postgres).

## Quick start (local)

```bash
bun install
cp .env.example .env          # edit DATABASE_URL to your Neon connection string
bun run db:push               # create schema
bun run db:seed                # fill demo data (defacements + hackers + news)
bun run dev                    # http://localhost:3000
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
| `/#/defacer/<handle>` | Defacer profile |
| `/#/team/<name>` | Team profile |
| `/#/admin` | Hidden admin login + dashboard (promote on-hold, post/delete news) |

### Admin login (hidden)

Open `/#/admin` — credentials from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars.

## Deploy to Vercel

See **[DEPLOY.md](./DEPLOY.md)** — Vercel + Neon Postgres.

## Tech

- Next.js 16 (App Router, hash routing) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui + Lucide icons + Framer Motion
- Prisma 6 + PostgreSQL (Neon)
- SWR for data fetching + live revalidation
- Recharts for charts

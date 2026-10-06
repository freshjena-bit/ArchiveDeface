# ZONEDEFACER — Deploy ke Vercel + PostgreSQL

## Deploy via Vercel (recommended — native Next.js)

### 1. Import repo ke Vercel
- Buka **vercel.com** → login (GitHub/Google)
- **Add New → Project → Import Git Repository**
- Pilih repo `freshjena-bit/ArchiveDeface`
- Framework: **Next.js** (auto-detected)
- Build command: `npx prisma generate && next build` (auto-detected dari `vercel.json`)
- Install command: `bun install` (auto-detected dari `vercel.json`)

### 2. Buat Vercel Postgres database
- Vercel dashboard → **Storage → Create Database → Postgres**
- Name: `zonedefacer`
- Create
- Klik **Connect to Project** → pilih `ArchiveDeface` project
- Copy **DATABASE_URL** dari env vars yang otomatis di-set

### 3. Set environment variables
Vercel project → **Settings → Environment Variables**:
| Name | Value |
|---|---|
| `DATABASE_URL` | (otomatis dari Vercel Postgres) |
| `ADMIN_USERNAME` | `GadaLuBau` |
| `ADMIN_PASSWORD` | `slametwkw` |

### 4. Apply schema + seed ke Postgres
Jalankan locally (dengan DATABASE_URL dari Vercel Postgres):
```bash
# set DATABASE_URL ke Vercel Postgres (copy dari Vercel dashboard)
export DATABASE_URL="postgresql://..."  # paste dari Vercel

# apply schema
npx prisma db push

# seed data
npx tsx scripts/seed.ts
```

Atau via Vercel CLI:
```bash
npm i -g vercel
vercel pull       # download env vars
npx prisma db push --accept-data-loss
npx tsx scripts/seed.ts
```

### 5. Deploy
- Push commit ke GitHub → Vercel auto-deploy
- Atau: `vercel --prod` dari CLI
- URL: `zonedefacer.vercel.app`

## Local dev

```bash
cp .env.example .env          # edit DATABASE_URL ke local Postgres
npx prisma db push            # create schema
npx tsx scripts/seed.ts       # seed demo data
bun run dev                   # localhost:3000
```

## Tech

- Next.js 16 (App Router) + TypeScript
- Prisma 6 + PostgreSQL (Vercel Postgres / local)
- Tailwind CSS 4 + shadcn/ui
- Vercel (hosting + Postgres)

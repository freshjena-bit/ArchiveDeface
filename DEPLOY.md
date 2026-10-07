# ZONEDEFACER — Deploy ke Vercel + Neon PostgreSQL

## Kenapa Neon?
- **10GB free** PostgreSQL (cukup buat ~20 juta record)
- Serverless (auto-suspend saat idle, fast resume ~1s)
- Web SQL Editor (support multi-statement — paste semua sekaligus)
- Full PostgreSQL → compatible dengan Prisma
- Dipakai untuk **local dev + production** (single setup, gak perlu dua provider)

## Arsitektur database
```
prisma/schema.prisma        → provider = "postgresql" (PERMANENT, no hack)
src/lib/db.ts              → single PrismaClient (no D1 adapter, no dual-mode)
.env / Vercel env vars     → DATABASE_URL = Neon connection string
```

Gak ada lagi:
- ❌ `sed` hack di build script (sqlite → postgresql)
- ❌ `@prisma/adapter-d1` (Cloudflare D1)
- ❌ `@opennextjs/cloudflare` + `wrangler` (Cloudflare Workers)
- ❌ Migrations folder SQLite-specific

## 1. Setup Neon (sekali untuk local + prod)
- Buka **neon.tech** → login (GitHub/Google)
- **Create Project** → name: `zonedefacer` → region: pilih terdekat
- Copy **connection string** (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

## 2. Local dev
```bash
cp .env.example .env
# Edit .env: isi DATABASE_URL dengan Neon connection string kamu
bun install
bun run db:push     # create tables di Neon
bun run db:seed    # isi data awal (15 hackers + 200 defacements + 5 news)
bun run dev
```

## 3. Deploy ke Vercel (100% via web, tanpa CLI)
- Vercel → project `zonedefacer` → **Settings → Environment Variables**
- Add:
  - `DATABASE_URL` = paste Neon connection string (sama dengan local)
  - `ADMIN_USERNAME` = `GadaLuBau`
  - `ADMIN_PASSWORD` = `slametwkw`
- Save → **Redeploy**

Build otomatis: `prisma generate → prisma db push (auto-create tables) → next build` ✅

## 4. Isi data (seed) via Neon SQL Editor
- Neon dashboard → project `zonedefacer` → **SQL Editor**
- Atau jalankan `bun run db:seed` dari local (bakal connect ke Neon yang sama)

## Limit Neon free
| Feature | Free tier |
|---|---|
| Storage | **10GB** (~20 juta record) |
| Compute | 100 hours/bulan (auto-suspend saat idle) |
| Projects | 1 |
| Branches | 10 (database branching) |
| Always-on | ❌ (pauses after 5 min idle, resume ~1s) |

Kalau traffic tinggi: upgrade ke Pro ($19/bln) → always-on + more compute.

# ZONEDEFACER — Deploy ke Vercel + Neon PostgreSQL

## Deploy 100% via web (tanpa CLI)

### 1. Buat database di Neon (free 10GB)
- Buka **neon.tech** → login (GitHub/Google)
- **Create Project** → name: `zonedefacer` → region: terdekat
- Copy connection string: `postgresql://...?sslmode=require`

### 2. Import repo ke Vercel + set env vars
- **vercel.com** → Add New → Project → pilih repo `freshjena-bit/ArchiveDeface`
- **Settings → Environment Variables:**
  - `DATABASE_URL` = paste Neon connection string
  - `ADMIN_USERNAME` = `GadaLuBau`
  - `ADMIN_PASSWORD` = `slametwkw`
- **Deploy** (build otomatis: sed sqlite→postgresql → prisma generate → prisma db push (auto-create tables) → next build)

### 3. Buka site
`zonedefacer.vercel.app` — site live, DB kosong (ready buat user submit)

Database mulai kosong. User asli isi sendiri lewat halaman `/#/submit`.

## Local dev
```bash
cp .env.example .env
npx prisma db push
npx tsx scripts/seed.ts    # demo data buat local testing
bun run dev
```

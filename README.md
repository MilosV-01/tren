# Tren

Web platforma za deljenje fotografija i videa sa događaja. Gosti skeniraju QR kod,
otvore web stranicu (bez instalacije), unesu ime i šalju fotografije/video direktno
u zajedničku galeriju. Domaćin upravlja događajem preko dashboarda.

Ovo je **Faza 1 (Core MVP)**.

## Stack

| Sloj      | Tehnologija                                   |
| --------- | --------------------------------------------- |
| Monorepo  | pnpm workspaces                               |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind |
| Backend   | NestJS (REST), TypeScript                     |
| Baza      | PostgreSQL + Prisma                           |
| Storage   | S3-compatible (MinIO lokalno, S3/R2 u prod)   |
| Validacija| zod šeme deljene kroz `packages/shared`       |

## Struktura

```
apps/
  api/      NestJS REST API + Prisma
  web/      Next.js frontend
packages/
  shared/   zod šeme + deljeni TS tipovi (@tren/shared)
```

## Brzi start (lokalno)

```bash
# 1. preduslovi: Node 20+, pnpm 9+, Docker
pnpm install

# 2. env
cp .env.example .env

# 3. infrastruktura (Postgres + MinIO)
pnpm docker:up

# 4. baza
pnpm db:migrate      # kreira šemu
pnpm db:seed         # demo organizacija + event (opciono)

# 5. dev (API na :4000, web na :3000)
pnpm dev
```

MinIO konzola: http://localhost:9001 (`minioadmin` / `minioadmin`).

## Definicija "gotovo" za Fazu 1

- [x] Kreiranje eventa kroz dashboard → QR + share link
- [x] Guest upload bez logina (ime u sesiji), direktan upload u storage preko presigned URL-a
- [x] Galerija: grid, hronološki (najnovije prvo), lazy loading
- [x] Preuzimanje svih fotografija kao ZIP (asinhrono)
- [x] Zaštita galerije: javna ili PIN (hash, server-side provera)
- [x] Retencija po paketu (Free 7d / Premium 90d) — model + logika, cron ostavljen isključen
- [x] Dashboard: lista eventova, ulazak u galeriju, statistika (broj fotki / gostiju)

## Van obima Faze 1

AI kuriranje, live wall, highlight video, partner portal, notifikacije, stvarna naplata.
Arhitektura ostavlja mesto (`MediaItem.aiTags`, `packageTier`, `Organization.type`, ...).

## Skripte

| Komanda            | Opis                                    |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | shared build + API i web u dev modu     |
| `pnpm build`       | production build svega                  |
| `pnpm test`        | unit testovi (API)                      |
| `pnpm db:migrate`  | Prisma migracija (dev)                  |
| `pnpm db:seed`     | seed podaci                             |
| `pnpm db:studio`   | Prisma Studio                           |
| `pnpm docker:up`   | Postgres + MinIO                        |

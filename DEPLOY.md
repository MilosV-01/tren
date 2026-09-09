# Deploy — Tren u produkciju

Tren je monorepo sa tri servisa koji idu na tri mesta:

| Deo | Šta je | Preporučeni hosting | Free tier |
| --- | --- | --- | --- |
| `apps/web` | Next.js frontend | **Vercel** | da |
| `apps/api` | NestJS REST API | **Railway** ili **Render** | da (uz limite) |
| PostgreSQL | baza | **Neon** | da |
| Object storage | fotografije/video | **Cloudflare R2** (S3-kompatibilan) | 10 GB besplatno |

> Vercel odlično hostuje `apps/web`. `apps/api` (dugotrajni proces, Prisma pool,
> in-process ZIP, `@nestjs/schedule`) NE ide na Vercel serverless — drži ga na
> Railway/Render kao običan Node servis.

---

## 1. Git → GitHub

```bash
# repo je već inicijalizovan lokalno (git init + prvi commit)
git remote add origin https://github.com/<tvoj-nalog>/tren.git
git branch -M main
git push -u origin main
```

## 2. PostgreSQL (Neon)

1. Napravi projekat na https://neon.tech → dobiješ `DATABASE_URL` (`postgresql://...`).
2. Lokalno pokreni migraciju na tu bazu:
   ```bash
   cd apps/api
   DATABASE_URL="<neon-url>" pnpm exec prisma migrate deploy
   DATABASE_URL="<neon-url>" pnpm exec prisma db seed   # opciono: demo nalog
   ```

## 3. Object storage (Cloudflare R2)

1. R2 → **Create bucket** (npr. `tren-media`).
2. **Settings → CORS policy** za bucket:
   ```json
   [{ "AllowedOrigins": ["https://<tvoj-web-domen>"], "AllowedMethods": ["GET","PUT"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
3. Napravi **R2 API token** (Access Key ID + Secret).
4. Uključi **public access** ili priključi custom domen na bucket → to je `S3_PUBLIC_URL`.
5. Vrednosti:
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_REGION=auto`
   - `S3_FORCE_PATH_STYLE=true`
   - `S3_PUBLIC_URL=https://<r2-public-ili-custom-domen>`

## 4. API (Railway ili Render)

Novi servis iz GitHub repo-a, **root** = `apps/api`.

- **Build:** `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @tren/shared build && pnpm --filter @tren/api build`
- **Start:** `node dist/main.js`
- **Pre-deploy / release:** `cd apps/api && pnpm exec prisma migrate deploy`

Env varijable (API):

| Ključ | Vrednost |
| --- | --- |
| `NODE_ENV` | `production` |
| `API_PORT` | port koji platforma dodeli (`$PORT`) — ili ostavi 4000 ako platforma mapira |
| `WEB_ORIGIN` | `https://<tvoj-web-domen>` |
| `DATABASE_URL` | Neon URL |
| `JWT_SECRET` | dugačak random string (`openssl rand -base64 48`) |
| `JWT_EXPIRES_IN` | `7d` |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_URL` | iz koraka 3 |
| `MAX_UPLOAD_BYTES` | `209715200` |
| `RETENTION_FREE_DAYS` / `RETENTION_PREMIUM_DAYS` | `7` / `90` |
| `CLEANUP_CRON_ENABLED` | `false` (Faza 1) |

## 5. Web (Vercel)

**Import Project** iz GitHub repo-a.

- **Root Directory:** `apps/web`
- Framework: Next.js (auto). `apps/web/vercel.json` već postavlja install/build komande
  koje prvo grade `@tren/shared`.

Env varijable (Vercel → Settings → Environment Variables):

| Ključ | Vrednost |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://<tvoj-web-domen>` |
| `NEXT_PUBLIC_SITE_URL` | `https://<tvoj-web-domen>` (kanonski, za SEO) |
| `NEXT_PUBLIC_API_URL` | `https://<tvoj-api-domen>` |
| `API_INTERNAL_URL` | `https://<tvoj-api-domen>` (server → API; isti kao gore) |

Deploy. QR kodovi automatski koriste domen sa kog je dashboard otvoren.

## 6. Provera posle deploya

- `https://<web>/` → landing (SEO, OG, `/robots.txt`, `/sitemap.xml`)
- Registracija → kreiranje događaja → QR
- Sa telefona: skeniraj QR → unesi ime → pošalji fotku → pojavi se u galeriji
- „Preuzmi sve (ZIP)" i PIN zaštita

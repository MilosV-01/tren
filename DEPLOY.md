# Deploy — Tren u produkciju

Tri komada, tri servisa (svi imaju free tier):

| Deo | Hosting | Napomena |
| --- | --- | --- |
| `apps/web` (Next.js) | **Vercel** | `apps/web/vercel.json` već podešen za monorepo |
| `apps/api` (NestJS) | **Render** (Docker) | `apps/api/Dockerfile` + `render.yaml` blueprint |
| PostgreSQL | **Render Postgres** (iz `render.yaml`) ili **Neon** | migracije: `prisma migrate deploy` (radi automatski u Docker CMD) |
| Object storage | **Cloudflare R2** (S3-kompatibilan) | 10 GB besplatno; jedini korak koji nema blueprint |

---

## Opcija A — pošalji mi pristup, ja izvršim sve

Napravi 4 stvari i pošalji mi vrednosti; ja onda odradim ceo deploy + konfiguraciju:

1. **GitHub repo** (prazan, npr. `tren`) + **Personal Access Token** (scope `repo`).
   → pošalji: URL repoa + token.
2. **Vercel** nalog + **token** (Account Settings → Tokens).
   → pošalji: token (+ team slug ako koristiš tim).
3. **Render** nalog + **API key** (Account Settings → API Keys).
   → pošalji: API key.
4. **Cloudflare R2**: napravi bucket `tren-media` + R2 API token (Access Key ID + Secret) +
   uključi javni pristup bucketu (ili custom domen).
   → pošalji: `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`.

Token/ključeve tretiram kao tajne, koristim ih samo za ovaj deploy.

---

## Opcija B — sam kroz dashboarde

### 1. GitHub

```bash
git remote add origin https://github.com/<nalog>/tren.git
git push -u origin main
```

### 2. Storage — Cloudflare R2

1. R2 → **Create bucket**: `tren-media`.
2. **Settings → CORS policy**:
   ```json
   [{ "AllowedOrigins": ["https://<web-domen>"], "AllowedMethods": ["GET","PUT"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 3600 }]
   ```
3. **R2 API Tokens** → napravi token → zapamti Access Key ID + Secret.
4. Uključi **Public Development URL** ili priključi custom domen → to je `S3_PUBLIC_URL`.
5. `S3_ENDPOINT = https://<account_id>.r2.cloudflarestorage.com`, `S3_REGION = auto`,
   `S3_FORCE_PATH_STYLE = true`.

### 3. API + baza — Render (blueprint)

1. Render → **New → Blueprint** → izaberi repo. `render.yaml` pravi `tren-api` (Docker) +
   `tren-db` (Postgres). `DATABASE_URL` i `JWT_SECRET` se popune sami.
2. Popuni vrednosti označene `sync: false`: `WEB_ORIGIN` (Vercel domen — vratićeš se posle
   koraka 4), `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET=tren-media`,
   `S3_PUBLIC_URL`.
3. Deploy. Docker CMD sam pokrene `prisma migrate deploy`. Health: `/api/health`.
4. (opciono) demo nalog: u Render Shell-u `cd apps/api && pnpm exec prisma db seed`.

> Alternativa za bazu: **Neon** (durabilniji free tier). Napravi projekat, uzmi `DATABASE_URL`,
> i stavi ga kao env var na `tren-api` umesto Render Postgresa.

### 4. Web — Vercel

**Import Project** → izaberi repo.

- **Root Directory:** `apps/web`
- Framework Next.js (auto). `apps/web/vercel.json` postavlja install/build (prvo gradi `@tren/shared`).
- Env varijable:

  | Ključ | Vrednost |
  | --- | --- |
  | `NEXT_PUBLIC_APP_URL` | `https://<web-domen>` |
  | `NEXT_PUBLIC_SITE_URL` | `https://<web-domen>` |
  | `NEXT_PUBLIC_API_URL` | `https://<render-api-domen>` |
  | `API_INTERNAL_URL` | `https://<render-api-domen>` |

Posle deploya vrati `WEB_ORIGIN` na Render (`tren-api`) na Vercel domen i re-deploy API.

### 5. Provera

- `https://<web>/` → landing, `/robots.txt`, `/sitemap.xml`, OG
- Registracija → događaj → QR
- Telefon: QR → ime → pošalji fotku → galerija → „Preuzmi sve (ZIP)" → PIN

# Deploy — Tren uživo

## Najjednostavnije: jedan Render blueprint (1 nalog, ~5 min)

`render.yaml` deployuje **sve odjednom** — web + API + PostgreSQL — i sam ih poveže.
Fajlovi (fotografije/video) idu na lokalni disk (`STORAGE_DRIVER=disk`), pa **ne treba
nikakav S3/Cloudflare nalog niti ijedan token za lepljenje**.

### Koraci

1. **Gurni kod na GitHub** (ili GitLab):
   ```bash
   git remote add origin https://github.com/<nalog>/tren.git
   git push -u origin main
   ```
2. Napravi nalog na **[render.com](https://render.com)** i poveži GitHub (OAuth, jedan klik).
3. Render → **New → Blueprint** → izaberi `tren` repo → **Apply**.
   Render pravi `tren-web`, `tren-api` i `tren-db`; `JWT_SECRET`, `DATABASE_URL` i
   međusobni URL-ovi se popunjavaju automatski.
4. Sačekaj prvi build (~3–5 min). Otvori `https://tren-web-XXXX.onrender.com`.
5. (opciono) Demo nalog: `tren-api` → **Shell** → `cd apps/api && pnpm exec prisma db seed`
   → login `demo@tren.rs` / `demo1234`.

### Šta znati o free tier-u

| | |
| --- | --- |
| **Fajlovi su efemerni** | Na free planu nema perzistentnog diska → galerije se brišu na svaki redeploy i pri dnevnom restartu. Za trajno: vidi „Trajno čuvanje" niže. |
| **Servisi „spavaju"** | Free web servisi se gase posle 15 min neaktivnosti; prvi zahtev posle toga čeka ~50 s. |
| **Baza ističe** | Render free Postgres traje 30 dana. Za duže: napravi novu ili pređi na [Neon](https://neon.tech) (`DATABASE_URL` env var na `tren-api`). |

### Trajno čuvanje fotografija (kad zatreba)

**Opcija A — Render disk** (najmanje koraka, plaćeno ~$1–7/mo):
u `render.yaml` otkomentariši `disk:` blok pod `tren-api` i promeni `plan: free` → `plan: starter`.

**Opcija B — Cloudflare R2** (besplatno do 10 GB):
1. R2 → Create bucket `tren-media`; CORS: `AllowedOrigins: ["https://<web-domen>"]`, methods `GET,PUT`.
2. R2 API token → Access Key ID + Secret; uključi javni pristup bucketu → to je `S3_PUBLIC_URL`.
3. Na `tren-api` env: `STORAGE_DRIVER=s3`, `S3_ENDPOINT=https://<acc>.r2.cloudflarestorage.com`,
   `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=true`, `S3_BUCKET=tren-media`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`. Redeploy.

---

## Alternativa: web na Vercel + API na Render

Bolji web hosting (bez „spavanja", brže). Dva naloga.

- **Web → Vercel:** Import repo, **Root Directory = `apps/web`** (`apps/web/vercel.json` već
  podešava build). Env: `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL` = Render API URL;
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` = Vercel URL.
- **API + baza → Render:** New → Blueprint (koristi `render.yaml`), pa obriši `tren-web`
  servis iz njega ili ga ignoriši; na `tren-api` postavi `WEB_ORIGIN` = Vercel domen.

---

## Provera posle deploya

- `https://<web>/` → landing, `/robots.txt`, `/sitemap.xml`, OG slika
- Registracija → događaj → QR kod
- Telefon: skeniraj QR → ime → pošalji fotku → pojavi se u galeriji
- „Preuzmi sve (ZIP)" i PIN zaštićena galerija

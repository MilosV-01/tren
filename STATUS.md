# Tren — status implementacije

## Faza 2 — „gotov proizvod" (SEO + landing + QR na telefonu)

Dodato posle Faze 1:

**QR kodovi rade na telefonima.** Ceo javni (guest/gallery) API sada ide kroz same-origin
proxy `apps/web/src/app/api/pub/[...path]/route.ts` — guest stranica radi bez obzira sa kog
hosta je otvorena (localhost, LAN IP, pravi domen), bez CORS-a i bez klijentske konfiguracije.
Jedini cross-origin hop koji ostaje je presigned PUT/GET pravo u storage. QR kod se gradi iz
`window.location.origin` (host sa kog je organizator otvorio dashboard). `.env` je za lokalno
testranje podešen na LAN IP (`192.168.0.18`) za `NEXT_PUBLIC_APP_URL` i `S3_PUBLIC_URL`, pa
telefon na istoj Wi-Fi mreži otvara QR i šalje fotke end-to-end.

**Redizajnirana početna sa ponudom** (`apps/web/src/app/page.tsx` + `src/components/site/*`):
hero sa SVG ilustracijom, traka statistika, „Kako radi" (3 koraka), „Mogućnosti" (6 sa ikonama),
„Za svaki povod", **sekcija Cene** (Besplatan 0 RSD / Premium 2.490 RSD po događaju / Partner ·
White-label na upit), tamna partner sekcija, FAQ (`<details>`, bez JS), završni CTA, header sa
mobilnim menijem i footer. Sav tekst je copywriting na srpskom (`src/lib/marketing.ts`).

**SEO:** puna `metadata` + `viewport` u `layout.tsx` (OG, Twitter, canonical, keywords, robots,
`metadataBase` iz `NEXT_PUBLIC_SITE_URL`), `robots.ts`, `sitemap.ts`, `manifest.ts` (PWA),
`app/icon.svg` + `app/apple-icon.png` (favicon/touch icon), statični `public/og.png` (1200×630,
generisan `scripts/gen-og.mjs` preko `sharp`), JSON-LD (`Organization` + `WebSite` + `Product`
sa `Offer`-ima + `FAQPage`) u `src/components/site/json-ld.tsx`. Privatne stranice
(`/dashboard/*`, `/login`, `/register`, `/e/*`) su `noindex`; guest/gallery imaju dinamički
`generateMetadata` sa naslovom događaja.

**Ostalo:** `not-found.tsx`, `dashboard/loading.tsx`, `?plan=premium` na `/register` i
`/dashboard/events/new` (pretselektuje paket), QR kartica sa dugmićima Kopiraj/PNG/Štampaj.

**Brend + slika:** Tren logo (kamera mark) kao SVG komponenta
(`src/components/site/logo.tsx`, `public/logo-mark.svg`) korišćen u header/footer/auth/guest/404
i za favicon/OG. Prava fotografija u hero sekciji (`public/hero.jpg`, Unsplash License) sa
lebdećim „galerija uživo" i „upload" karticama.

**Deploy (pripremljeno, push radi korisnik):** git repo (`main`), `apps/api/prisma/migrations/…_init`,
`apps/api/Dockerfile`, **`render.yaml`** (jedan blueprint: web + API + Postgres, sve
auto-povezano, bez tokena), `apps/web/vercel.json`, `DEPLOY.md`.

**Storage sloj — dva drajvera** (`STORAGE_DRIVER`):
- `disk` (default) — `LocalDiskStorageProvider` + `BlobController` (`/api/blob/*`, JWT-potpisani
  URL-ovi). Fajlovi na disk/mount, bez S3 naloga. **Lokalno se sada koristi ovaj** (MinIO više
  nije potreban).
- `s3` — `S3StorageProvider` (AWS S3 / R2 / MinIO), direktan upload. Prebacivanje bez ostalih izmena.

API sada poštuje `$PORT` (Render/Railway) i `RENDER_EXTERNAL_URL`; bare-hostname env
vrednosti (Render `fromService`) se normalizuju na `https://`.

### Verifikacija Faze 2 (pokrenuto na ovoj mašini)

- `pnpm --filter @tren/api build`, `pnpm --filter @tren/web build` — ✅
- `pnpm test` — ✅ 9/9
- Prošireni E2E smoke (`C:\Users\milos\tren-devstack\smoke.ps1`) — ✅ **24 provere**:
  landing sadrži ponudu + JSON-LD + OG; `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`,
  `/og.png`, `/apple-icon.png`, `/icon.svg` → 200; **ceo guest tok kroz `/api/pub` proxy**
  (meta → join → upload-url → **PUT pravo u storage na `192.168.0.18`** → confirm → lista →
  export ZIP); PIN gate 403/prolaz; SSR stranice 200.

### Ispravke tokom Faze 2

1. `@vercel/og` (dinamički `opengraph-image`/`apple-icon`) puca na Windows+pnpm+Node24
   (`Invalid URL` u `fileURLToPath`) → zamenjeno statičnim PNG-ovima iz `sharp`
   (`apps/web/scripts/gen-og.mjs`, `pnpm --filter @tren/web gen:assets`).
2. `og:image` se gubio jer `page.tsx` `openGraph` gazi `layout.tsx` `openGraph` (Next ne
   radi deep-merge) → `images` dodat i u `page.tsx`.
3. **OneDrive + `.next`**: `next build` zna da padne sa `EINVAL readlink` pri brisanju starog
   `.next` (OneDrive placeholder-i). Rešenje: `Remove-Item .next -Recurse -Force` pre svakog
   builda (ili premesti repo van OneDrive foldera).

---

## Faza 1 — sve celine M0–M8

| # | Celina | Fajlovi (glavni) |
| --- | --- | --- |
| M0 | Monorepo skelet + tooling | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.eslintrc.cjs`, `.prettierrc`, `docker-compose.yml`, `.env.example` |
| M1 | Prisma šema + seed | `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts` |
| M2 | Deljene zod šeme / tipovi | `packages/shared/src/*` (`enums`, `auth`, `event`, `guest`, `media`, `export`, `common`) |
| M3 | Auth + Event CRUD | `apps/api/src/auth/*`, `apps/api/src/events/*` |
| M4 | Presigned upload + galerija (list) | `apps/api/src/media/*`, `apps/api/src/gallery/*`, `apps/api/src/guest/*`, `apps/api/src/storage/*` |
| M5 | ZIP export + retencija | `apps/api/src/export/*`, `apps/api/src/cleanup/*` |
| M6 | Dashboard | `apps/web/src/app/dashboard/*`, `apps/web/src/components/{create-event-form,qr-share-card,delete-event-button,logout-button}.tsx` |
| M7 | Guest upload stranica | `apps/web/src/app/e/[slug]/page.tsx`, `apps/web/src/components/guest-uploader.tsx`, `apps/web/src/lib/{guest-session,xhr-upload}.ts` |
| M8 | Galerija + PIN gate + ZIP dugme | `apps/web/src/app/e/[slug]/gallery/page.tsx`, `apps/web/src/components/{gallery-view,pin-gate,export-button}.tsx` |

### Testovi (Jest, `apps/api`)
- `events/events.service.spec.ts` — slug, retentionDays/expiresAt po paketu, bcrypt hash PIN-a
- `media/media.service.spec.ts` — kreiranje `upload-url` tiketa, limit veličine, mapiranje MIME → tip
- `cleanup/cleanup.service.spec.ts` — brisanje medija/objekata za istekle događaje

## Ključne odluke (ukratko)

- **Auth organizatora:** email + password (JWT u httpOnly cookie preko Next route handlera). Magic link ostavljen u modelu (`User.magicLinkToken`).
- **Sortiranje galerije:** najnovije prvo (`createdAt desc`), cursor-based paginacija (stabilna dok stižu nove fotke). ZIP export je obrnuto — hronološki rastuće.
- **Guest ruta:** `/api/public/events/:slug/...` (gost zna samo slug, ne interni id). Gost se identifikuje `x-guest-session` headerom, bez ikakvog auth-a.
- **PIN:** `POST /verify-pin` → potpisani `x-gallery-access` token (JWT, scope `gallery`). Organizatorski Bearer token takođe otključava svoju galeriju.
- **Storage:** `StorageProvider` interfejs + `S3StorageProvider` (`@aws-sdk/client-s3`). MinIO/R2/S3 se menjaju samo env varijablama; dva klijenta (interni vs. potpisivanje) za slučaj kad se browser host razlikuje.
- **ZIP export:** asinhron, in-process (`ExportProcessor`, `setImmediate` red), status u `GalleryExport` tabeli. Bez Redisa. Zamena za BullMQ kasnije ne dira API ni klijenta.
- **Retencija:** `Event.expiresAt = createdAt + retentionDays` (Free 7 / Premium 90, iz env-a). `CleanupService.purgeExpiredMedia()` implementiran; `@Cron` namerno zakomentarisan, gejtovan `CLEANUP_CRON_ENABLED` (default false).
- **Tema:** topla — `stone` površine + `rose`/plum akcenat, mobile-first.
- **Paket menadžer:** pnpm workspaces; `@tren/shared` se builduje pre app-ova (`postinstall` + `dev`/`build` skripte).

## Verifikacija — POKRENUTO I PROVERENO ✅

Toolchain nije postojao na mašini, pa je instaliran (winget): **Node.js 24 LTS**, **pnpm 9.7** (preko npm),
**VC++ Redistributable**. Docker Desktop instalacija je pukla (traži UAC/admin), pa je infrastruktura
podignuta **bez Docker-a** — portable **PostgreSQL 16.4** + **MinIO** binarni fajlovi u
`C:\Users\milos\tren-devstack\`.

Urađeno i zeleno:

| Korak | Rezultat |
| --- | --- |
| `pnpm install` | OK (shared build + prisma generate) |
| `pnpm test` | **3 suite / 9 testova — svi prolaze** |
| `pnpm --filter @tren/api build` | OK (tsc) |
| `pnpm --filter @tren/web build` | OK (11 ruta, middleware, type-check) |
| Prisma šema → baza | `prisma db push` (migrate dev je zapinjao non-interaktivno na Windows) |
| `seed` | OK — `demo@tren.rs` / `demo1234` + 2 demo eventa |
| API na `:4000`, web na `:3000` | rade |
| **End-to-end smoke test (17 provera)** | **SVE PROLAZI** |

Smoke test je prošao ceo tok: login → cookie → lista eventova → **kreiranje eventa** →
public meta → **guest join** → **presigned upload-url** → **PUT bajtova direktno u MinIO** →
**confirm** → **galerija lista** → **statistika** (media/photo/guest) → **ZIP export** (async, poll, download) →
**PIN gate** (403 bez PIN-a, 401 pogrešan, prolaz sa tačnim). SSR stranice (`/`, `/login`,
`/e/[slug]`, `/e/[slug]/gallery`) vraćaju 200; `/dashboard` bez cookie-ja → 307 na `/login`.

### Ispravke napravljene tokom pokretanja (u kodu)

1. `gallery.controller.ts` — metoda `media()` se sudarala sa `private media: MediaService` → preimenovano u `listMedia()`.
2. `apps/web/.eslintrc.json` — isključen `react/no-unescaped-entities` (srpski tipografski navodnici u JSX).
3. **Auth cookie** — `secure` se više ne izvodi iz `NODE_ENV` (jer `next start` forsira `production` i pravi `Secure` cookie koji pada na `http://localhost`), nego iz šeme `NEXT_PUBLIC_APP_URL` (`https` → Secure). Novi fajl `apps/web/src/lib/auth-cookie.ts`.
4. **`@nestjs/config`** — prebačeno sa `load` na `validate`, jer je env fajl (string `"7"`) pobeđivao koercirane vrednosti → Prisma je odbijala `retentionDays: "7"`.
5. `apps/api/tsconfig.json` — uklonjen `incremental` (kombinacija sa `deleteOutDir` je pravila polupune `dist/` buildove).

## Pokretanje bez Docker-a (trenutno stanje na ovoj mašini)

Stack je **već pokrenut**. Kontrola:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\milos\tren-devstack\start.ps1   # start svega
powershell -ExecutionPolicy Bypass -File C:\Users\milos\tren-devstack\stop.ps1    # stop svega
```

- Web:   http://localhost:3000
- API:   http://localhost:4000/api/health
- MinIO konzola: http://localhost:9001 (`minioadmin` / `minioadmin`)
- Login: `demo@tren.rs` / `demo1234`
- Demo galerije: `/e/ana-i-marko-demo01` (javna), `/e/petrov-30-demo02` (PIN `2468`)

`.env` je podešen na `127.0.0.1:5432` (portable Postgres). Za normalan tok sa Docker-om,
`.env.example` + `docker-compose.yml` rade kako je opisano čim se instalira Docker Desktop.

## Kako pokrenuti sa Docker-om (preporučeno kad ga instaliraš)

```bash
pnpm install
cp .env.example .env      # DATABASE_URL vrati na @localhost:5432
pnpm docker:up
pnpm --filter @tren/api prisma:migrate   # ili: pnpm --filter @tren/api exec prisma db push
pnpm db:seed
pnpm test
pnpm dev
```

## Poznata ograničenja Faze 1 (namerno)

- Bez server-side thumbnail pipeline-a — galerija koristi original uz lazy-load (`MediaItem.thumbnailKey` spreman za kasnije).
- Bez real-time osvežavanja galerije (reload) — van obima.
- ZIP se generiše u procesu API-ja (nema odvojenog worker-a) — dovoljno za MVP, mesto za BullMQ ostavljeno.
- `aiTags`, partner portal, live wall, naplata — samo mesto u modelu/arhitekturi.

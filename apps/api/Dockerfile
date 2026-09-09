# Tren API — container image for Render / Railway / Fly / any Docker host.
# Build context = repo root:  docker build -f apps/api/Dockerfile .
FROM node:20-slim
RUN corepack enable \
 && apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Whole workspace (.dockerignore trims node_modules/.next/dist/.git).
COPY . .

# install (root postinstall builds @tren/shared + prisma generate) then build api.
RUN pnpm install --frozen-lockfile \
 && pnpm --filter @tren/shared build \
 && pnpm --filter @tren/api exec prisma generate \
 && pnpm --filter @tren/api build

WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 4000

# Apply pending migrations, then boot. $PORT (if set by the host) wins over API_PORT.
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]

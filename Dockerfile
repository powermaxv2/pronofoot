# syntax=docker/dockerfile:1.7
# Image multi-architecture (linux/arm64 pour Raspberry Pi 5, linux/amd64).
# Cibles : `runner` (application + worker) et `tools` (migrations, seed).

ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
  && corepack enable
WORKDIR /app

# --- Dépendances (cache de couche sur le lockfile) ---------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- Build ------------------------------------------------------------------
FROM deps AS builder
COPY . .
RUN pnpm prisma generate && pnpm exec next build && pnpm build:worker

# --- Outils : migrations et seed (dépendances complètes + sources) -----------
FROM builder AS tools
ENV NODE_ENV=production
CMD ["pnpm", "prisma", "migrate", "deploy"]

# --- Image d'exécution minimale ---------------------------------------------
FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN groupadd --system --gid 1001 pronofoot && useradd --system --uid 1001 --gid pronofoot pronofoot \
  && mkdir -p /data/uploads && chown -R pronofoot:pronofoot /data
# Serveur Next autonome (inclut @prisma/client et le moteur Prisma tracés).
COPY --from=builder --chown=pronofoot:pronofoot /app/.next/standalone ./
COPY --from=builder --chown=pronofoot:pronofoot /app/.next/static ./.next/static
COPY --from=builder --chown=pronofoot:pronofoot /app/public ./public
# Worker compilé (tâches planifiées) : résout @prisma/client depuis node_modules du serveur autonome.
COPY --from=builder --chown=pronofoot:pronofoot /app/dist ./dist
USER pronofoot
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/hors-ligne').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]

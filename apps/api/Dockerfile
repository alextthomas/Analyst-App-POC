# syntax=docker/dockerfile:1.7
# API + ingest worker + seed image (one image, three commands). Build from the repo root:
#   docker build -f apps/api/Dockerfile -t ea-sbx/api:<sha> .
# Base image is pinned by digest (node:22-bookworm-slim). Refresh digest deliberately.
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da

# ---- manifests: only package.json files, so dependency layers cache well ----
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV CHECKPOINT_DISABLE=1 NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/producer-client/package.json packages/producer-client/package.json
COPY infra/package.json infra/package.json

# ---- build: full deps, compile contracts, producer-client, api (+ seed) ----
FROM base AS build
RUN npm ci -w @ea/api -w @ea/contracts -w @ea/producer-client --include-workspace-root
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @ea/contracts -w @ea/producer-client \
 && cd apps/api && npx prisma generate && cd ../.. \
 && npm run build -w @ea/api

# ---- deps: production-only node_modules + generated Prisma client ----
FROM base AS deps
RUN npm ci --omit=dev -w @ea/api -w @ea/contracts -w @ea/producer-client --include-workspace-root
COPY apps/api/prisma apps/api/prisma
RUN cd apps/api && npx prisma generate

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production API_PORT=8080 LOG_LEVEL=info
COPY --from=deps --chown=root:root /app/node_modules node_modules
COPY --from=deps /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/packages/contracts/dist packages/contracts/dist
COPY --from=build /app/packages/producer-client/dist packages/producer-client/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/dist-seed apps/api/dist-seed
# node_modules workspace symlinks (@ea/*) point at ../../packages/*; manifests are already in place.
WORKDIR /app/apps/api
USER node
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.API_PORT||8080)+'/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]

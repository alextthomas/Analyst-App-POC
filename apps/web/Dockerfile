# syntax=docker/dockerfile:1.7
# Web image: static SPA + Caddy (TLS, reverse proxy to api:8080). Build from the repo root:
#   docker build -f apps/web/Dockerfile --build-arg VITE_SANDBOX_BANNER=true -t ea-sbx/web:<sha> .
ARG NODE_IMAGE=node:22-bookworm-slim@sha256:4b150b48b4116e2a22f2c39cc27025fbf4f153e2078fd3b14d159fdb5c7279da
ARG CADDY_IMAGE=caddy:2-alpine@sha256:70b3180738b46cd88e49b300d790ae448a0aca3f58edef0f000bb57d619a9ab3

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/producer-client/package.json packages/producer-client/package.json
COPY infra/package.json infra/package.json
RUN npm ci -w @ea/web -w @ea/contracts --include-workspace-root
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/web apps/web
ARG VITE_SANDBOX_BANNER=false
ENV VITE_SANDBOX_BANNER=${VITE_SANDBOX_BANNER}
# VITE_API_BASE is deliberately NOT set: production builds call the API same-origin.
RUN npm run build -w @ea/contracts && npm run build -w @ea/web

FROM ${CADDY_IMAGE} AS runtime
RUN addgroup -g 10001 -S app && adduser -u 10001 -S -G app -H -s /sbin/nologin app \
 && mkdir -p /data /config /srv \
 && chown -R app:app /data /config
COPY --from=build /app/apps/web/dist /srv
COPY infra/sandbox/runtime/Caddyfile /etc/caddy/Caddyfile
ENV XDG_DATA_HOME=/data XDG_CONFIG_HOME=/config
USER 10001:10001
EXPOSE 80 443
# Caddy admin API listens on localhost:2019 inside the container only.
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:2019/config/ || exit 1
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

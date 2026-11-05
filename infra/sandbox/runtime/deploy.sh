#!/usr/bin/env bash
# Sandbox deploy script (ADR-SBX-001). Runs as root on the EC2 host, invoked by the SSM
# documents EaSbx-Deploy / EaSbx-Seed / EaSbx-EmitDemo from the per-SHA release bundle.
#
#   deploy.sh <sha>               migrate, then recreate api/ingest/web on <sha>
#   deploy.sh --seed <sha>        run the guarded synthetic seed
#   deploy.sh --emit-demo <sha>   emit synthetic demo events
#
# Secret values are read with the instance role, written only to a tmpfs env file
# (mode 0600) and never echoed. Do not add `set -x`.
set -euo pipefail
umask 077

MODE=deploy
case "${1:-}" in
  --seed) MODE=seed; shift ;;
  --emit-demo) MODE=emit; shift ;;
  *) ;;
esac
SHA="${1:-}"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "usage: deploy.sh [--seed|--emit-demo] <40-char-sha>" >&2
  exit 2
fi

export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$RELEASE_DIR/compose.sandbox.yml"
RUN_DIR="${EA_RUN_DIR:-/run/ea}"
STATE_DIR="${EA_STATE_DIR:-/opt/ea}"
export EA_DATA_DIR="${EA_DATA_DIR:-/data}"
BACKUP_DIR="$EA_DATA_DIR/backups"
ENV_FILE="$RUN_DIR/app.env"

log() { printf '%s deploy.sh: %s\n' "$(date -u +%FT%TZ)" "$*"; }
ssm_param() { aws ssm get-parameter --name "/ea/sandbox/$1" --query Parameter.Value --output text; }
secret_value() { aws secretsmanager get-secret-value --secret-id "ea/sandbox/$1" --query SecretString --output text; }
dc() { docker compose --project-name ea-sbx -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

wait_ready() {
  # Succeeds only when the API body reports {"status":"ok"} (the endpoint returns 503 otherwise).

  for _ in $(seq 1 18); do
    if dc exec -T api node -e "fetch('http://127.0.0.1:8080/health/ready').then(r=>r.text()).then(t=>process.exit(t.includes('\"status\":\"ok\"')?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
  done
  return 1
}

render_env() {
  local classification site_host registry acme_ca pg_pw seed_admin="" seed_analyst="" tmp
  classification="$(ssm_param data-classification)"
  if [[ "$classification" != "synthetic" ]]; then
    log "refusing: /ea/sandbox/data-classification is not 'synthetic'"
    exit 3
  fi
  site_host="$(ssm_param site-host)"
  registry="$(ssm_param ecr-registry)"
  acme_ca="$(ssm_param acme-ca)"
  pg_pw="$(secret_value postgres)"
  if [[ "$MODE" == "seed" ]]; then
    seed_admin="$(secret_value seed-admin)"
    seed_analyst="$(secret_value seed-analyst)"
  fi
  install -d -m 0700 "$RUN_DIR"
  tmp="$(mktemp "$RUN_DIR/app.env.XXXXXX")"
  chmod 0600 "$tmp"
  {
    printf 'IMAGE_TAG=%s\n' "$SHA"
    printf 'ECR_REGISTRY=%s\n' "$registry"
    printf 'POSTGRES_PASSWORD=%s\n' "$pg_pw"
    printf 'DATABASE_URL=postgresql://ea:%s@postgres:5432/event_analytics?schema=control\n' "$pg_pw"
    printf 'WEB_ORIGIN=https://%s\n' "$site_host"
    printf 'SITE_ADDRESS=%s\n' "$site_host"
    printf 'SESSION_COOKIE_NAME=__Host-ea_sid\n'
    printf 'COOKIE_SECURE=true\n'
    printf 'EA_DATA_CLASSIFICATION=%s\n' "$classification"
    printf 'SEED_ADMIN_PASSWORD=%s\n' "$seed_admin"
    printf 'SEED_ANALYST_PASSWORD=%s\n' "$seed_analyst"
    printf 'CADDY_ACME_CA=%s\n' "$acme_ca"
  } >"$tmp"
  mv -f "$tmp" "$ENV_FILE"
  chmod 0600 "$ENV_FILE"
  REGISTRY="$registry"
}

ecr_login() {
  aws ecr get-login-password | docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
}

prune_old() {
  # Keep the three most recent deployed SHAs' images and the five most recent release dirs.
  local keep sha img
  keep="$(tail -n 3 "$STATE_DIR/history" 2>/dev/null || true)"
  while IFS= read -r img; do
    [[ -n "$img" ]] || continue
    sha="${img##*:}"
    if ! grep -qxF "$sha" <<<"$keep"; then docker rmi "$img" >/dev/null 2>&1 || true; fi
  done < <(docker images --format '{{.Repository}}:{{.Tag}}' | grep '/ea-sbx/' || true)
  { find "$STATE_DIR/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null || true; } \
    | sort -rn | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
}

backup_database() {
  local prev out
  prev="$(cat "$STATE_DIR/current" 2>/dev/null || echo none)"
  install -d -m 0700 "$BACKUP_DIR"
  out="$BACKUP_DIR/$(date -u +%Y%m%dT%H%M%SZ)-${prev}.dump"
  log "pre-migration dump -> $(basename "$out")"
  if ! dc exec -T postgres pg_dump -U ea -Fc event_analytics >"$out"; then
    rm -f "$out"
    log "pg_dump failed; aborting before migrate"
    exit 4
  fi
  find "$BACKUP_DIR" -maxdepth 1 -name '*.dump' -printf '%T@ %p\n' \
    | sort -rn | tail -n +6 | cut -d' ' -f2- | xargs -r rm -f
}

REGISTRY=""
render_env
ecr_login

case "$MODE" in
  seed)
    log "seeding (synthetic) with $SHA"
    dc pull --quiet seed
    dc run --rm seed
    exit 0
    ;;
  emit)
    log "emitting synthetic demo events with $SHA"
    dc pull --quiet emit-demo
    dc run --rm emit-demo
    exit 0
    ;;
  *) ;;
esac

log "deploying $SHA"
dc --profile ops pull --quiet
dc up -d --wait --wait-timeout 120 postgres nats

if dc ps --status running --services | grep -qx api; then
  backup_database
else
  log "no running api; skipping pre-migration dump"
fi

# A failed migration aborts here (set -e): api/ingest/web keep running on the previous image.
log "migrating"
dc run --rm migrate

log "starting api and ingest"
dc up -d --no-deps api ingest
if ! wait_ready; then
  log "api did not report ready within 90s"
  dc logs --tail 50 api || true
  exit 5
fi

log "starting web"
dc up -d --no-deps web

install -d -m 0755 "$STATE_DIR"
if [[ -f "$STATE_DIR/current" ]]; then cp -f "$STATE_DIR/current" "$STATE_DIR/previous"; fi
printf '%s\n' "$SHA" >"$STATE_DIR/current"
printf '%s\n' "$SHA" >>"$STATE_DIR/history"
prune_old
log "deployed $SHA"

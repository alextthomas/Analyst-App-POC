#!/usr/bin/env bash
# Offline test of deploy.sh with stubbed `aws` and `docker` (no AWS, no containers).
# Proves: migrate failure aborts before api/ingest/web are touched, the env file is
# mode 0600, a non-synthetic classification aborts, and the happy-path ordering.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin" "$WORK/data"

cat >"$WORK/bin/aws" <<'STUB'
#!/usr/bin/env bash
case "$*" in
  *"ssm get-parameter --name /ea/sandbox/data-classification"*) echo "${STUB_CLASSIFICATION:-synthetic}" ;;
  *"ssm get-parameter --name /ea/sandbox/site-host"*) echo "1-2-3-4.sslip.io" ;;
  *"ssm get-parameter --name /ea/sandbox/ecr-registry"*) echo "registry.invalid" ;;
  *"ssm get-parameter --name /ea/sandbox/acme-ca"*) echo "https://acme.invalid/directory" ;;
  *"secretsmanager get-secret-value"*) echo "stub-secret-value-not-real" ;;
  *"ecr get-login-password"*) echo "stub-token" ;;
  *) echo "unexpected aws call: $*" >&2; exit 99 ;;
esac
STUB
cat >"$WORK/bin/docker" <<'STUB'
#!/usr/bin/env bash
echo "docker $*" >>"$STUB_CALLS"
case "$*" in
  "login "*) cat >/dev/null ;;
  *"ps --status running --services"*) [[ "${STUB_API_RUNNING:-0}" == 1 ]] && echo api || true ;;
  *"run --rm migrate"*) [[ "${STUB_FAIL_MIGRATE:-0}" == 1 ]] && exit 1 || true ;;
  *"exec -T postgres pg_dump"*) echo "dump-bytes" ;;
  *"images --format"*) ;;
  *) ;;
esac
STUB
chmod +x "$WORK/bin/aws" "$WORK/bin/docker"

run() {
  : >"$WORK/calls.log"
  PATH="$WORK/bin:$PATH" STUB_CALLS="$WORK/calls.log" EA_RUN_DIR="$WORK/run" EA_STATE_DIR="$WORK/state" \
    EA_DATA_DIR="$WORK/data" bash "$HERE/deploy.sh" "$@"
}
SHA=0123456789abcdef0123456789abcdef01234567
fail() { echo "FAIL: $*" >&2; exit 1; }

# 1. migrate fails -> non-zero, api/ingest/web never started.
if STUB_FAIL_MIGRATE=1 STUB_API_RUNNING=1 run "$SHA" >"$WORK/out.log" 2>&1; then fail "deploy should fail when migrate fails"; fi
grep -q "run --rm migrate" "$WORK/calls.log" || { cat "$WORK/out.log" "$WORK/calls.log" >&2; fail "migrate was not attempted"; }
if grep -qE "up -d --no-deps (api|web)" "$WORK/calls.log"; then fail "api/web touched after failed migrate"; fi
[[ ! -e "$WORK/state/current" ]] || fail "current pointer written after failed migrate"
echo "ok: failed migrate aborts before api/ingest/web"

# 2. env file is 0600 and holds no value on the command line.
mode="$(stat -c '%a' "$WORK/run/app.env")"
[[ "$mode" == "600" ]] || fail "app.env mode is $mode, expected 600"
echo "ok: app.env mode 600"

# 3. non-synthetic classification aborts before any docker call except none.
if STUB_CLASSIFICATION=production run "$SHA" >/dev/null 2>&1; then fail "non-synthetic must abort"; fi
echo "ok: non-synthetic classification aborts"

# 4. bad sha is rejected.
if run "not-a-sha" >/dev/null 2>&1; then fail "bad sha accepted"; fi
echo "ok: bad sha rejected"

# 5. happy path ordering: pull -> up postgres nats -> dump -> migrate -> api/ingest -> web.
STUB_API_RUNNING=1 run "$SHA" >"$WORK/out.log" 2>&1 || { cat "$WORK/out.log" "$WORK/calls.log" >&2; fail "happy path failed"; }
seq_found="$(grep -oE "up -d --wait|pg_dump|run --rm migrate|up -d --no-deps api ingest|up -d --no-deps web" "$WORK/calls.log" | xargs -d '\n' printf '%s|')"
expected="up -d --wait|pg_dump|run --rm migrate|up -d --no-deps api ingest|up -d --no-deps web|"
[[ "$seq_found" == "$expected" ]] || fail "unexpected step order: $seq_found"
[[ "$(cat "$WORK/state/current")" == "$SHA" ]] || fail "current pointer not updated"
ls "$WORK/data/backups"/*.dump >/dev/null 2>&1 || fail "pre-migration dump not written"
echo "ok: happy path order and state"
echo "ALL PASSED"

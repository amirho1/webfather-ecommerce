#!/bin/sh
set -eu

case "${1:-}" in
  ''|--build-only) ;;
  *) echo 'Usage: scripts/docker-deploy.sh [--build-only]' >&2; exit 2 ;;
esac

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

if [ ! -f .env ]; then
  echo 'Create .env before deploying.' >&2
  exit 1
fi

export SQLITE_VOLUME_NAME="${SQLITE_VOLUME_NAME:-webfather_sqlite_data}"
snapshot_dir=$(mktemp -d "${TMPDIR:-/tmp}/webfather-sqlite-build.XXXXXX")
export SQLITE_SNAPSHOT_DIR="$snapshot_dir"

cleanup() {
  rm -f "$snapshot_dir/webfather-ecommerce.db"
  rmdir "$snapshot_dir"
}
trap cleanup EXIT

docker volume create "$SQLITE_VOLUME_NAME" >/dev/null

# SQLite VACUUM INTO takes a consistent snapshot, including committed WAL data.
# Opening the database also creates it on the volume for a first deployment.
docker run --rm \
  --mount "type=volume,src=$SQLITE_VOLUME_NAME,dst=/app/data" \
  --mount "type=bind,src=$snapshot_dir,dst=/snapshot" \
  node:22-bookworm-slim node -e '
    const { DatabaseSync } = require("node:sqlite")
    const fs = require("node:fs")
    const db = new DatabaseSync("/app/data/webfather-ecommerce.db")
    db.exec("VACUUM INTO '\''/snapshot/webfather-ecommerce.db'\''")
    db.close()
    fs.chownSync("/app/data", 1000, 1000)
    for (const file of fs.readdirSync("/app/data")) {
      if (file === "webfather-ecommerce.db" || file.startsWith("webfather-ecommerce.db-")) {
        fs.chownSync(`/app/data/${file}`, 1000, 1000)
      }
    }
  '

docker compose build payload

if [ "${1:-}" != '--build-only' ]; then
  docker compose up -d --no-build payload
fi

#!/bin/sh
# Entrypoint for the Hoard app container.
# 1. Materialize dist/ from the pristine template and substitute the runtime
#    config sentinels (__JAZZ_APP_ID__ / __JAZZ_SERVER_URL__) that the image
#    was built with. Runs on every start, so changing JAZZ_APP_ID or
#    JAZZ_SERVER_URL just needs a container restart.
# 2. Apply Better Auth sqlite migrations (idempotent) to $AUTH_DB_DIR.
# 3. Serve the built TanStack Start app with srvx:
#    - dist/server/server.js exports a fetch handler (SPA shell + /api/*)
#    - dist/client holds the static SPA assets
set -e

rm -rf ./dist
cp -R ./dist-template ./dist

if grep -rql '__JAZZ_APP_ID__' ./dist/client 2>/dev/null; then
  if [ -z "$JAZZ_APP_ID" ] || [ -z "$JAZZ_SERVER_URL" ]; then
    echo '[entrypoint] ERROR: this image was built with config sentinels;' >&2
    echo '[entrypoint] set JAZZ_APP_ID and JAZZ_SERVER_URL environment variables.' >&2
    exit 1
  fi
  echo "[entrypoint] configuring client bundle (app id: $JAZZ_APP_ID, sync: $JAZZ_SERVER_URL)"
  find ./dist -type f \( -name '*.js' -o -name '*.mjs' -o -name '*.html' -o -name '*.webmanifest' \) \
    -exec sed -i \
    -e "s|__JAZZ_APP_ID__|$JAZZ_APP_ID|g" \
    -e "s|__JAZZ_SERVER_URL__|$JAZZ_SERVER_URL|g" {} +
fi

echo "[entrypoint] running Better Auth migrations (AUTH_DB_DIR=${AUTH_DB_DIR:-./data})"
better-auth migrate --config src/lib/auth.ts -y

echo "[entrypoint] starting app on port ${PORT:-3000}"
exec node node_modules/srvx/bin/srvx.mjs serve \
  --prod \
  --port "${PORT:-3000}" \
  --entry ./dist/server/server.js \
  --static ./dist/client

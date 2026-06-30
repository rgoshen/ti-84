#!/bin/sh
set -e

TEMPLATE_DIR=/usr/share/nginx/html_templates
OUT_DIR=/usr/share/nginx/html

mkdir -p "$OUT_DIR"

# Substitute environment variables into every HTML template.
for tpl in "$TEMPLATE_DIR"/*.html; do
  name="$(basename "$tpl")"
  envsubst < "$tpl" > "$OUT_DIR/$name"
done

# Hand off to the default nginx CMD.
exec "$@"
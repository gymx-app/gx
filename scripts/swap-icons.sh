#!/bin/sh
# Copies the correct icon set (dev or prod) to the public root.
# Usage: VITE_ENV=prod ./scripts/swap-icons.sh
#   defaults to "dev" if VITE_ENV is not set.

ENV="${VITE_ENV:-dev}"
SRC="public/$ENV"

if [ ! -d "$SRC" ]; then
  echo "Icon folder $SRC not found, skipping icon swap."
  exit 0
fi

cp "$SRC/favicon.ico"                  public/favicon.ico
cp "$SRC/favicon-96x96.png"            public/favicon-96x96.png
cp "$SRC/apple-touch-icon.png"         public/apple-touch-icon.png
cp "$SRC/web-app-manifest-192x192.png" public/pwa-192x192.png
cp "$SRC/web-app-manifest-512x512.png" public/pwa-512x512.png

echo "Icons: $ENV set copied to public/"

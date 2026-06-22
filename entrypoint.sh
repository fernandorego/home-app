#!/bin/sh
set -e

# On first run the mounted volume is empty — copy the scaffolded app into it
if [ ! -f /app/package.json ]; then
  echo "Bootstrapping home-app..."
  # Exclude node_modules; the named volume handles that separately
  cp -r /scaffold/home-app/. /app/
  rm -rf /app/node_modules
fi

npm install
exec npm run dev

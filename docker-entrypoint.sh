#!/bin/sh
set -e

echo "=== TyvaTransit startup ==="
echo "PORT=${PORT:-8000}"

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Railway: Web service -> Variables -> Add Reference -> PostgreSQL -> DATABASE_URL"
  exit 1
fi

if [ -z "${SECRET_KEY}" ] || [ "${SECRET_KEY}" = "build-only-collectstatic" ] || [ "${SECRET_KEY}" = "build-only-not-for-production" ]; then
  echo "ERROR: SECRET_KEY is not set in Railway Variables."
  exit 1
fi

if [ ! -f "/app/tyva-transit-ui/index.html" ]; then
  echo "ERROR: Frontend not found at /app/tyva-transit-ui"
  exit 1
fi

echo "Running migrations (with retries)..."
attempt=1
max=20
until python manage.py migrate --noinput; do
  if [ "$attempt" -ge "$max" ]; then
    echo "ERROR: migrate failed after ${max} attempts."
    echo "Check DATABASE_URL and that PostgreSQL service is running."
    exit 1
  fi
  echo "Migrate attempt ${attempt} failed, retry in 3s..."
  attempt=$((attempt + 1))
  sleep 3
done

echo "Migrations OK. Starting gunicorn on 0.0.0.0:${PORT:-8000}..."
exec gunicorn config.wsgi:application \
  --bind "0.0.0.0:${PORT:-8000}" \
  --workers 2 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile -

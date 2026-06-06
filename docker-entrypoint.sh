#!/bin/sh
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Railway: add PostgreSQL, then Web service -> Variables -> Add Reference -> DATABASE_URL"
  exit 1
fi

if [ -z "${SECRET_KEY}" ] || [ "${SECRET_KEY}" = "build-only-collectstatic" ] || [ "${SECRET_KEY}" = "build-only-not-for-production" ]; then
  echo "ERROR: SECRET_KEY is not set in Railway Variables."
  exit 1
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting gunicorn on port ${PORT:-8000}..."
exec gunicorn config.wsgi:application --bind "0.0.0.0:${PORT:-8000}"

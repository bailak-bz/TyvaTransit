FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY tyva-transit-backend/requirements.txt tyva-transit-backend/requirements.txt
RUN pip install --no-cache-dir -r tyva-transit-backend/requirements.txt

COPY tyva-transit-backend/ tyva-transit-backend/
COPY tyva-transit-ui/ tyva-transit-ui/

ENV FRONTEND_DIR=/app/tyva-transit-ui
ENV PYTHONUNBUFFERED=1
ENV SECRET_KEY=build-only-not-for-production
ENV DATABASE_URL=sqlite:///tmp/build.db

WORKDIR /app/tyva-transit-backend

RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD sh -c "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}"

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY tyva-transit-backend/requirements.txt tyva-transit-backend/requirements.txt
RUN pip install --no-cache-dir -r tyva-transit-backend/requirements.txt

COPY tyva-transit-backend/ tyva-transit-backend/
COPY tyva-transit-ui/ tyva-transit-ui/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV FRONTEND_DIR=/app/tyva-transit-ui
ENV PYTHONUNBUFFERED=1

WORKDIR /app/tyva-transit-backend

# Только на этапе сборки — не попадает в runtime (ARG + однострочный RUN)
ARG SECRET_KEY=build-only-collectstatic
ARG DATABASE_URL=sqlite:///tmp/build.db
RUN SECRET_KEY="${SECRET_KEY}" DATABASE_URL="${DATABASE_URL}" python manage.py collectstatic --noinput

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]

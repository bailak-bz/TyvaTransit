-- pgAdmin → Query Tool → выполнить целиком (F5)
-- Если пользователь tyva уже есть — закомментируйте строку CREATE USER

CREATE USER tyva WITH PASSWORD 'tyva';

CREATE DATABASE tyva_transit
  OWNER tyva
  ENCODING 'UTF8';

GRANT ALL PRIVILEGES ON DATABASE tyva_transit TO tyva;

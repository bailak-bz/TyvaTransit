-- Выполните ОТДЕЛЬНО: pgAdmin → ПКМ на базе tyva_transit → Query Tool → F5

GRANT ALL ON SCHEMA public TO tyva;
GRANT CREATE ON SCHEMA public TO tyva;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tyva;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tyva;

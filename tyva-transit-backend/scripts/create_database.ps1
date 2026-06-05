param(
    [Parameter(Mandatory = $true)]
    [string]$AdminPassword
)

$ErrorActionPreference = 'Stop'
$psql = 'D:\PostgreSQL\bin\psql.exe'

if (-not (Test-Path $psql)) {
    throw "psql не найден: $psql. Укажите путь к PostgreSQL в скрипте."
}

$env:PGPASSWORD = $AdminPassword

Write-Host 'Создаю пользователя tyva и базу tyva_transit...' -ForegroundColor Cyan

& $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -v ON_ERROR_STOP=1 -c @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tyva') THEN
    CREATE ROLE tyva WITH LOGIN PASSWORD 'tyva';
  END IF;
END
`$`$;
"@

$dbExists = & $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tyva_transit'"
if ($dbExists.Trim() -ne '1') {
    & $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE tyva_transit OWNER tyva;"
}

& $psql -U postgres -h 127.0.0.1 -p 5432 -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE tyva_transit TO tyva;"

& $psql -U postgres -h 127.0.0.1 -p 5432 -d tyva_transit -v ON_ERROR_STOP=1 -c @"
GRANT ALL ON SCHEMA public TO tyva;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tyva;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tyva;
"@

Write-Host 'Готово: база tyva_transit создана.' -ForegroundColor Green
Write-Host 'Дальше: python manage.py migrate && python manage.py seed_data' -ForegroundColor Yellow

Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

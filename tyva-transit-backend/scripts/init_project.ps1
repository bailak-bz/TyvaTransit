param(
    [Parameter(Mandatory = $true)]
    [string]$AdminPassword
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

& "$PSScriptRoot\create_database.ps1" -AdminPassword $AdminPassword

if (-not (Test-Path '.venv\Scripts\python.exe')) {
    python -m venv .venv
    .\.venv\Scripts\pip.exe install -r requirements.txt
}

if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
}

.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_data

Write-Host ''
Write-Host 'Проект готов. Запуск: python manage.py runserver' -ForegroundColor Green
Write-Host 'Админка: http://127.0.0.1:8000/admin/ (создайте superuser: python manage.py createsuperuser)' -ForegroundColor Yellow

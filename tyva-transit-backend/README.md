# ТываТранзит — бэкенд (Django + DRF + PostgreSQL)

Сайт бронирования групповых транзитов из Кызыла. Оплата — **заглушка** (деньги не списываются). Билеты отправляются на **реальный email** пассажира.

## Структура проекта

```
tyva-transit/
├── tyva-transit-backend/   ← этот репозиторий (Django API + админка)
├── tyva-transit-ui/        ← HTML/CSS/JS макет (фронт)
└── tyva-transit.code-workspace   ← откройте в VS Code
```

## Быстрый старт в VS Code

1. Откройте **`tyva-transit.code-workspace`** в VS Code (File → Open Workspace from File).
2. Установите рекомендуемые расширения (Python, Pylance, Django).
3. В терминале VS Code (`backend`):

```powershell
cd tyva-transit-backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

4. Запустите PostgreSQL:

```powershell
docker compose up -d
```

5. Миграции и тестовые данные:

```powershell
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
```

6. Запуск сервера (F5 → **Django: runserver** или):

```powershell
python manage.py runserver
```

7. Откройте в браузере **только этот адрес** (не файл .html двойным кликом):
   - Сайт: http://127.0.0.1:8000/
   - API: http://127.0.0.1:8000/api/trips/
   - Админка: http://127.0.0.1:8000/admin/

> **Chrome не работает, а VS Code работает?**  
> Скорее всего в Chrome открыт файл `index.html` напрямую (`file://`) или Live Server (`:5500`).  
> Сначала запустите `python manage.py runserver`, затем в Chrome откройте **http://127.0.0.1:8000/**  
> Live Server тоже можно — но Django-сервер на :8000 должен быть запущен.

## Настройка почты (обязательно для реальных билетов)

В файле `.env` укажите SMTP. Пример для Gmail:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=ваш@gmail.com
EMAIL_HOST_PASSWORD=пароль-приложения
DEFAULT_FROM_EMAIL=ТываТранзит <ваш@gmail.com>
```

Для Gmail: Google Account → Безопасность → **Пароли приложений**.

Пока почта не настроена, письма выводятся в **консоль терминала** (режим по умолчанию).

Опционально — копия заявок перевозчику:

```env
CARRIER_NOTIFY_EMAIL=dolaana@example.com
```

## Без Docker (SQLite для отладки)

В `.env`:

```env
DB_ENGINE=django.db.backends.sqlite3
```

## API

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/destinations/` | Направления |
| GET | `/api/trips/` | Рейсы (`?date_from=&available_only=yes`) |
| GET | `/api/trips/{id}/` | Рейс |
| POST | `/api/bookings/shared/` | Купить билет (заглушка оплаты + email) |
| POST | `/api/bookings/private/` | Личная заявка + email |
| GET | `/api/bookings/lookup/?code=&phone=` | Поиск билета |

### Пример: покупка билета

```json
POST /api/bookings/shared/
{
  "trip_id": 1,
  "seats": 2,
  "customer_name": "Олег",
  "phone": "+79991234567",
  "email": "oleg@mail.ru",
  "payment_method": "sbp"
}
```

## Админка

- Рейсы и направления — разделы **Рейсы** / **Направления**
- Личные заявки: выберите бронь → действие **«Подтвердить личную поездку и отправить билет»**
- Повторная отправка: **«Повторно отправить билет на email»**

## Задачи VS Code (Ctrl+Shift+P → Tasks: Run Task)

- PostgreSQL: docker up
- Django: migrate
- Django: seed data
- Django: createsuperuser

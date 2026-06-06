# Деплой ТываТранзит на Railway

Проект должен быть в **одном Git-репозитории** с такой структурой:

```
TyvaTransit/
├── tyva-transit-backend/    ← Django
├── tyva-transit-ui/         ← HTML/CSS/JS (сайт)
├── railway.toml
└── .gitignore
```

> **Важно:** не деплойте только папку `backend` — без `tyva-transit-ui` сайт не откроется.

---

## Шаг 1. Подготовка GitHub

1. Создайте репозиторий на [github.com](https://github.com) (например `tyva-transit`).
2. В папке проекта (`D:\VScode_Project\TyvaTransit`):

```powershell
git init
git add .
git commit -m "Initial commit: TyvaTransit"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/tyva-transit.git
git push -u origin main
```

**Не заливайте** файл `.env` — он в `.gitignore`.

---

## Шаг 2. Регистрация на Railway

1. Откройте [railway.app](https://railway.app)
2. Войдите через **GitHub**
3. **New Project** → **Deploy from GitHub repo**
4. Выберите репозиторий `tyva-transit`

Railway прочитает `railway.toml` в корне и сам соберёт проект.

---

## Шаг 3. PostgreSQL (обязательно)

1. В проекте Railway: **+ New** → **Database** → **PostgreSQL**
2. Откройте **Web-сервис** (не базу!) → вкладка **Variables**
3. **+ New Variable** → **Add Reference**
4. Выберите сервис **PostgreSQL** → переменную **`DATABASE_URL`**
5. Сохраните и **Redeploy** Web-сервис

Без этого приложение падает при `migrate` и healthcheck не проходит.

Проверка: в Variables Web-сервиса должна быть строка вида  
`DATABASE_URL = ${{Postgres.DATABASE_URL}}` (имя сервиса может отличаться).

---

## Шаг 4. Переменные окружения (Variables)

В сервисе Django добавьте:

| Переменная | Значение |
|------------|----------|
| `SECRET_KEY` | случайная строка 50+ символов |
| `DEBUG` | `False` |
| `EMAIL_BACKEND` | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | `smtp.gmail.com` (или mail.ru) |
| `EMAIL_PORT` | `587` |
| `EMAIL_USE_TLS` | `True` |
| `EMAIL_HOST_USER` | ваш email |
| `EMAIL_HOST_PASSWORD` | пароль приложения |
| `DEFAULT_FROM_EMAIL` | `TyvaTransit <ваш@email.com>` |

`RAILWAY_PUBLIC_DOMAIN` Railway подставит сам — для `ALLOWED_HOSTS` и CSRF.

Опционально:

```
ALLOWED_HOSTS=ваш-домен.up.railway.app
CSRF_TRUSTED_ORIGINS=https://ваш-домен.up.railway.app
```

---

## Шаг 5. Домен

1. Сервис Django → **Settings** → **Networking** → **Generate Domain**
2. Появится адрес вида `https://tyva-transit-production.up.railway.app`
3. Откройте его в браузере — должен открыться сайт

---

## Шаг 6. Первый запуск (данные и админ)

После успешного деплоя в Railway откройте **Shell** у Web-сервиса:

```bash
cd tyva-transit-backend
python manage.py seed_data
python manage.py createsuperuser
```

Админка: `https://ВАШ-ДОМЕН.up.railway.app/admin/`

---

## Шаг 7. Проверка

| URL | Что должно быть |
|-----|-----------------|
| `/` | главная страница |
| `/trips.html` | рейсы с API |
| `/api/trips/` | JSON с рейсами |
| `/admin/` | вход в админку |

Покупка билета → письмо на email (если SMTP настроен в Variables).

---

## Обновление сайта

После `git push` в `main` Railway пересоберёт проект автоматически.

```powershell
git add .
git commit -m "описание изменений"
git push
```

---

## Частые проблемы

### Healthcheck failed

1. Откройте **Deployments** → последний деплой → **View logs** (не Agent).
2. Ищите строки:
   - `ERROR: DATABASE_URL is not set` → привяжите PostgreSQL (шаг 3)
   - `ERROR: SECRET_KEY is not set` → добавьте SECRET_KEY
   - `migrate failed` → база не доступна; проверьте Reference на DATABASE_URL
   - `Frontend not found` → в репозитории нет `tyva-transit-ui`
3. Проверка вручную после деплоя: `https://ВАШ-ДОМЕН.up.railway.app/health/` → должно быть `{"status": "ok"}`
4. **Redeploy** с **Clear build cache** после исправления Variables.

### 502 / ошибка БД
- PostgreSQL добавлен и `DATABASE_URL` привязан к Web-сервису
- В логах build есть `migrate` без ошибок

### Сайт без стилей
- В репозитории должна быть папка `tyva-transit-ui` рядом с backend
- Пересоберите деплой

### Письма не приходят
- Проверьте Variables `EMAIL_*`
- Gmail: только **пароль приложения**, не обычный пароль

### Локально работает, на Railway нет
- `DEBUG=False` на проде — это нормально
- Открывайте только URL Railway, не `file://`

---

## Стоимость

Railway даёт бесплатные кредиты (~5$ в месяц на trial). Для диплома и небольшого трафика обычно хватает. Следите за **Usage** в dashboard.

---

## Краткий чеклист

- [ ] GitHub репозиторий с `backend` + `tyva-transit-ui`
- [ ] Railway проект из GitHub
- [ ] PostgreSQL + `DATABASE_URL`
- [ ] `SECRET_KEY`, `DEBUG=False`, почта
- [ ] Public Domain сгенерирован
- [ ] `seed_data` + `createsuperuser` в Shell
- [ ] Сайт открывается по HTTPS

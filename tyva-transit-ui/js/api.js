(function (global) {
  const BACKEND_URL = (global.TYVA_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  function resolveApiBase() {
    if (global.TYVA_API_BASE) return String(global.TYVA_API_BASE).replace(/\/$/, '');
    const { protocol, port } = global.location;
    // Локальная вёрстка без Django: file:// или Live Server
    if (protocol === 'file:' || port === '5500' || port === '5501' || port === '5173') {
      return `${BACKEND_URL}/api`;
    }
    // Django runserver и прод (Railway) — API на том же домене
    return '/api';
  }

  const API_BASE = resolveApiBase();
  let csrfToken = '';

  function showApiHint(message) {
    if (global.location.protocol !== 'file:') return;
    alert(message || `Откройте сайт через сервер: ${BACKEND_URL}`);
  }

  async function refreshCsrfToken() {
    const response = await fetch(`${API_BASE}/auth/csrf/`, { credentials: 'same-origin' });
    const data = await response.json().catch(() => ({}));
    csrfToken = data.csrfToken || getCookie('csrftoken') || '';
    return csrfToken;
  }

  async function request(path, options = {}, retry = true) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (method !== 'GET' && method !== 'HEAD') {
      if (!csrfToken && !getCookie('csrftoken')) {
        await refreshCsrfToken();
      }
      const token = csrfToken || getCookie('csrftoken');
      if (token) headers['X-CSRFToken'] = token;
    }

    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        credentials: 'same-origin',
        headers,
        ...options,
      });
    } catch (err) {
      showApiHint();
      throw new Error(`Сервер не отвечает (${API_BASE}). Запустите: python manage.py runserver`);
    }

    const isJson = (response.headers.get('content-type') || '').includes('json');
    const data = isJson ? await response.json().catch(() => ({})) : {};

    if (response.status === 403 && method !== 'GET' && method !== 'HEAD' && retry) {
      await refreshCsrfToken();
      return request(path, options, false);
    }

    if (!response.ok) {
      if (isJson) {
        const message = data.detail || data.error || formatErrors(data) || 'Ошибка запроса';
        const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
        err.status = response.status;
        throw err;
      }
      if (response.status === 403) {
        throw new Error('Ошибка CSRF. Обновите страницу и попробуйте снова.');
      }
      throw new Error(`Ошибка сервера (${response.status})`);
    }
    return data;
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
    }
    return '';
  }

  function formatErrors(data) {
    if (!data || typeof data !== 'object') return '';
    const messages = [];
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) messages.push(`${key}: ${value.join(', ')}`);
      else if (typeof value === 'string') messages.push(value);
    });
    return messages.join('\n');
  }

  global.TyvaApiConfig = { base: API_BASE, backend: BACKEND_URL };

  function tripSeatsAvailable(trip) {
    const total = Number(trip.seats_total);
    const booked = Number(trip.seats_booked);
    if (!Number.isNaN(total) && !Number.isNaN(booked)) {
      return Math.max(0, total - booked);
    }
    const available = Number(trip.seats_available);
    return Number.isNaN(available) ? 0 : Math.max(0, available);
  }

  function seatsBadge(available) {
    const n = Math.max(0, Number(available) || 0);
    if (n === 0) return { className: 'badge badge-full', text: 'Мест нет' };
    if (n <= 3) return { className: 'badge badge-low', text: 'Мало мест' };
    return { className: 'badge badge-ok', text: 'Есть места' };
  }

  function seatsLabel(available, total) {
    const n = Math.max(0, Number(available) || 0);
    const t = Number(total) || 0;
    if (n === 0) return `Мест нет · 0 из ${t}`;
    return `Свободно ${n} из ${t}`;
  }

  global.TyvaSeats = { badge: seatsBadge, label: seatsLabel, available: tripSeatsAvailable };

  function formatTripDate(iso, withWeekday) {
    const opts = withWeekday
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(iso).toLocaleString('ru-RU', opts);
  }

  function renderTripCard(trip, layout) {
    const available = tripSeatsAvailable(trip);
    const badge = seatsBadge(available);
    const buyBtn = available > 0
      ? `<a href="book.html?trip=${trip.id}" class="btn btn-primary btn-sm">Купить билет</a>`
      : '';
    const duration = trip.duration_hours ? ` · ~${trip.duration_hours} ч в пути` : '';
    const meeting = layout === 'grid' ? `<p class="card-meta">Сбор: ${trip.meeting_point}</p>` : '';
    const dateLabel = layout === 'grid'
      ? formatTripDate(trip.departure_at, true)
      : formatTripDate(trip.departure_at, false).replace(',', ' · выезд');

    const body = `
      <article class="card">
        <div class="card-body">
          <span class="${badge.className}">${badge.text}</span>
          <h3 style="margin: 0.5rem 0 0;">${trip.route_label}</h3>
          <p class="card-meta">${dateLabel}</p>
          ${meeting}
          <p class="card-price">${Number(trip.price_per_seat).toLocaleString('ru-RU')} ₽ <span>/ место</span></p>
          <p class="card-meta">${seatsLabel(available, trip.seats_total)}${duration}</p>
          <div class="card-actions">
            <a href="trip.html?trip=${trip.id}" class="btn btn-secondary btn-sm">Подробнее</a>
            ${buyBtn}
          </div>
        </div>
      </article>`;

    return layout === 'slide' ? `<div class="swipe-slide">${body}</div>` : body;
  }

  global.TyvaTrips = { renderCard: renderTripCard, formatDate: formatTripDate };

  global.TyvaApi = {
    ensureCsrf: () => refreshCsrfToken(),
    register: (payload) => request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login/', { method: 'POST', body: JSON.stringify(payload) }),
    logout: () => request('/auth/logout/', { method: 'POST', body: '{}' }),
    getMe: async () => {
      try {
        return await request('/auth/me/');
      } catch (err) {
        if (err.status === 401 || err.status === 403) return null;
        throw err;
      }
    },
    updateProfile: (payload) => request('/auth/me/', { method: 'PATCH', body: JSON.stringify(payload) }),
    getMyBookings: () => request('/auth/bookings/'),
    getDestinations: () => request('/destinations/'),
    getTrips: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/trips/${query ? `?${query}` : ''}`);
    },
    getTrip: (id) => request(`/trips/${id}/`),
    bookShared: (payload) => request('/bookings/shared/', { method: 'POST', body: JSON.stringify(payload) }),
    bookPrivate: (payload) => request('/bookings/private/', { method: 'POST', body: JSON.stringify(payload) }),
    lookupBooking: (code, phone) => request(`/bookings/lookup/?code=${encodeURIComponent(code)}&phone=${encodeURIComponent(phone)}`),
  };
})(window);

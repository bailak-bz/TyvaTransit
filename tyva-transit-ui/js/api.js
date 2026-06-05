(function (global) {
  const BACKEND_URL = (global.TYVA_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

  function resolveApiBase() {
    if (global.TYVA_API_BASE) return String(global.TYVA_API_BASE).replace(/\/$/, '');
    const { protocol, hostname, port } = global.location;
    // Файл открыт двойным кликом (file://) или Live Server — API на Django :8000
    if (protocol === 'file:' || port === '5500' || port === '5501' || port === '5173') {
      return `${BACKEND_URL}/api`;
    }
    // Сайт открыт через python manage.py runserver
    if (port === '8000' || (!port && (hostname === '127.0.0.1' || hostname === 'localhost'))) {
      return '/api';
    }
    return `${BACKEND_URL}/api`;
  }

  const API_BASE = resolveApiBase();

  function showApiHint() {
    const banner = document.querySelector('.mockup-banner');
    if (!banner) return;
    banner.textContent = `Нет связи с сервером. Запустите: python manage.py runserver и откройте ${BACKEND_URL}`;
    banner.style.background = '#f8d7da';
    banner.style.color = '#842029';
  }

  if (global.location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', showApiHint);
  }

  async function request(path, options = {}) {
    let response;
    try {
      response = await fetch(`${API_BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options,
      });
    } catch (err) {
      showApiHint();
      throw new Error(`Сервер не отвечает (${API_BASE}). Запустите: python manage.py runserver`);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data.detail || data.error || 'Ошибка запроса';
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }
    return data;
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

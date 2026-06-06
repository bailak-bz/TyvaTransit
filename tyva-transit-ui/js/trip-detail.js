(function () {
  const tripId = new URLSearchParams(window.location.search).get('trip');
  if (!tripId) {
    window.location.replace('trips.html');
    return;
  }

  const title = document.querySelector('.detail-hero h1');
  const heroMeta = document.querySelector('.detail-hero p');
  const seatsBadgeEl = document.querySelector('[data-seats-badge]');
  const breadcrumbLast = document.querySelector('.breadcrumb');
  const priceEl = document.querySelector('.detail-sidebar .card-price');
  const seatsMeta = document.querySelector('[data-trip-seats-meta]');
  const seatsBar = document.querySelector('.seats-bar-fill');
  const buyBtn = document.querySelector('.detail-sidebar .btn-primary');

  TyvaApi.getTrip(tripId).then((trip) => {
    const available = TyvaSeats.available(trip);
    const badge = TyvaSeats.badge(available);
    const date = new Date(trip.departure_at).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    if (title) title.textContent = trip.route_label;
    if (heroMeta) heroMeta.textContent = date;
    if (seatsBadgeEl) {
      seatsBadgeEl.className = badge.className;
      seatsBadgeEl.textContent = badge.text;
    }
    if (breadcrumbLast) {
      breadcrumbLast.innerHTML = `<a href="index.html">Главная</a> / <a href="trips.html">Рейсы</a> / ${trip.route_label}`;
    }
    if (priceEl) {
      priceEl.innerHTML = `${Number(trip.price_per_seat).toLocaleString('ru-RU')} ₽ <span style="font-size: 0.85rem; font-weight: 400;">/ место</span>`;
    }
    if (seatsMeta) seatsMeta.textContent = TyvaSeats.label(available, trip.seats_total);
    if (seatsBar) seatsBar.style.width = `${Math.round((trip.seats_booked / trip.seats_total) * 100)}%`;

    if (buyBtn) {
      if (available === 0) {
        buyBtn.textContent = 'Мест нет';
        buyBtn.classList.remove('btn-primary');
        buyBtn.classList.add('btn-secondary');
        buyBtn.removeAttribute('href');
        buyBtn.style.pointerEvents = 'none';
        buyBtn.style.opacity = '0.6';
      } else {
        buyBtn.href = `book.html?trip=${trip.id}`;
        buyBtn.textContent = 'Купить билет';
      }
    }
  }).catch((err) => {
    alert(`Ошибка: ${err.message}`);
    if (seatsBadgeEl) {
      seatsBadgeEl.className = 'badge badge-full';
      seatsBadgeEl.textContent = 'Нет данных';
    }
  });
})();

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
  const infoList = document.querySelector('[data-trip-info]');
  const lakeLink = document.querySelector('[data-lake-link]');

  TyvaApi.getTrip(tripId).then((trip) => {
    const available = TyvaSeats.available(trip);
    const badge = TyvaSeats.badge(available);
    const date = TyvaFormat.date(trip.departure_at, false);
    const dest = trip.destination || {};
    const slug = dest.slug || '';

    document.title = `${trip.route_label} — ТываТранзит`;

    if (title) title.textContent = trip.route_label;
    if (heroMeta) heroMeta.textContent = `${date} · выезд`;
    if (seatsBadgeEl) {
      seatsBadgeEl.className = badge.className;
      seatsBadgeEl.textContent = badge.text;
    }
    if (breadcrumbLast) {
      breadcrumbLast.innerHTML = `<a href="index.html">Главная</a> / <a href="trips.html">Рейсы</a> / ${trip.route_label}`;
    }
    if (priceEl) {
      priceEl.innerHTML = `${TyvaFormat.money(trip.price_per_seat)} <span>/ место</span>`;
    }
    if (seatsMeta) seatsMeta.textContent = TyvaSeats.label(available, trip.seats_total);
    if (seatsBar && trip.seats_total) {
      seatsBar.style.width = `${Math.round((trip.seats_booked / trip.seats_total) * 100)}%`;
    }

    if (infoList) {
      infoList.innerHTML = `
        <li><strong>Откуда</strong> <span>г. Кызыл${trip.meeting_point ? `, ${trip.meeting_point}` : ''}</span></li>
        <li><strong>Куда</strong> <span>${dest.name || trip.route_label.split('→').pop().trim()}</span></li>
        <li><strong>В пути</strong> <span>${TyvaFormat.duration(trip.duration_hours)}</span></li>
        <li><strong>Вместимость</strong> <span>${trip.seats_total} пассажиров</span></li>
        <li><strong>Багаж</strong> <span>1 сумка на человека, крупный багаж — по телефону</span></li>
        <li><strong>Минимум группы</strong> <span>Рейс состоится, если куплено хотя бы 3 билета</span></li>`;
    }

    if (lakeLink) {
      const lakePage = TyvaLakes.pageForSlug(slug);
      if (lakePage && dest.name) {
        lakeLink.href = lakePage;
        lakeLink.textContent = dest.name.toLowerCase().includes('озеро')
          ? `О ${dest.name}`
          : `О озере ${dest.name}`;
        lakeLink.hidden = false;
      } else {
        lakeLink.hidden = true;
      }
    }

    if (buyBtn) {
      if (available === 0) {
        buyBtn.textContent = 'Мест нет';
        buyBtn.classList.remove('btn-primary');
        buyBtn.classList.add('btn-secondary', 'is-disabled');
        buyBtn.removeAttribute('href');
      } else {
        buyBtn.href = `book.html?trip=${trip.id}`;
        buyBtn.textContent = 'Купить билет';
        buyBtn.classList.add('btn-primary');
        buyBtn.classList.remove('btn-secondary', 'is-disabled');
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

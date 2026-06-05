(function () {
  const params = new URLSearchParams(window.location.search);
  const tripId = params.get('trip');
  const form = document.querySelector('form');
  if (!form || !tripId) return;

  const seatsInput = form.querySelector('input[type="number"]');
  const counter = form.querySelector('.counter');
  const summarySeats = form.querySelector('.order-summary dd:nth-of-type(2)');
  const summaryTotal = form.querySelector('.order-summary .total + dd');
  const priceEl = form.querySelector('.order-summary dd:first-of-type');
  const submitBtn = form.querySelector('button[type="submit"]');
  const lead = document.querySelector('.page-lead');
  const banner = document.querySelector('.mockup-banner');

  let trip = null;

  function formatMoney(value) {
    return `${Number(value).toLocaleString('ru-RU')} ₽`;
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function updateSummary() {
    if (!trip) return;
    const seats = Number(seatsInput.value);
    const total = Number(trip.price_per_seat) * seats;
    if (summarySeats) summarySeats.textContent = seats;
    if (summaryTotal) summaryTotal.textContent = formatMoney(total);
    if (submitBtn) submitBtn.textContent = `Оплатить ${formatMoney(total)}`;
    const available = TyvaSeats.available(trip);
    seatsInput.max = available;
    const hint = form.querySelector('.form-hint');
    if (hint) {
      hint.textContent = available === 0
        ? 'Мест нет — выберите другой рейс'
        : `Свободно ${available} мест — после оплаты они сразу закрепляются за вами`;
    }
    if (available === 0) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Мест нет';
    }
  }

  if (counter && seatsInput) {
    counter.addEventListener('click', (event) => {
      const btn = event.target.closest('button');
      if (!btn) return;
      const value = Number(seatsInput.value);
      const max = Number(seatsInput.max || 12);
      if (btn.getAttribute('aria-label') === 'Увеличить' && value < max) seatsInput.value = value + 1;
      if (btn.getAttribute('aria-label') === 'Уменьшить' && value > 1) seatsInput.value = value - 1;
      updateSummary();
    });
  }

  TyvaApi.getTrip(tripId).then((data) => {
    trip = data;
    if (banner) banner.textContent = 'Демо-оплата: деньги не списываются. Билет придёт на email.';
    if (lead) {
      lead.innerHTML = `
        <span class="badge badge-shared">Общий рейс</span>
        ${trip.route_label} · ${formatDate(trip.departure_at)} — оплата сразу, без заявки и ожидания звонка.
        <a href="private-book.html">Нужна машина только для вашей группы?</a>`;
    }
    if (priceEl) priceEl.textContent = formatMoney(trip.price_per_seat);
    if (TyvaSeats.available(trip) === 0 && banner) {
      banner.textContent = 'На этот рейс мест нет. Вернитесь в расписание и выберите другой выезд.';
    }
    updateSummary();
  }).catch((err) => {
    if (banner) banner.textContent = `Ошибка загрузки рейса: ${err.message}`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!trip) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Оплата…';
    try {
      const paymentMethod = form.querySelector('input[name="pay"]:checked')?.value || 'sbp';
      const result = await TyvaApi.bookShared({
        trip_id: Number(tripId),
        seats: Number(seatsInput.value),
        customer_name: form.querySelector('#name').value.trim(),
        phone: form.querySelector('#phone').value.trim(),
        email: form.querySelector('#email').value.trim(),
        payment_method: paymentMethod,
      });
      sessionStorage.setItem('tyva_last_booking', JSON.stringify(result.booking));
      sessionStorage.setItem('tyva_email_sent', result.email_sent ? '1' : '0');
      if (result.email_error) {
        sessionStorage.setItem('tyva_email_error', result.email_error);
      } else {
        sessionStorage.removeItem('tyva_email_error');
      }
      window.location.href = `success.html?code=${encodeURIComponent(result.booking.code)}`;
    } catch (err) {
      alert(err.message);
      submitBtn.disabled = false;
      updateSummary();
    }
  });
})();

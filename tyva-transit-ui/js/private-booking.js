(function () {
  const form = document.querySelector('#private-book-form');
  const submitBtn = document.querySelector('#private-submit-btn');
  if (!form || !submitBtn) return;

  const routeSelect = form.querySelector('#route');
  const dateInput = form.querySelector('#date-out');
  const dateBackInput = form.querySelector('#date-back');
  const timeSelect = form.querySelector('#time');
  const seatsInput = form.querySelector('#seats');
  const counter = form.querySelector('.counter');
  const summarySeats = form.querySelector('[data-summary-seats]');
  const summaryTotal = form.querySelector('[data-summary-total]');

  const PRICES = { bus_12: 18000, minivan_8: 14000 };
  let destinations = [];

  function todayISO() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function addDaysISO(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function formatMoney(value) {
    return `${Number(value).toLocaleString('ru-RU')} ₽`;
  }

  function getVehicleType() {
    const vehicle = form.querySelector('input[name="vehicle"]:checked')?.value || '12';
    return vehicle === '8' ? 'minivan_8' : 'bus_12';
  }

  function estimateTotal() {
    const vehicleType = getVehicleType();
    const seats = Number(seatsInput.value);
    let base = vehicleType === 'minivan_8' ? PRICES.minivan_8 : PRICES.bus_12;
    if (seats > 8 && vehicleType === 'minivan_8') base = PRICES.bus_12;
    return base * 2;
  }

  function updateSummary() {
    const seats = Number(seatsInput.value);
    if (summarySeats) summarySeats.textContent = `${seats} чел.`;
    if (summaryTotal) summaryTotal.textContent = formatMoney(estimateTotal());
  }

  function initDates() {
    const today = todayISO();
    if (dateInput) {
      dateInput.min = today;
      if (!dateInput.value || dateInput.value < today) dateInput.value = today;
    }
    if (dateBackInput) {
      const out = dateInput?.value || today;
      dateBackInput.min = out;
      if (!dateBackInput.value || dateBackInput.value < out) {
        dateBackInput.value = addDaysISO(out, 2);
      }
    }
  }

  function isOutboundDestination(d) {
    if (d.slug === 'other') return true;
    if (String(d.slug || '').endsWith('-back')) return false;
    const label = String(d.route_label || '');
    return !label.includes('→ Кызыл');
  }

  function prefillUser(user) {
    if (!user) return;
    const nameEl = form.querySelector('#name');
    const phoneEl = form.querySelector('#phone');
    const emailEl = form.querySelector('#email');
    if (nameEl && !nameEl.value) nameEl.value = user.display_name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
    if (emailEl && !emailEl.value) emailEl.value = user.email || '';
  }

  function fillRoutes(items) {
    destinations = items.filter(isOutboundDestination);
    destinations.sort((a, b) => {
      if (a.slug === 'other') return 1;
      if (b.slug === 'other') return -1;
      return (a.route_label || '').localeCompare(b.route_label || '', 'ru');
    });

    routeSelect.innerHTML = '';
    if (!destinations.length) {
      routeSelect.innerHTML = '<option value="">Нет направлений — обновите данные на сервере</option>';
      return;
    }
    destinations.forEach((dest, index) => {
      const option = document.createElement('option');
      option.value = dest.id;
      option.textContent = dest.route_label;
      option.dataset.slug = dest.slug || '';
      if (index === 0) option.selected = true;
      routeSelect.appendChild(option);
    });
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

  dateInput?.addEventListener('change', () => {
    if (!dateBackInput || !dateInput.value) return;
    dateBackInput.min = dateInput.value;
    if (dateBackInput.value < dateInput.value) {
      dateBackInput.value = addDaysISO(dateInput.value, 2);
    }
  });

  form.querySelectorAll('input[name="vehicle"]').forEach((el) => {
    el.addEventListener('change', updateSummary);
  });

  document.addEventListener('tyva:auth', (event) => prefillUser(event.detail.user));
  if (window.TyvaApi) {
    TyvaApi.getMe().then(prefillUser).catch(() => {});
  }

  TyvaApi.getDestinations()
    .then(fillRoutes)
    .catch(() => {
      routeSelect.innerHTML = '<option value="">Не удалось загрузить направления</option>';
    });

  form.addEventListener('submit', (event) => event.preventDefault());

  submitBtn.addEventListener('click', async () => {
    if (!window.TyvaApi || typeof TyvaApi.bookPrivate !== 'function') {
      alert('Сайт не обновился. Нажмите Ctrl+F5 и попробуйте снова.');
      return;
    }

    const user = await TyvaApi.getMe();
    if (!user) {
      window.location.href = `login.html?next=${encodeURIComponent('private-book.html')}`;
      return;
    }

    const destinationId = Number(routeSelect.value);
    const selected = destinations.find((d) => d.id === destinationId);
    if (!destinationId || !selected) {
      alert('Выберите направление');
      return;
    }

    if (!form.querySelector('#confirm-private').checked) {
      alert('Подтвердите, что заказываете личную поездку для своей группы');
      return;
    }

    const timeValue = timeSelect.value;
    let departureTime = timeValue;
    let comment = form.querySelector('#comment').value.trim();

    if (timeValue === 'other' && !comment) {
      alert('Укажите желаемое время в комментарии');
      return;
    }
    if (timeValue === 'other') {
      departureTime = 'Другое (см. комментарий)';
    }

    if (selected.slug === 'other' && !comment) {
      alert('Укажите нужное направление в комментарии');
      return;
    }

    if (dateBackInput.value < dateInput.value) {
      alert('Дата обратно не может быть раньше даты выезда');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    try {
      const result = await TyvaApi.bookPrivate({
        destination_id: destinationId,
        departure_date: dateInput.value,
        departure_time: departureTime,
        return_date: dateBackInput.value,
        round_trip: true,
        vehicle_type: getVehicleType(),
        seats: Number(seatsInput.value),
        customer_name: form.querySelector('#name').value.trim(),
        phone: form.querySelector('#phone').value.trim(),
        email: form.querySelector('#email').value.trim(),
        comment,
      });
      sessionStorage.setItem('tyva_last_booking', JSON.stringify(result.booking));
      sessionStorage.setItem('tyva_email_sent', result.email_sent ? '1' : '0');
      if (result.email_error) {
        sessionStorage.setItem('tyva_email_error', result.email_error);
      } else {
        sessionStorage.removeItem('tyva_email_error');
      }
      const appCode = result.booking.application_code || result.booking.public_number || result.booking.code;
      window.location.href = `private-success.html?code=${encodeURIComponent(appCode)}`;
    } catch (err) {
      alert(err.message || 'Не удалось отправить заявку');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку на личную поездку';
    }
  });

  initDates();
  updateSummary();
})();

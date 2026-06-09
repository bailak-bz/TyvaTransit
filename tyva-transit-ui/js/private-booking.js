(function () {
  const form = document.querySelector('#private-book-form');
  const submitBtn = document.querySelector('#private-submit-btn');
  if (!form || !submitBtn) return;

  const routeSelect = form.querySelector('#route');
  const dateInput = form.querySelector('#date-out');
  const timeSelect = form.querySelector('#time');
  const seatsInput = form.querySelector('#seats');
  const counter = form.querySelector('.counter');
  const summarySeats = form.querySelector('[data-summary-seats]');
  const summaryTotal = form.querySelector('[data-summary-total]');

  const PRICES = { bus_12: 18000, minivan_8: 14000 };

  function todayISO() {
    const d = new Date();
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

  function initDate() {
    const today = todayISO();
    if (dateInput) {
      dateInput.min = today;
      if (!dateInput.value || dateInput.value < today) dateInput.value = today;
    }
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

  form.querySelectorAll('input[name="vehicle"]').forEach((el) => {
    el.addEventListener('change', updateSummary);
  });

  document.addEventListener('tyva:auth', (event) => prefillUser(event.detail.user));
  if (window.TyvaApi) {
    TyvaApi.getMe().then(prefillUser).catch(() => {});
  }

  TyvaApi.getDestinations().then((items) => {
    const outbound = items.filter((d) => d.route_label.startsWith('Кызыл →'));
    routeSelect.innerHTML = '';
    if (!outbound.length) {
      routeSelect.innerHTML = '<option value="">Нет направлений</option>';
      return;
    }
    outbound.forEach((dest, index) => {
      const option = document.createElement('option');
      option.value = dest.id;
      option.textContent = dest.route_label;
      if (index === 0) option.selected = true;
      routeSelect.appendChild(option);
    });
  }).catch((err) => {
    routeSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
    console.error(err);
  });

  form.addEventListener('submit', (event) => event.preventDefault());

  submitBtn.addEventListener('click', async () => {
    if (!window.TyvaApi || typeof TyvaApi.bookPrivate !== 'function') {
      alert('Сайт не обновился. Нажмите Ctrl+F5 и попробуйте снова.');
      return;
    }

    const destinationId = Number(routeSelect.value);
    if (!destinationId) {
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

    if (timeValue === 'other') {
      if (!comment) {
        alert('Укажите желаемое время в комментарии');
        return;
      }
      departureTime = 'Другое (см. комментарий)';
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    try {
      const result = await TyvaApi.bookPrivate({
        destination_id: destinationId,
        departure_date: dateInput.value,
        departure_time: departureTime,
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
      window.location.href = `private-success.html?code=${encodeURIComponent(result.booking.code)}`;
    } catch (err) {
      alert(err.message || 'Не удалось отправить заявку');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку на личную поездку';
    }
  });

  initDate();
  updateSummary();
})();

(function () {
  const form = document.querySelector('form');
  if (!form) return;

  const routeSelect = form.querySelector('#route');
  const submitBtn = form.querySelector('button[type="submit"]');
  let destinations = [];

  function prefillUser(user) {
    if (!user) return;
    const nameEl = form.querySelector('#name');
    const phoneEl = form.querySelector('#phone');
    const emailEl = form.querySelector('#email');
    if (nameEl && !nameEl.value) nameEl.value = user.display_name || '';
    if (phoneEl && !phoneEl.value) phoneEl.value = user.phone || '';
    if (emailEl && !emailEl.value) emailEl.value = user.email || '';
  }

  document.addEventListener('tyva:auth', (event) => prefillUser(event.detail.user));
  TyvaApi.ensureCsrf().then(() => TyvaApi.getMe()).then(prefillUser).catch(() => {});

  TyvaApi.getDestinations().then((items) => {
    destinations = items.filter((d) => !d.route_label.startsWith('Чагытай →'));
    routeSelect.innerHTML = '<option value="">Выберите</option>';
    destinations.forEach((dest, index) => {
      const option = document.createElement('option');
      option.value = dest.id;
      option.textContent = dest.route_label;
      if (index === 0) option.selected = true;
      routeSelect.appendChild(option);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const destinationId = Number(routeSelect.value);
    if (!destinationId) {
      alert('Выберите направление');
      return;
    }

    const vehicle = form.querySelector('input[name="vehicle"]:checked')?.value || 'bus_12';
    const vehicleType = vehicle === '8' ? 'minivan_8' : 'bus_12';

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка…';

    try {
      const result = await TyvaApi.bookPrivate({
        destination_id: destinationId,
        departure_date: form.querySelector('#date-out').value,
        departure_time: form.querySelector('#time').value,
        return_date: form.querySelector('#date-back').value || null,
        round_trip: form.querySelector('input[name="roundtrip"]').checked,
        vehicle_type: vehicleType,
        seats: Number(form.querySelector('input[type="number"]').value),
        customer_name: form.querySelector('#name').value.trim(),
        phone: form.querySelector('#phone').value.trim(),
        email: form.querySelector('#email').value.trim(),
        comment: form.querySelector('#comment').value.trim(),
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
      alert(err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку на личную поездку';
    }
  });
})();

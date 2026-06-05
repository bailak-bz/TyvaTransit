(function () {
  const form = document.querySelector('.form-panel form');
  const resultBox = document.querySelector('.check-result');
  if (!form || !resultBox) return;

  const codeInput = form.querySelector('#code');
  const phoneInput = form.querySelector('#phone');
  const findBtn = form.querySelector('button');

  resultBox.style.display = 'none';

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function render(booking) {
    const badge = booking.status === 'paid' || booking.status === 'confirmed'
      ? '<span class="badge badge-ok">Оплачено</span>'
      : '<span class="badge badge-private">Ожидает</span>';
    const departure = booking.departure_at
      ? formatDate(booking.departure_at)
      : [booking.departure_date, booking.departure_time].filter(Boolean).join(', ');

    resultBox.innerHTML = `
      <div class="detail-content">
        <h2 style="margin-top: 0;">Ваш билет</h2>
        <p>${badge}</p>
        <ul class="info-list">
          <li><strong>Номер</strong> <span>${booking.code}</span></li>
          <li><strong>Тип</strong> <span>${booking.booking_type_display}</span></li>
          <li><strong>Рейс</strong> <span>${booking.route_label}</span></li>
          <li><strong>Выезд</strong> <span>${departure}</span></li>
          <li><strong>Сбор</strong> <span>${booking.meeting_point}</span></li>
          <li><strong>Билетов</strong> <span>${booking.seats}</span></li>
          <li><strong>Сумма</strong> <span>${Number(booking.total_amount).toLocaleString('ru-RU')} ₽</span></li>
        </ul>
      </div>`;
    resultBox.style.display = '';
  }

  findBtn.addEventListener('click', async () => {
    try {
      const booking = await TyvaApi.lookupBooking(codeInput.value.trim(), phoneInput.value.trim());
      render(booking);
    } catch (err) {
      alert(err.message);
      resultBox.style.display = 'none';
    }
  });
})();

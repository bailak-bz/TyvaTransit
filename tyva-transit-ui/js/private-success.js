(function () {
  const raw = sessionStorage.getItem('tyva_last_booking');
  if (!raw) return;

  let booking;
  try {
    booking = JSON.parse(raw);
  } catch {
    return;
  }

  const codeEl = document.querySelector('[data-application-code]');
  const list = document.querySelector('[data-success-info]');
  const note = document.querySelector('[data-success-note]');
  const emailSent = sessionStorage.getItem('tyva_email_sent') !== '0';
  const emailError = sessionStorage.getItem('tyva_email_error');

  const applicationNumber = booking.application_code || booking.public_number || booking.code;

  if (codeEl) codeEl.textContent = applicationNumber || '—';

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  if (list) {
    const departure = booking.departure_at
      ? formatDate(booking.departure_at)
      : [booking.departure_date, booking.departure_time].filter(Boolean).join(', ');
    list.innerHTML = `
      <li><strong>Маршрут</strong> <span>${booking.route_label || '—'}</span></li>
      <li><strong>Выезд</strong> <span>${departure}</span></li>
      <li><strong>Сумма</strong> <span>${Number(booking.total_amount).toLocaleString('ru-RU')} ₽</span></li>
      <li><strong>Статус</strong> <span><span class="badge badge-private">Ожидает подтверждения</span></span></li>`;
  }

  if (note) {
    const email = booking.email || 'ваш email';
    if (emailSent) {
      note.textContent = `После подтверждения заявки реквизиты для оплаты придут на ${email} или появятся в личном кабинете в разделе «Активные билеты».`;
    } else {
      note.innerHTML = `Заявка сохранена. После подтверждения реквизиты появятся в разделе «Активные билеты».${emailError ? `<br><small style="color:var(--muted)">${emailError}</small>` : ''}`;
    }
  }
})();

(function () {
  const codeFromUrl = new URLSearchParams(window.location.search).get('code');
  const raw = sessionStorage.getItem('tyva_last_booking');

  const codeEl = document.querySelector('.booking-code');
  const list = document.querySelector('.info-list');
  const note = document.querySelector('.success-box p:last-of-type');
  const myTicketsBtn = document.querySelector('.success-actions a');

  function renderBooking(booking) {
    if (codeEl) codeEl.textContent = booking.code || booking.public_number || codeFromUrl || '—';

    if (list) {
      const departure = booking.departure_at
        ? TyvaFormat.date(booking.departure_at)
        : [booking.departure_date, booking.departure_time].filter(Boolean).join(', ') || '—';
      list.innerHTML = `
        <li><strong>Рейс</strong> <span>${booking.route_label || '—'}</span></li>
        <li><strong>Выезд</strong> <span>${departure}</span></li>
        <li><strong>Сбор</strong> <span>${booking.meeting_point || '—'}</span></li>
        <li><strong>Билетов</strong> <span>${booking.seats || '—'}</span></li>
        <li><strong>Оплачено</strong> <span>${TyvaFormat.money(booking.total_amount)}</span></li>
        <li><strong>Статус</strong> <span><span class="badge badge-ok">${booking.status_display || 'Оплачено'}</span></span></li>`;
    }

    const emailSent = sessionStorage.getItem('tyva_email_sent') !== '0';
    const emailError = sessionStorage.getItem('tyva_email_error');
    if (note) {
      if (emailSent && booking.email) {
        note.textContent = `Билет отправлен на ${booking.email}. Покажите номер билета при посадке.`;
      } else if (booking.email) {
        note.innerHTML = `Письмо на <strong>${booking.email}</strong> не отправлено. Сохраните номер <strong>${booking.code}</strong> — он есть на странице «Мои билеты».${emailError ? `<br><small class="text-muted">${emailError}</small>` : ''}`;
      }
    }
  }

  if (myTicketsBtn) {
    myTicketsBtn.href = 'account.html';
    myTicketsBtn.textContent = 'Мои билеты';
  }

  let booking = null;
  if (raw) {
    try {
      booking = JSON.parse(raw);
    } catch (e) {
      sessionStorage.removeItem('tyva_last_booking');
    }
  }

  if (booking) {
    renderBooking(booking);
    return;
  }

  if (codeFromUrl && codeEl) codeEl.textContent = codeFromUrl;

  const phone = sessionStorage.getItem('tyva_lookup_phone');
  if (codeFromUrl && phone && window.TyvaApi) {
    TyvaApi.lookupBooking(codeFromUrl, phone)
      .then((data) => renderBooking(data.booking || data))
      .catch(() => {});
  }
})();

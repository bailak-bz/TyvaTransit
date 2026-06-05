(function () {
  const raw = sessionStorage.getItem('tyva_last_booking');
  const code = new URLSearchParams(window.location.search).get('code');
  if (!raw && !code) return;

  const booking = raw ? JSON.parse(raw) : null;
  if (!booking) return;

  const banner = document.querySelector('.mockup-banner');
  const codeEl = document.querySelector('.booking-code');
  const list = document.querySelector('.info-list');
  const note = document.querySelector('.success-box p:last-of-type');
  const emailSent = sessionStorage.getItem('tyva_email_sent') !== '0';
  const emailError = sessionStorage.getItem('tyva_email_error');

  if (banner) {
    if (emailSent) {
      banner.textContent = 'Билет отправлен на указанный email.';
      banner.style.background = '';
      banner.style.color = '';
    } else {
      banner.textContent = 'Билет оформлен, но письмо не ушло. Настройте почту в .env на сервере.';
      banner.style.background = '#fff3cd';
      banner.style.color = '#664d03';
    }
  }
  if (codeEl) codeEl.textContent = booking.code;

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
      <li><strong>Рейс</strong> <span>${booking.route_label}</span></li>
      <li><strong>Выезд</strong> <span>${departure}</span></li>
      <li><strong>Сбор</strong> <span>${booking.meeting_point}</span></li>
      <li><strong>Билетов</strong> <span>${booking.seats}</span></li>
      <li><strong>Оплачено</strong> <span>${Number(booking.total_amount).toLocaleString('ru-RU')} ₽</span></li>
      <li><strong>Статус</strong> <span><span class="badge badge-ok">${booking.status_display}</span></span></li>`;
  }
  if (note) {
    if (emailSent) {
      note.textContent = `Билет отправлен на ${booking.email}. Покажите номер билета при посадке.`;
    } else {
      note.innerHTML = `Письмо на <strong>${booking.email}</strong> не отправлено. Сохраните номер <strong>${booking.code}</strong> — он есть на странице «Мои билеты».${emailError ? `<br><small style="color:var(--muted)">${emailError}</small>` : ''}`;
    }
  }
})();

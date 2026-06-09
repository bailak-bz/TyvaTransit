(function () {
  const activeList = document.querySelector('[data-active-bookings]');
  const historyList = document.querySelector('[data-history-bookings]');
  const profileForm = document.querySelector('#profile-form');
  const guestPanel = document.querySelector('[data-guest-panel]');
  const accountPanel = document.querySelector('[data-account-panel]');
  const userTitle = document.querySelector('[data-user-name]');
  const logoutBtn = document.querySelector('[data-logout]');

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function numberLabel(booking) {
    if (booking.is_application) return 'Заявка';
    return 'Бронь';
  }

  function statusBadge(booking) {
    if (booking.is_application) {
      return '<span class="badge badge-private">Ожидает подтверждения</span>';
    }
    if (booking.needs_payment) {
      return '<span class="badge badge-low">Подтверждено</span>';
    }
    if (booking.status === 'paid') {
      return '<span class="badge badge-ok">Оплачено</span>';
    }
    if (booking.status === 'confirmed') {
      return '<span class="badge badge-ok">Подтверждено</span>';
    }
    if (booking.status === 'pending') {
      return '<span class="badge badge-private">Ожидает</span>';
    }
    if (booking.status === 'cancelled') {
      return '<span class="badge badge-full">Отменено</span>';
    }
    return `<span class="badge">${booking.status_display}</span>`;
  }

  function renderPaymentBlock(booking) {
    if (!booking.needs_payment) return '';
    const details = (booking.payment_details || '').replace(/\n/g, '<br>');
    return `
      <div class="payment-panel" hidden data-payment-panel="${booking.id}">
        <p class="card-meta" style="margin-top: 0.75rem;"><strong>Реквизиты для оплаты</strong></p>
        <p class="card-meta">${details}</p>
        ${booking.payment_stub?.enabled ? `
          <button type="button" class="btn btn-primary btn-sm" data-confirm-pay="${booking.id}">
            Подтвердить оплату (демо)
          </button>
        ` : ''}
      </div>`;
  }

  function renderBookingCard(booking) {
    const departure = booking.departure_at
      ? formatDate(booking.departure_at)
      : [booking.departure_date, booking.departure_time].filter(Boolean).join(', ');
    const displayNumber = booking.public_number || booking.application_code || booking.code;
    const paymentBtn = booking.needs_payment
      ? `<button type="button" class="btn btn-primary btn-sm" data-show-payment="${booking.id}">Оплата</button>`
      : '';

    return `
      <article class="booking-card" data-booking-id="${booking.id}">
        <div class="booking-card__head">
          <div>
            <span class="card-meta">${numberLabel(booking)}</span>
            <strong>${displayNumber}</strong>
          </div>
          <div class="booking-card__actions">
            ${statusBadge(booking)}
            ${paymentBtn}
          </div>
        </div>
        <p class="card-meta">${booking.booking_type_display} · ${booking.route_label}</p>
        <ul class="info-list info-list--compact">
          <li><strong>Выезд</strong> <span>${departure}</span></li>
          <li><strong>Сбор</strong> <span>${booking.meeting_point}</span></li>
          <li><strong>Мест</strong> <span>${booking.seats}</span></li>
          <li><strong>Сумма</strong> <span>${Number(booking.total_amount).toLocaleString('ru-RU')} ₽</span></li>
        </ul>
        ${renderPaymentBlock(booking)}
      </article>`;
  }

  function renderList(container, items, emptyText) {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<p class="card-meta">${emptyText}</p>`;
      return;
    }
    container.innerHTML = items.map(renderBookingCard).join('');
  }

  function bindBookingActions(container) {
    if (!container) return;
    container.addEventListener('click', async (event) => {
      const showBtn = event.target.closest('[data-show-payment]');
      if (showBtn) {
        const id = showBtn.getAttribute('data-show-payment');
        const panel = container.querySelector(`[data-payment-panel="${id}"]`);
        if (panel) panel.hidden = !panel.hidden;
        return;
      }

      const payBtn = event.target.closest('[data-confirm-pay]');
      if (!payBtn || !window.TyvaApi) return;

      const id = payBtn.getAttribute('data-confirm-pay');
      payBtn.disabled = true;
      try {
        await TyvaApi.payPrivateBooking(id);
        const user = await TyvaApi.getMe();
        if (user) await loadAccount(user);
        alert('Оплата принята. Билет отправлен на email.');
      } catch (err) {
        alert(err.message || 'Не удалось провести оплату');
        payBtn.disabled = false;
      }
    });
  }

  async function loadAccount(user) {
    if (userTitle) userTitle.textContent = user.display_name || user.email;
    if (profileForm) {
      profileForm.querySelector('#profile-name').value = user.display_name || '';
      profileForm.querySelector('#profile-phone').value = user.phone || '';
    }
    if (window.TyvaAuthNav) TyvaAuthNav.update(user);
    const data = await TyvaApi.getMyBookings();
    renderList(activeList, data.active, 'Нет активных билетов. Купите билет на общий рейс или закажите личную поездку.');
    renderList(historyList, data.history, 'История поездок пока пуста.');
  }

  function initTabs() {
    const tabs = document.querySelectorAll('[data-account-tab]');
    const panels = document.querySelectorAll('[data-account-panel-id]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const id = tab.getAttribute('data-account-tab');
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        panels.forEach((panel) => {
          panel.hidden = panel.getAttribute('data-account-panel-id') !== id;
        });
      });
    });
  }

  async function init() {
    initTabs();
    bindBookingActions(activeList);
    try {
      await TyvaApi.ensureCsrf();
      const user = await TyvaApi.getMe();
      if (!user) {
        if (guestPanel) guestPanel.hidden = false;
        if (accountPanel) accountPanel.hidden = true;
        return;
      }
      if (guestPanel) guestPanel.hidden = true;
      if (accountPanel) accountPanel.hidden = false;
      await loadAccount(user);
    } catch (err) {
      alert(err.message);
    }
  }

  profileForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = profileForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      const user = await TyvaApi.updateProfile({
        display_name: profileForm.querySelector('#profile-name').value.trim(),
        phone: profileForm.querySelector('#profile-phone').value.trim(),
      });
      if (userTitle) userTitle.textContent = user.display_name || user.email;
      if (window.TyvaAuthNav) TyvaAuthNav.update(user);
      alert('Профиль сохранён');
    } catch (err) {
      alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await TyvaApi.logout();
      window.location.href = 'login.html';
    } catch (err) {
      alert(err.message);
    }
  });

  document.addEventListener('DOMContentLoaded', init);
})();

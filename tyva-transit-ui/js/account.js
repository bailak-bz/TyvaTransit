(function () {
  const activeList = document.querySelector('[data-active-bookings]');
  const historyList = document.querySelector('[data-history-bookings]');
  const profileForm = document.querySelector('#profile-form');
  const guestPanel = document.querySelector('[data-guest-panel]');
  const accountPanel = document.querySelector('[data-account-panel]');
  const userTitle = document.querySelector('[data-user-name]');
  const logoutBtn = document.querySelector('[data-logout]');
  const paymentModal = document.querySelector('#payment-modal');

  let bookingsById = {};
  let currentPaymentBookingId = null;

  function formatDate(value) {
    if (!value) return '—';
    return new Date(value).toLocaleString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function formatMoney(value) {
    return `${Number(value).toLocaleString('ru-RU')} ₽`;
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

  function renderBookingCard(booking) {
    const departure = booking.departure_at
      ? formatDate(booking.departure_at)
      : [booking.departure_date, booking.departure_time].filter(Boolean).join(', ');
    const displayNumber = booking.public_number || booking.application_code || booking.code;
    const paymentBtn = booking.needs_payment
      ? `<button type="button" class="btn btn-primary btn-sm" data-open-payment="${booking.id}">Оплата</button>`
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
          <li><strong>Сумма</strong> <span>${formatMoney(booking.total_amount)}</span></li>
        </ul>
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

  function rememberBookings(data) {
    bookingsById = {};
    [...data.active, ...data.history].forEach((booking) => {
      bookingsById[String(booking.id)] = booking;
    });
  }

  function openPaymentModal(bookingId) {
    const id = String(bookingId);
    const booking = bookingsById[id] || bookingsById[Number(id)];
    if (!booking || !paymentModal) return;

    currentPaymentBookingId = booking.id;
    const displayNumber = booking.public_number || booking.code;

    paymentModal.querySelector('[data-modal-route]').textContent =
      `${displayNumber} · ${booking.route_label}`;
    paymentModal.querySelector('[data-modal-amount]').textContent =
      formatMoney(booking.total_amount);

    const detailsWrap = paymentModal.querySelector('[data-modal-details]');
    const detailsText = paymentModal.querySelector('[data-modal-details-text]');
    if (detailsWrap && detailsText) {
      if (booking.payment_details) {
        detailsText.innerHTML = booking.payment_details.replace(/\n/g, '<br>');
        detailsWrap.hidden = false;
      } else {
        detailsText.textContent = '';
        detailsWrap.hidden = true;
      }
    }

    const sbpRadio = paymentModal.querySelector('input[name="modal-pay"][value="sbp"]');
    if (sbpRadio) sbpRadio.checked = true;

    const payBtn = paymentModal.querySelector('[data-modal-pay]');
    if (payBtn) {
      payBtn.disabled = false;
      payBtn.textContent = `Оплатить ${formatMoney(booking.total_amount)}`;
    }

    paymentModal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closePaymentModal() {
    if (!paymentModal) return;
    paymentModal.hidden = true;
    document.body.style.overflow = '';
    currentPaymentBookingId = null;
  }

  function initPaymentModal() {
    if (!paymentModal) return;

    paymentModal.querySelector('.modal')?.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    paymentModal.addEventListener('click', (event) => {
      if (event.target === paymentModal) closePaymentModal();
    });

    paymentModal.querySelectorAll('[data-modal-close]').forEach((btn) => {
      btn.addEventListener('click', closePaymentModal);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !paymentModal.hidden) closePaymentModal();
    });

    paymentModal.querySelector('[data-modal-pay]')?.addEventListener('click', async () => {
      if (!currentPaymentBookingId || !window.TyvaApi || typeof TyvaApi.payPrivateBooking !== 'function') {
        alert('Сайт не обновился. Нажмите Ctrl+F5 и попробуйте снова.');
        return;
      }

      const paymentMethod = paymentModal.querySelector('input[name="modal-pay"]:checked')?.value || 'sbp';
      const payBtn = paymentModal.querySelector('[data-modal-pay]');
      payBtn.disabled = true;
      payBtn.textContent = 'Оплата…';

      try {
        await TyvaApi.payPrivateBooking(currentPaymentBookingId, paymentMethod);
        closePaymentModal();
        const user = await TyvaApi.getMe();
        if (user) await loadAccount(user);
        alert('Оплата принята. Билет отправлен на email.');
      } catch (err) {
        alert(err.message || 'Не удалось провести оплату');
        const booking = bookingsById[currentPaymentBookingId];
        payBtn.disabled = false;
        if (booking) payBtn.textContent = `Оплатить ${formatMoney(booking.total_amount)}`;
      }
    });
  }

  function bindBookingActions(container) {
    if (!container) return;
    container.addEventListener('click', (event) => {
      const openBtn = event.target.closest('[data-open-payment]');
      if (openBtn) {
        event.preventDefault();
        openPaymentModal(openBtn.getAttribute('data-open-payment'));
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
    rememberBookings(data);
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
    initPaymentModal();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

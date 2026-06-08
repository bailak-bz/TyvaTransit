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

  function statusBadge(booking) {
    if (booking.status === 'paid' || booking.status === 'confirmed') {
      return '<span class="badge badge-ok">Оплачено</span>';
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
    return `
      <article class="booking-card">
        <div class="booking-card__head">
          <strong>${booking.code}</strong>
          ${statusBadge(booking)}
        </div>
        <p class="card-meta">${booking.booking_type_display} · ${booking.route_label}</p>
        <ul class="info-list info-list--compact">
          <li><strong>Выезд</strong> <span>${departure}</span></li>
          <li><strong>Сбор</strong> <span>${booking.meeting_point}</span></li>
          <li><strong>Мест</strong> <span>${booking.seats}</span></li>
          <li><strong>Сумма</strong> <span>${Number(booking.total_amount).toLocaleString('ru-RU')} ₽</span></li>
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

  async function loadAccount(user) {
    if (userTitle) userTitle.textContent = user.display_name || user.email;
    if (profileForm) {
      profileForm.querySelector('#profile-name').value = user.display_name || '';
      profileForm.querySelector('#profile-phone').value = user.phone || '';
      profileForm.querySelector('#profile-email').value = user.email || '';
    }
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

  function initLookup() {
    const form = document.querySelector('#lookup-form');
    const resultBox = document.querySelector('.check-result');
    if (!form || !resultBox) return;
    resultBox.style.display = 'none';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        const booking = await TyvaApi.lookupBooking(
          form.querySelector('#code').value.trim(),
          form.querySelector('#phone').value.trim(),
        );
        resultBox.innerHTML = renderBookingCard(booking);
        resultBox.style.display = '';
      } catch (err) {
        alert(err.message);
        resultBox.style.display = 'none';
      }
    });
  }

  async function init() {
    initTabs();
    initLookup();
    if (window.location.hash === '#lookup') {
      document.querySelector('[data-account-tab="lookup"]')?.click();
    }
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

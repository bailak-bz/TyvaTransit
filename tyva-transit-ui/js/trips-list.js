(function () {
  const grid = document.querySelector('.card-grid');
  if (!grid) return;

  const destSelect = document.querySelector('#dest');
  const dateInput = document.querySelector('#date');
  const seatsSelect = document.querySelector('#seats');
  const applyBtn = document.querySelector('.filters .btn');
  const pageTitle = document.querySelector('.page-title');
  const pageLead = document.querySelector('.page-lead');

  const urlLake = new URLSearchParams(window.location.search).get('lake')
    || new URLSearchParams(window.location.search).get('destination');

  function renderTrips(trips) {
    if (!trips.length) {
      grid.innerHTML = '<p class="card-meta">Нет рейсов по выбранным фильтрам.</p>';
      return;
    }
    grid.innerHTML = trips.map((trip) => TyvaTrips.renderCard(trip, 'grid')).join('');
  }

  function updatePageHeading(destinations) {
    if (!urlLake || !pageTitle) return;
    const dest = destinations.find((d) => d.slug === urlLake);
    if (!dest) return;
    pageTitle.textContent = `Рейсы: ${dest.name}`;
    if (pageLead) {
      pageLead.innerHTML = `
        <span class="badge badge-shared">Могут быть другие пассажиры</span>
        Расписание выездов в направлении «${dest.route_label}».
        <a href="trips.html">Все рейсы</a> ·
        <a href="lake-${urlLake}.html">О ${dest.name.toLowerCase()}</a>`;
    }
    if (destSelect) destSelect.value = urlLake;
  }

  async function loadTrips() {
    const params = { available_only: seatsSelect?.value || 'no' };
    if (dateInput?.value) params.date_from = dateInput.value;
    if (destSelect?.value) params.lake = destSelect.value;
    const trips = await TyvaApi.getTrips(params);
    renderTrips(trips);
  }

  TyvaApi.getDestinations().then((items) => {
    if (!destSelect) return;
    const outbound = items.filter((d) => d.route_label.startsWith('Кызыл →'));
    destSelect.innerHTML = '<option value="">Все направления</option>';
    outbound.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.slug;
      opt.textContent = d.route_label;
      destSelect.appendChild(opt);
    });
    if (urlLake) {
      destSelect.value = urlLake;
      updatePageHeading(items);
    }
    return loadTrips();
  }).catch((e) => {
    grid.innerHTML = `<p class="card-meta">Не удалось загрузить рейсы: ${e.message}</p>`;
  });

  applyBtn?.addEventListener('click', () => loadTrips().catch((e) => alert(e.message)));
  destSelect?.addEventListener('change', () => loadTrips().catch((e) => alert(e.message)));
})();

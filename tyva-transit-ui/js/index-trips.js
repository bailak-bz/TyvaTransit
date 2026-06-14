(function () {
  const track = document.querySelector('[data-home-trips]');
  if (!track) return;

  const section = track.closest('.swipe-section');
  const dotsWrap = section && section.querySelector('[data-swipe-dots]');

  TyvaApi.getTrips({ available_only: 'no', limit: '6' })
    .then((trips) => {
      if (!trips.length) {
        track.innerHTML = '<div class="swipe-slide"><p class="card-meta">Рейсы скоро появятся в расписании.</p></div>';
      } else {
        track.innerHTML = trips.map((trip) => TyvaTrips.renderCard(trip, 'slide')).join('');
      }
      if (dotsWrap) dotsWrap.innerHTML = '';
      if (window.TyvaSwipe) window.TyvaSwipe.initTrack(track);
    })
    .catch((err) => {
      track.innerHTML = `<div class="swipe-slide"><p class="card-meta">Не удалось загрузить рейсы: ${err.message}</p></div>`;
    });
})();

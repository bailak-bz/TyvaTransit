(function () {
  const form = document.querySelector('#login-form');
  const btn = document.querySelector('#login-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', (event) => event.preventDefault());

  btn.addEventListener('click', async () => {
    if (!window.TyvaApi) {
      alert('Не загрузился API. Обновите страницу (Ctrl+F5).');
      return;
    }

    btn.disabled = true;
    try {
      await TyvaApi.login({
        email: form.querySelector('#email').value.trim(),
        password: form.querySelector('#password').value,
      });
      window.location.href = 'account.html';
    } catch (err) {
      alert(err.message || 'Ошибка входа');
      btn.disabled = false;
    }
  });

  if (window.TyvaApi) {
    TyvaApi.getMe().then((user) => {
      if (user) window.location.replace('account.html');
    }).catch(() => {});
  }
})();

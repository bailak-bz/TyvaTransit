(function () {
  const form = document.querySelector('#login-form');
  const btn = document.querySelector('#login-btn');
  if (!form || !btn) return;

  const nextParam = new URLSearchParams(window.location.search).get('next');
  if (nextParam && nextParam.endsWith('.html')) {
    const registerLink = document.querySelector('a[href="register.html"]');
    if (registerLink) {
      registerLink.href = `register.html?next=${encodeURIComponent(nextParam)}`;
    }
  }

  form.addEventListener('submit', (event) => event.preventDefault());

  btn.addEventListener('click', async () => {
    if (!window.TyvaApi || typeof TyvaApi.login !== 'function') {
      alert('Сайт не обновился. Нажмите Ctrl+F5 (жёсткое обновление страницы) и попробуйте снова.');
      return;
    }

    btn.disabled = true;
    try {
      await TyvaApi.login({
        email: form.querySelector('#email').value.trim(),
        password: form.querySelector('#password').value,
      });
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.endsWith('.html') ? next : 'account.html';
    } catch (err) {
      alert(err.message || 'Ошибка входа');
      btn.disabled = false;
    }
  });

  if (window.TyvaApi) {
    TyvaApi.getMe().then((user) => {
      if (!user) return;
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.replace(next && next.endsWith('.html') ? next : 'account.html');
    }).catch(() => {});
  }
})();

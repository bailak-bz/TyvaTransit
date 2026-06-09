(function () {
  const form = document.querySelector('#register-form');
  const btn = document.querySelector('#register-btn');
  if (!form || !btn) return;

  const nextParam = new URLSearchParams(window.location.search).get('next');
  if (nextParam && nextParam.endsWith('.html')) {
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink) {
      loginLink.href = `login.html?next=${encodeURIComponent(nextParam)}`;
    }
  }

  form.addEventListener('submit', (event) => event.preventDefault());

  btn.addEventListener('click', async () => {
    if (!window.TyvaApi || typeof TyvaApi.register !== 'function') {
      alert('Сайт не обновился. Нажмите Ctrl+F5 (жёсткое обновление страницы) и попробуйте снова.');
      return;
    }

    const password = form.querySelector('#password').value;
    const password2 = form.querySelector('#password2').value;
    if (password !== password2) {
      alert('Пароли не совпадают');
      return;
    }

    btn.disabled = true;
    try {
      await TyvaApi.register({
        email: form.querySelector('#email').value.trim(),
        password,
        display_name: form.querySelector('#name').value.trim(),
        phone: form.querySelector('#phone').value.trim(),
      });
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.href = next && next.endsWith('.html') ? next : 'account.html';
    } catch (err) {
      alert(err.message || 'Ошибка регистрации');
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

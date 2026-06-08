(function () {
  const form = document.querySelector('#login-form');
  if (!form) return;

  TyvaApi.ensureCsrf().then(() => TyvaApi.getMe()).then((user) => {
    if (user) window.location.replace('account.html');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await TyvaApi.login({
        email: form.querySelector('#email').value.trim(),
        password: form.querySelector('#password').value,
      });
      window.location.href = 'account.html';
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
    }
  });
})();

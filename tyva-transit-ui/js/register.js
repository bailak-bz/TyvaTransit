(function () {
  const form = document.querySelector('#register-form');
  if (!form) return;

  TyvaApi.ensureCsrf().then(() => TyvaApi.getMe()).then((user) => {
    if (user) window.location.replace('account.html');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = form.querySelector('#password').value;
    const password2 = form.querySelector('#password2').value;
    if (password !== password2) {
      alert('Пароли не совпадают');
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      await TyvaApi.ensureCsrf();
      await TyvaApi.register({
        email: form.querySelector('#email').value.trim(),
        password,
        display_name: form.querySelector('#name').value.trim(),
        phone: form.querySelector('#phone').value.trim(),
      });
      window.location.href = 'account.html';
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
    }
  });
})();

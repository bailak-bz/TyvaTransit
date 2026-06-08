(function () {
  function updateAuthLinks(user) {
    document.querySelectorAll('[data-nav-auth]').forEach((el) => {
      if (user) {
        el.href = 'account.html';
        el.textContent = user.display_name || 'Аккаунт';
        el.classList.add('nav-auth--logged-in');
      } else {
        el.href = 'login.html';
        el.textContent = 'Войти';
        el.classList.remove('nav-auth--logged-in');
      }
    });
  }

  async function init() {
    if (!window.TyvaApi) return;
    try {
      const user = await TyvaApi.getMe();
      updateAuthLinks(user);
      window.TyvaCurrentUser = user;
      document.dispatchEvent(new CustomEvent('tyva:auth', { detail: { user } }));
    } catch (_) {
      updateAuthLinks(null);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

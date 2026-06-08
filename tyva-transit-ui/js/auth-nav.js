(function () {
  function updateAuthLinks(user) {
    const onAccountPage = /account\.html/i.test(window.location.pathname);
    document.querySelectorAll('[data-nav-auth]').forEach((el) => {
      if (user) {
        el.href = 'account.html';
        el.textContent = user.display_name || user.email || 'Аккаунт';
        el.classList.add('nav-auth--logged-in');
        el.classList.toggle('active', onAccountPage);
      } else {
        el.href = 'login.html';
        el.textContent = 'Войти';
        el.classList.remove('nav-auth--logged-in');
        if (onAccountPage) el.classList.remove('active');
      }
    });
  }

  async function refreshAuthNav() {
    if (!window.TyvaApi || typeof TyvaApi.getMe !== 'function') return;
    try {
      const user = await TyvaApi.getMe();
      updateAuthLinks(user);
      window.TyvaCurrentUser = user;
      document.dispatchEvent(new CustomEvent('tyva:auth', { detail: { user } }));
    } catch (_) {
      updateAuthLinks(null);
    }
  }

  document.addEventListener('tyva:auth', (event) => {
    updateAuthLinks(event.detail?.user || null);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAuthNav);
  } else {
    refreshAuthNav();
  }

  window.TyvaAuthNav = { refresh: refreshAuthNav, update: updateAuthLinks };
})();

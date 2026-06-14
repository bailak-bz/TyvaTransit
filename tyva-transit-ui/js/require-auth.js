(function () {
  const PROTECTED = new Set(['private-book.html']);

  function currentPage() {
    const path = window.location.pathname.split('/').pop();
    return path || 'index.html';
  }

  async function requireLogin() {
    if (!PROTECTED.has(currentPage())) return;
    if (!window.TyvaApi || typeof TyvaApi.getMe !== 'function') return;

    const user = await TyvaApi.getMe();
    if (user) return;

    const next = encodeURIComponent(currentPage() + window.location.search);
    window.location.replace(`login.html?next=${next}`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requireLogin);
  } else {
    requireLogin();
  }
})();

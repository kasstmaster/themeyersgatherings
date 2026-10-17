// Run before the body is parsed so QR arrivals never flash the sign-in form
// while the account list is still loading. No service worker or app identity changes.
(() => {
  const root = document.documentElement;
  root.classList.add('meyers-loading');
  let timeout;
  const finish = () => {
    root.classList.remove('meyers-loading');
    clearTimeout(timeout);
  };
  window.MeyersLoading = { finish };
  // Fail open if a script cannot load; never leave a permanent loading overlay.
  timeout = setTimeout(finish, 20000);
  window.addEventListener('pageshow', event => {
    if (event.persisted) finish();
  });
})();

(() => {
  if (window.location.origin !== 'https://meyer.ilymmd.com') return;
  const prompt = document.querySelector('#installAppPrompt');
  const button = document.querySelector('#installAppButton');
  const help = document.querySelector('#installAppHelp');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installEvent;
  const update = () => { prompt.hidden = standalone.matches || navigator.standalone === true; };
  update();
  standalone.addEventListener('change', update);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    update();
  });
  window.addEventListener('appinstalled', () => { installEvent = null; prompt.hidden = true; });
  button.addEventListener('click', async () => {
    if (installEvent) {
      const event = installEvent;
      installEvent = null;
      try { await event.prompt(); await event.userChoice; }
      catch { showHelp(); }
    } else showHelp();
  });
  function showHelp() {
    help.textContent = 'On iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen. On Android or a computer, use your browser menu and choose Install app or Add to Home Screen.';
    help.hidden = !help.hidden;
    button.setAttribute('aria-expanded', String(!help.hidden));
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .catch(error => console.error('The Meyers installation support could not start.', error));
  }
})();

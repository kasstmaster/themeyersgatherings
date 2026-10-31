// Keep printed invitations working while moving installation to its own origin.
(() => {
  const { origin, pathname, search, hash } = window.location;
  const github = origin === 'https://kasstmaster.github.io' &&
    (pathname === '/themeyersgatherings' || pathname.startsWith('/themeyersgatherings/'));
  const parent = ['https://ilymmd.com', 'https://www.ilymmd.com'].includes(origin) &&
    /^\/themeyers(?:gatherings)?(?:\/|$)/.test(pathname);
  if (github || parent) window.location.replace('https://meyer.ilymmd.com/' + search + hash);
})();

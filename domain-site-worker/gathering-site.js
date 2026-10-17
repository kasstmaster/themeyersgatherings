// Serve only the gathering paths. The existing Plex website remains the origin for everything else.
const HOSTS = new Set(['ilymmd.com', 'www.ilymmd.com']);
const PREFIX = '/themeyers';
const LEGACY = '/themeyersgatherings';

export async function handleGatheringSite(request, env) {
  const url = new URL(request.url);
  if (!HOSTS.has(url.hostname)) return null;
  const legacy = url.pathname === LEGACY || url.pathname.startsWith(LEGACY + '/');
  const current = url.pathname === PREFIX || url.pathname.startsWith(PREFIX + '/');
  if (!legacy && !current) return null;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', {status:405, headers:{Allow:'GET, HEAD'}});
  if (legacy || url.hostname === 'www.ilymmd.com' || url.pathname === PREFIX) {
    const target = new URL(url);
    target.hostname = 'ilymmd.com';
    target.protocol = 'https:';
    if (legacy) target.pathname = PREFIX + (url.pathname.slice(LEGACY.length) || '/');
    if (target.pathname === PREFIX) target.pathname += '/';
    // A Location without a fragment preserves the original QR fragment in the browser.
    return Response.redirect(target.href, 308);
  }
  if (!env.GATHERING_SITE) return new Response('The gathering site is not deployed yet.', {status:503});
  if (url.pathname === PREFIX + '/assets/rose-icon-v2.png') {
    return serveRoseIcon(request);
  }
  const assetUrl = new URL(url);
  assetUrl.pathname = url.pathname.slice(PREFIX.length);
  if (assetUrl.pathname === '/' || assetUrl.pathname === '') assetUrl.pathname = '/index.html';
  // Forward no visitor cookies, host passwords, or Authorization headers to the static binding.
  const headers = new Headers();
  for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  const asset = await env.GATHERING_SITE.fetch(new Request(assetUrl, {method:request.method, headers}));
  const response = new Response(asset.body, asset);
  if (assetUrl.pathname === '/index.html') response.headers.set('Cache-Control', 'no-cache');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

// Keep the icon on the gathering's origin, including for older GitHub Pages QR links.
// Only this fixed public image is fetched; visitor headers and URL parameters are never forwarded.
export async function serveRoseIcon(request, fetchImage = fetch) {
  try {
    const image = await fetchImage('https://i.ibb.co/rfvgWyJZ/rose-1-copy.png', {
      cf: { cacheEverything: true, cacheTtl: 2592000 },
    });
    if (!image.ok || !/^image\/png(?:;|$)/i.test(image.headers.get('Content-Type') || '')) {
      return new Response('Icon temporarily unavailable.', { status: 502 });
    }
    return new Response(request.method === 'HEAD' ? null : image.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Icon temporarily unavailable.', { status: 502 });
  }
}

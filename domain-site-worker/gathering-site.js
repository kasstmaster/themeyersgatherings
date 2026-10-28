import {handleSession} from './session.js';
// The Meyers has its own origin. Old gathering paths redirect without claiming Plex paths.
const HOSTS = new Set(['ilymmd.com', 'www.ilymmd.com']);
const APP_HOST = 'themeyers.ilymmd.com';
const PREFIX = '/themeyers';
const LEGACY = '/themeyersgatherings';

export async function handleGatheringSite(request, env) {
  const url = new URL(request.url);
  const appHost = url.hostname === APP_HOST;
  if (!appHost && !HOSTS.has(url.hostname)) return null;
  const legacy = url.pathname === LEGACY || url.pathname.startsWith(LEGACY + '/');
  const current = url.pathname === PREFIX || url.pathname.startsWith(PREFIX + '/');
  if (!appHost && !legacy && !current) return null;
  if(appHost&&url.protocol==='https:'&&url.pathname.startsWith('/session/'))return handleSession(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed.', {status:405, headers:{Allow:'GET, HEAD'}});
  if (!appHost || url.protocol !== 'https:') {
    const target = new URL(url);
    target.hostname = APP_HOST;
    target.protocol = 'https:';
    if (!appHost) target.pathname = url.pathname.slice(legacy ? LEGACY.length : PREFIX.length) || '/';
    // A Location without a fragment preserves the original QR fragment in the browser.
    return Response.redirect(target.href, 308);
  }
  if (!env.GATHERING_SITE) return new Response('The gathering site is not deployed yet.', {status:503});
  const assetUrl = new URL(url);
  const aliases = {
    '/favicon.ico': '/assets/icons/favicon.ico',
    '/apple-touch-icon.png': '/assets/icons/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png': '/assets/icons/apple-touch-icon.png',
    '/assets/rose-icon-v2.png': '/assets/icons/rose-source.png',
  };
  assetUrl.pathname = aliases[url.pathname] || url.pathname;
  if (assetUrl.pathname === '/' || assetUrl.pathname === '') assetUrl.pathname = '/index.html';
  // Forward no visitor cookies, host passwords, or Authorization headers to the static binding.
  const headers = new Headers();
  for (const name of ['If-None-Match', 'If-Modified-Since', 'Range', 'If-Range']) {
    if (request.headers.has(name)) headers.set(name, request.headers.get(name));
  }
  const asset = await env.GATHERING_SITE.fetch(new Request(assetUrl, {method:request.method, headers}));
  const response = new Response(asset.body, asset);
  if (['/index.html', '/site.webmanifest', '/service-worker.js'].includes(assetUrl.pathname)) response.headers.set('Cache-Control', 'no-cache');
  if(assetUrl.pathname==='/release.json')response.headers.set('Cache-Control','no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

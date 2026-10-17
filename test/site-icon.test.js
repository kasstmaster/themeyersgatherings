import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { serveRoseIcon } from '../domain-site-worker/gathering-site.js';

test('rose icon fetch uses only the fixed public source and serves PNG with cache headers', async () => {
  const request = new Request('https://ilymmd.com/themeyers/assets/rose-icon-v2.png?url=https://other.example', { headers: { Authorization: 'private', Cookie: 'private' } });
  const response = await serveRoseIcon(request, async (url, options) => {
    assert.equal(url, 'https://i.ibb.co/rfvgWyJZ/rose-1-copy.png');
    assert.equal(options.headers, undefined);
    return new Response(new Uint8Array([137,80,78,71]), {headers:{'Content-Type':'image/png'}});
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Type'), 'image/png');
  assert.match(response.headers.get('Cache-Control'), /max-age/);
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [137,80,78,71]);
});

test('upstream errors and HTML cannot become a cached browser icon', async () => {
  for (const fetchImage of [async () => new Response('denied', {status:403}), async () => new Response('<html>error</html>'), async () => { throw new Error('offline'); }]) {
    const response = await serveRoseIcon(new Request('https://ilymmd.com/themeyers/assets/rose-icon-v2.png'), fetchImage);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Cache-Control'), null);
  }
});

test('browser, Apple and manifest icons share the new Meyers URL, including legacy QR pages', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../site.webmanifest', import.meta.url), 'utf8'));
  const icon = 'https://ilymmd.com/themeyers/assets/rose-icon-v2.png';
  assert.equal((html.match(/href="https:\/\/ilymmd.com\/themeyers\/assets\/rose-icon-v2.png"/g) || []).length, 3);
  assert.equal(manifest.icons[0].src, icon);
});

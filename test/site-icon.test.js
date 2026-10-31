import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { handleGatheringSite } from '../domain-site-worker/gathering-site.js';

test('installable app uses separate root identity and bundled correctly sized PNG icons', async () => {
  const manifest = JSON.parse(await readFile(new URL('../site.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.name, 'The Meyers');
  assert.equal(manifest.id, '/');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.start_url, '/');
  for (const icon of manifest.icons) {
    const png = await readFile(new URL('../' + icon.src, import.meta.url));
    assert.equal(png.subarray(1,4).toString(), 'PNG');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
  assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192','512x512']);
});

test('standard root icon lookups and old rose path use local assets, never an image host', async () => {
  const env = { GATHERING_SITE: { async fetch(request) { return new Response(new URL(request.url).pathname); } } };
  for (const [url, path] of Object.entries({
    '/favicon.ico':'/assets/icons/favicon.ico',
    '/apple-touch-icon.png':'/assets/icons/apple-touch-icon.png',
    '/apple-touch-icon-precomposed.png':'/assets/icons/apple-touch-icon.png',
    '/assets/rose-icon-v2.png':'/assets/icons/rose-source.png',
  })) {
    const response = await handleGatheringSite(new Request('https://meyer.ilymmd.com'+url),env);
    assert.equal(await response.text(),path);
  }
});

test('original printed Pages QR redirects preserve query and account token without capturing other sites', async () => {
  const source = await readFile(new URL('../site-entry.js',import.meta.url),'utf8');
  for (const origin of ['https://kasstmaster.github.io','https://ilymmd.com','https://www.ilymmd.com']) {
    let target;
    vm.runInNewContext(source,{window:{location:{origin,pathname:'/themeyersgatherings/',search:'?event=wedding',hash:'#/signin/account/original-token',replace:url=>target=url}}});
    assert.equal(target,'https://meyer.ilymmd.com/?event=wedding#/signin/account/original-token');
  }
  for (const [origin,pathname] of [['https://meyer.ilymmd.com','/'],['https://kasstmaster.github.io','/another-site/'],['https://ilymmd.com','/'],['https://ilymmd.com','/themeyers-other']]) {
    vm.runInNewContext(source,{window:{location:{origin,pathname,replace:()=>assert.fail('Unrelated URL redirected')}}});
  }
});

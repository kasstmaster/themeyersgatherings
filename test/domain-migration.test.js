import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import worker from '../github-state-worker/worker.js';
import { buildDomainSite, legacyRedirectHtml } from '../scripts/build-domain-site.js';

test('old and new origins receive exact CORS headers; unrelated origins cannot write or preflight', async () => {
  const config = await readFile(new URL('../github-state-worker/wrangler.toml', import.meta.url), 'utf8');
  const env = { ALLOWED_ORIGIN:'https://kasstmaster.github.io', ALLOWED_ORIGINS:config.match(/ALLOWED_ORIGINS = \"([^\"]+)\"/)[1] };
  for (const origin of ['https://kasstmaster.github.io','https://ilymmd.com','https://www.ilymmd.com','https://themeyers.ilymmd.com']) {
    const response = await worker.fetch(new Request('https://state.example/', {method:'OPTIONS',headers:{Origin:origin}}),env);
    assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(response.headers.get('Vary'),'Origin');
  }
  for (const method of ['OPTIONS','PUT']) {
    const response=await worker.fetch(new Request('https://state.example/',{method,headers:{Origin:'https://ilymmd.com.attacker.example'}}),env);
    assert.equal(response.status,403);assert.notEqual(response.headers.get('Access-Control-Allow-Origin'),'https://ilymmd.com.attacker.example');
  }
});

test('redirect preserves account token hashes and complete query strings without generating new QR tokens', () => {
  const script=legacyRedirectHtml().match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const route of ['', '#/signin/account/'+'A'.repeat(43)]) {
    let target;
    vm.runInNewContext(script,{URL,window:{location:{search:'?event=wedding&next=%2F',hash:route,replace:value=>target=value}}});
    assert.equal(target,'https://themeyers.ilymmd.com/?event=wedding&next=%2F'+route);
  }
});

test('domain bundle contains relative frontend assets and fallback state, retaining the parent home page', async () => {
  const output=await mkdtemp(join(tmpdir(),'meyers-domain-'));
  try {
    await writeFile(join(output,'index.html'),'Existing main website');
    await buildDomainSite(output);
    assert.equal(await readFile(join(output,'index.html'),'utf8'),'Existing main website');
    const html=await readFile(join(output,'themeyers/index.html'),'utf8');
    assert.match(html,/https:\/\/themeyers.ilymmd.com\//);
    for (const file of ['app.js','page-actions.js','styles.css','data/app-state.json','vendor/qrcode.js','assets/thanksgiving-header.svg','site.webmanifest','site-entry.js','app-install.js','service-worker.js','offline.html','assets/icons/meyers-512.png']) await access(join(output,'themeyers',file));
    for (const file of ['github-state-worker/worker.js','.git/config','CNAME','package.json']) await assert.rejects(access(join(output,'themeyers',file)));
    await assert.rejects(buildDomainSite(output),/already exists/);
  } finally { await rm(output,{recursive:true,force:true}); }
});

test('Cloudflare serves only the gathering prefix with relative assets and no copied credentials', async () => {
  const {handleGatheringSite}=await import('../domain-site-worker/gathering-site.js');
  const requests=[];
  const env={GATHERING_SITE:{async fetch(request){requests.push(request);return new Response('asset',{headers:{'Content-Type':request.url.endsWith('.css')?'text/css':'text/html'}});}}};
  for(const pathname of ['/','/app.js','/api/plex-library','/themeyers-other']) {
    assert.equal(await handleGatheringSite(new Request('https://ilymmd.com'+pathname),env),null);
  }
  assert.equal(await handleGatheringSite(new Request('https://curly-sun-ef0f.example/themeyers/'),env),null);
  const html=await handleGatheringSite(new Request('https://themeyers.ilymmd.com/',{headers:{Cookie:'private',Authorization:'Bearer private','X-Host-Password':'private'}}),env);
  assert.equal(await html.text(),'asset');assert.equal(html.headers.get('Cache-Control'),'no-cache');
  assert.equal(new URL(requests[0].url).pathname,'/index.html');
  assert.equal([...requests[0].headers].length,0);
  const css=await handleGatheringSite(new Request('https://themeyers.ilymmd.com/styles.css'),env);
  assert.equal(css.headers.get('Content-Type'),'text/css');assert.equal(new URL(requests[1].url).pathname,'/styles.css');
  const receipt=await handleGatheringSite(new Request('https://themeyers.ilymmd.com/release.json?commit=test'),env);
  assert.equal(receipt.headers.get('Cache-Control'),'no-store');
  assert.equal((await handleGatheringSite(new Request('https://themeyers.ilymmd.com/',{method:'POST'}),env)).status,405);
  assert.equal((await handleGatheringSite(new Request('https://themeyers.ilymmd.com/'),{})).status,503);
});

test('Cloudflare redirects retain queries and canonicalize aliases without taking over unrelated paths', async () => {
  const {handleGatheringSite}=await import('../domain-site-worker/gathering-site.js');
  for(const url of ['https://ilymmd.com/themeyers?event=wedding','https://ilymmd.com/themeyersgatherings/?event=wedding','https://www.ilymmd.com/themeyers/?event=wedding','https://ilymmd.com/themeyers/?event=wedding','http://themeyers.ilymmd.com/?event=wedding']){
    const response=await handleGatheringSite(new Request(url),{});
    assert.equal(response.status,308);assert.equal(response.headers.get('Location'),'https://themeyers.ilymmd.com/?event=wedding');
  }
});

test('standalone domain Worker needs no service-account bindings and returns 404 outside its routes', async () => {
  const siteWorker=(await import('../domain-site-worker/worker.js')).default;
  let calls=0;
  const env={GATHERING_SITE:{async fetch(){calls++;return new Response('Gathering page');}}};
  const page=await siteWorker.fetch(new Request('https://themeyers.ilymmd.com/'),env);
  assert.equal(await page.text(),'Gathering page');assert.equal(calls,1);
  assert.equal((await siteWorker.fetch(new Request('https://ilymmd.com/'),env)).status,404);
  assert.equal((await siteWorker.fetch(new Request('https://ilymmd.com/wedding-media'),env)).status,404);
  assert.equal(calls,1);
});

// Read-only post-deployment smoke check. No accounts, tokens, or saved state are requested.
import assert from 'node:assert/strict';
const canonical='https://ilymmd.com/themeyers/';
async function request(url,options={}) {
  return fetch(url,{...options,signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache',...options.headers}});
}
const site=await request(canonical);assert.equal(site.status,200);
const html=await site.text();assert.match(html,/<title>The Meyers Gatherings<\/title>/);
for(const file of ['app.js','styles.css','vendor/qrcode.js'])assert.equal((await request(canonical+file,{method:'HEAD'})).status,200,file);
const home=await request('https://ilymmd.com/');assert.equal(home.status,200);assert.match(await home.text(),/<title>Plex Requests<\/title>/);
const old=await request('https://kasstmaster.github.io/themeyersgatherings/');assert.equal(old.status,200);assert.match(await old.text(),/<title>The Meyers Gatherings<\/title>/);
const alias=await request('https://ilymmd.com/themeyersgatherings/?invitation=check',{redirect:'manual'});
assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),canonical+'?invitation=check');
const service=html.match(/<meta name="shared-state-url" content="([^"]+)"/)[1];
for(const origin of ['https://ilymmd.com','https://kasstmaster.github.io']){
  const response=await request(service,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'PUT'}});
  assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
}
console.log('Live main site, gathering route/assets, original QR address, legacy redirect and CORS passed.');

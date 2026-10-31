// Read-only post-deployment smoke check. No accounts, tokens, or saved state are requested.
import assert from 'node:assert/strict';
const canonical='https://meyer.ilymmd.com/';
async function request(url,options={}) {
  return fetch(url,{...options,signal:AbortSignal.timeout(10000),headers:{'Cache-Control':'no-cache',...options.headers}});
}
// A newly provisioned Custom Domain can need time for DNS and its certificate.
let site;
for(let attempt=1;attempt<=12;attempt++){
  try { site=await request(canonical);if(site.status===200)break; }
  catch(error){if(attempt===12)throw new Error(`The Meyers custom domain is not reachable: ${error.message}`);}
  if(attempt<12){console.log(`Waiting for The Meyers domain (attempt ${attempt}/12).`);await new Promise(resolve=>setTimeout(resolve,10000));}
}
assert.equal(site?.status,200,'The Meyers custom domain must serve the app');
const html=await site.text();assert.ok(/<title>The Meyers<\/title>/.test(html),'The Meyers domain must serve The Meyers, not Plex');
for(const file of ['app.js','styles.css','vendor/qrcode.js','service-worker.js','assets/icons/favicon.ico','assets/icons/apple-touch-icon.png'])assert.equal((await request(canonical+file,{method:'HEAD'})).status,200,file);
const manifestResponse=await request(canonical+'site.webmanifest');assert.equal(manifestResponse.status,200);
const manifest=await manifestResponse.json();
assert.equal(manifest.name,'The Meyers');assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
for(const icon of manifest.icons){
  const response=await request(new URL(icon.src,canonical));assert.equal(response.status,200,icon.src);
  const bytes=Buffer.from(await response.arrayBuffer());assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,icon.sizes);
}
const home=await request('https://ilymmd.com/');assert.equal(home.status,200);assert.ok(/<title>Plex Requests<\/title>/.test(await home.text()),'Plex home page must remain Plex');
// GitHub Pages publishes independently, so either title is valid during rollout.
const old=await request('https://kasstmaster.github.io/themeyersgatherings/');assert.equal(old.status,200);assert.ok(/<title>The Meyers(?: Gatherings)?<\/title>/.test(await old.text()),'Original invitation address must remain available');
for(const url of ['https://themeyers.ilymmd.com/','https://ilymmd.com/themeyers/','https://ilymmd.com/themeyersgatherings/','https://www.ilymmd.com/themeyers/']){
  const alias=await request(url+'?invitation=check',{redirect:'manual'});
  assert.equal(alias.status,308);assert.equal(alias.headers.get('Location'),canonical+'?invitation=check');
}
const service=html.match(/<meta name="shared-state-url" content="([^"]+)"/)[1];
for(const origin of ['https://themeyers.ilymmd.com','https://meyer.ilymmd.com','https://ilymmd.com','https://www.ilymmd.com','https://kasstmaster.github.io']){
  const response=await request(service,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'PUT'}});
  assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin);
}
const resume=await request(canonical+'session/auth/session',{method:'POST',headers:{Origin:canonical.slice(0,-1),'Content-Type':'application/json'},body:'{}'});
assert.equal(resume.status,401);assert.equal(resume.headers.get('Cache-Control'),'no-store');
console.log('Live separate app, manifest/icons, shared service CORS, Plex home page and legacy QR addresses passed.');

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, access, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import worker from '../github-state-worker/worker.js';
import { buildDomainSite, legacyRedirectHtml } from '../scripts/build-domain-site.js';

test('old and new origins receive exact CORS headers; unrelated origins cannot write or preflight', async () => {
  const env = { ALLOWED_ORIGIN:'https://kasstmaster.github.io', ALLOWED_ORIGINS:'https://ilymmd.com, https://www.ilymmd.com' };
  for (const origin of ['https://kasstmaster.github.io','https://ilymmd.com','https://www.ilymmd.com']) {
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
    assert.equal(target,'https://ilymmd.com/themeyers/?event=wedding&next=%2F'+route);
  }
});

test('domain bundle contains relative frontend assets and fallback state, retaining the parent home page', async () => {
  const output=await mkdtemp(join(tmpdir(),'meyers-domain-'));
  try {
    await writeFile(join(output,'index.html'),'Existing main website');
    await buildDomainSite(output);
    assert.equal(await readFile(join(output,'index.html'),'utf8'),'Existing main website');
    const html=await readFile(join(output,'themeyers/index.html'),'utf8');
    assert.match(html,/https:\/\/ilymmd.com\/themeyers\//);
    for (const file of ['app.js','styles.css','data/app-state.json','vendor/qrcode.js','assets/thanksgiving-header.svg']) await access(join(output,'themeyers',file));
    for (const file of ['github-state-worker/worker.js','.git/config','CNAME','package.json']) await assert.rejects(access(join(output,'themeyers',file)));
    await assert.rejects(buildDomainSite(output),/already exists/);
  } finally { await rm(output,{recursive:true,force:true}); }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../github-state-worker/worker.js';
import {redirectFiles,buildPagesRedirect} from '../scripts/build-pages-redirect.js';
import {preflight,verifyService,verifyFrontend,verifyBackupCurrency} from '../scripts/release-preflight.js';
import {buildDomainSite} from '../scripts/build-domain-site.js';

const commit='a'.repeat(40);
const env={CLOUDFLARE_API_TOKEN:'synthetic-service',CLOUDFLARE_ACCOUNT_ID:'service',CLOUDFLARE_DOMAIN_API_TOKEN:'synthetic-domain',CLOUDFLARE_DOMAIN_ACCOUNT_ID:'domain',GH_TOKEN:'synthetic-github',GITHUB_REPOSITORY:'test/site'};
function fixture({pagesBranch='gathering-redirect',extraFile=false,badBlob=false,domainDenied=false,missingSecret=false,oldPublished=false}={}) {
  const requests=[];
  return {requests,fetcher:async(url,options={})=>{
    requests.push({url,options});assert.equal(options.method,undefined);
    let result={};
    if(url.startsWith('https://api.cloudflare.com/')) {
      if(domainDenied&&url.includes('/accounts/domain'))return new Response('',{status:403});
      if(url.endsWith('/secrets'))result=['HOST_PASSWORD','AUTH_MIGRATION_READY','GITHUB_TOKEN','DROPBOX_APP_KEY','DROPBOX_APP_SECRET'].filter(name=>!missingSecret||name!=='AUTH_MIGRATION_READY').map(name=>({name,type:'secret_text'}));
      else if(url.endsWith('/settings'))result={bindings:[{type:'r2_bucket',name:'INVITATION_BACKGROUNDS',bucket_name:'meyers-invitation-backgrounds'}]};
      else if(url.includes('/zones?'))result=[{name:'ilymmd.com',status:'active',account:{id:'domain'}}];
      return Response.json({success:true,result});
    }
    if(url.endsWith('/pages'))return Response.json({build_type:'legacy',source:{branch:pagesBranch,path:'/'}});
    if(url.includes('/git/trees/'))return Response.json({tree:[...Object.keys(redirectFiles).map((path,index)=>({path,type:'blob',sha:String(index)})),...(extraFile?[{path:'app.js',type:'blob',sha:'private'}]:[])]});
    if(url.includes('/git/blobs/'))return Response.json({encoding:'base64',content:Buffer.from(badBlob?'wrong':Object.values(redirectFiles)[Number(url.split('/').pop())]).toString('base64')});
    if(url.startsWith('https://kasstmaster.github.io/'))return new Response(oldPublished?'old application':redirectFiles['index.html']);
    throw new Error('Unexpected request');
  }};
}
test('redirect-only artifact retains invitation query/fragment and never copies application files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'redirect-test-'));
  try {
    const dest=join(root,'artifact');await buildPagesRedirect(dest);
    assert.deepEqual((await readdir(dest)).sort(),Object.keys(redirectFiles).sort());
    await assert.rejects(buildPagesRedirect(dest));
    for(const file of ['index.html','404.html']) {
      let target;const script=(await readFile(join(dest,file),'utf8')).match(/<script>([\s\S]*?)<\/script>/)[1];
      vm.runInNewContext(script,{window:{location:{search:'?event=thanksgiving&next=%2F',hash:'#/signin/account/printed-token',replace:value=>target=value}}});
      assert.equal(target,'https://themeyers.ilymmd.com/?event=thanksgiving&next=%2F#/signin/account/printed-token');
    }
  } finally {await rm(root,{recursive:true,force:true});}
});
test('preflight requires both targets, activation-secret metadata and exact published redirect',async()=>{
  const good=fixture();assert.deepEqual(await preflight(env,good.fetcher),{ready:true});
  assert.ok(good.requests.some(value=>value.url.includes('/accounts/domain')));
  for(const options of [{pagesBranch:'main'},{extraFile:true},{badBlob:true},{domainDenied:true},{missingSecret:true},{oldPublished:true}]) {
    const bad=fixture(options);await assert.rejects(preflight(env,bad.fetcher));
    assert.ok(bad.requests.every(value=>!value.url.includes('workers.dev')));
  }
  await assert.rejects(preflight({...env,CLOUDFLARE_DOMAIN_API_TOKEN:''},good.fetcher));
});
test('readiness endpoint is harmless, fails closed and contains no private configuration',async()=>{
  const ready={AUTH_MIGRATION_READY:'verified-backup-v1',HOST_PASSWORD:'synthetic-test-password-long-enough',GITHUB_TOKEN:'private-value',GITHUB_REPOSITORY:'private/repo',INVITATION_BACKGROUNDS:{},RELEASE_COMMIT:commit};
  const response=await worker.fetch(new Request('https://service/health/state-auth'),ready);
  assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.deepEqual(await response.json(),{protocol:'state-auth-v1',ready:true,commit});
  assert.equal((await worker.fetch(new Request('https://service/health/state-auth'),{})).status,503);
  assert.equal((await worker.fetch(new Request('https://service/health/state-auth',{method:'POST'}),ready)).status,405);
});
test('service gate rejects wrong version and never probes state on an old/unready service',async()=>{
  for(const body of [{ready:false,protocol:'state-auth-v1',commit},{ready:true,protocol:'old',commit},{ready:true,protocol:'state-auth-v1',commit:'b'.repeat(40)}]) {
    let calls=0;await assert.rejects(verifyService('https://service',commit,async()=>{calls++;return Response.json(body);}));assert.equal(calls,1);
  }
  const urls=[];assert.deepEqual(await verifyService('https://service',commit,async url=>{urls.push(url);return url.endsWith('/state')?new Response('',{status:401}):Response.json({ready:true,protocol:'state-auth-v1',commit});}),{ready:true});
  assert.equal(urls.length,2);
  await assert.rejects(verifyService('https://service',commit,async()=>Response.json({ready:true,protocol:'state-auth-v1',commit})));
});
test('frontend receipt is from the same reviewed build',async()=>{
  const root=await mkdtemp(join(tmpdir(),'release-test-'));
  try {await buildDomainSite(root,commit);assert.deepEqual(JSON.parse(await readFile(join(root,'themeyers/release.json'),'utf8')),{protocol:'state-auth-v1',commit});}
  finally {await rm(root,{recursive:true,force:true});}
  assert.deepEqual(await verifyFrontend(commit,async()=>Response.json({protocol:'state-auth-v1',commit})),{ready:true});
  await assert.rejects(verifyFrontend(commit,async()=>Response.json({protocol:'state-auth-v1',commit:'b'.repeat(40)})));
});
test('workflow preflights before writes, gates frontend on service, and never cancels active release',async()=>{
  const workflow=await readFile(new URL('../.github/workflows/deploy-state-worker.yml',import.meta.url),'utf8');
  assert.match(workflow,/cancel-in-progress: false/);assert.match(workflow,/pages: read/);
  const pre=workflow.indexOf('run: node scripts/release-preflight.js\n'),service=workflow.indexOf('name: Deploy existing service'),gate=workflow.indexOf('run: node scripts/release-preflight.js service'),site=workflow.indexOf('name: Deploy website routes');
  assert.ok(pre>0&&pre<service&&service<gate&&gate<site);
  assert.match(workflow,/command: deploy --var RELEASE_COMMIT:\$\{\{ github.sha \}\}/);
  assert.match(workflow,/RELEASE_COMMIT: \$\{\{ github.sha \}\}/);assert.match(workflow,/if: failure\(\) \|\| cancelled\(\)/);
  assert.match(workflow,/default: preflight/);
  assert.match(workflow,/if: github.event_name == 'workflow_dispatch' && inputs.mode != 'deploy'/);
  assert.match(workflow,/if: github.event_name == 'push' \|\| inputs.mode == 'deploy'/);
  const readOnly=workflow.split('  preflight:')[1].split('  deploy:')[0];
  assert.ok(!readOnly.includes('wrangler'));assert.ok(!readOnly.includes('command: deploy'));
  assert.match(readOnly,/STATE_REPOSITORY_TOKEN: \$\{\{ secrets.STATE_REPOSITORY_TOKEN \}\}/);
});

test('preflight backup currency uses private metadata only and rejects stale/corrupt/moving backups',async()=>{
  const path='security-backups/2026-10-28T00-00-00-000Z-test/app-state.json';
  for(const problem of ['', 'public','stale','immutable','moving','receipt']) {
    let mainReads=0;const requests=[];
    const fetcher=async(url,options)=>{
      requests.push(url);assert.equal(options.method,undefined);assert.equal(options.headers.Authorization,'Bearer private-read');
      assert.ok(!url.includes('/contents/data/app-state.json'));assert.ok(!url.includes('/contents/'+path));
      if(url.endsWith('/themeyersevents-data'))return Response.json({private:problem!=='public'});
      if(url.includes('/git/trees/main')){mainReads++;return Response.json({sha:'snapshot',tree:[{path:'data/app-state.json',type:'blob',sha:problem==='moving'&&mainReads>1?'changed':'source'},{path:path.replace('app-state.json','receipt.json'),type:'blob',sha:'receipt'}]});}
      if(url.includes('/git/blobs/receipt'))return Response.json({content:Buffer.from(JSON.stringify({repository:'kasstmaster/themeyersevents-data',branch:'main',statePath:'data/app-state.json',verified:true,restoreDryRun:problem!=='receipt',sourceBlob:problem==='stale'?'old':'source',sha256:'b'.repeat(64),backupCommit:commit,path})).toString('base64')});
      return Response.json({tree:[{path,type:'blob',sha:problem==='immutable'?'wrong':'source'}]});
    };
    if(problem)await assert.rejects(verifyBackupCurrency({STATE_REPOSITORY_TOKEN:'private-read'},fetcher));
    else {assert.deepEqual(await verifyBackupCurrency({STATE_REPOSITORY_TOKEN:'private-read'},fetcher),{ready:true});assert.equal(mainReads,2);}
  }
  await assert.rejects(verifyBackupCurrency({},async()=>{throw new Error('must not call');}));
});

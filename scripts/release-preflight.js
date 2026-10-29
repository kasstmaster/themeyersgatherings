import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {redirectFiles} from './build-pages-redirect.js';
const boundedFetch=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)});

async function api(fetcher,url,token) {
  const response=await fetcher(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json','User-Agent':'Meyers-release-check'},redirect:'error'});
  if(!response.ok)throw new Error('Required read-only API check failed. Check token permissions and target configuration privately.');
  return response.json();
}
export async function preflight(env,fetcher=boundedFetch) {
  let stage='required release credentials';
  try {
  const keys=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_DOMAIN_API_TOKEN','CLOUDFLARE_DOMAIN_ACCOUNT_ID','GH_TOKEN','GITHUB_REPOSITORY'];
  if(keys.some(key=>!env[key]))throw new Error('Required release credential or repository setting is absent.');
  const cf='https://api.cloudflare.com/client/v4';
  const get=async(path,token)=>{const data=await api(fetcher,cf+path,token);if(data.success!==true)throw new Error('Cloudflare preflight failed.');return data.result;};
  const service=`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`,domain=`/accounts/${env.CLOUDFLARE_DOMAIN_ACCOUNT_ID}`;
  // Both account/token pairs and existing Workers must be accessible before writes.
  stage='Cloudflare account access';
  await get(service,env.CLOUDFLARE_API_TOKEN);await get(domain,env.CLOUDFLARE_DOMAIN_API_TOKEN);
  stage='service Worker settings and secret metadata';
  const settings=await get(service+'/workers/scripts/curly-sun-ef0f/settings',env.CLOUDFLARE_API_TOKEN);
  const secrets=await get(service+'/workers/scripts/curly-sun-ef0f/secrets',env.CLOUDFLARE_API_TOKEN);
  for(const name of ['HOST_PASSWORD','AUTH_MIGRATION_READY','GITHUB_TOKEN','DROPBOX_APP_KEY','DROPBOX_APP_SECRET']) {
    if(!secrets.some(value=>value.name===name && value.type==='secret_text'))throw new Error('Required service secret metadata is missing.');
  }
  const bindings=settings.bindings||[];
  if(!bindings.some(value=>value.name==='INVITATION_BACKGROUNDS'&&value.type==='r2_bucket'&&value.bucket_name==='meyers-invitation-backgrounds'))throw new Error('Unexpected private storage binding.');
  stage='website Worker settings and zone';
  await get(domain+'/workers/scripts/themeyers-site/settings',env.CLOUDFLARE_DOMAIN_API_TOKEN);
  const zones=await get(`/zones?name=ilymmd.com&account.id=${env.CLOUDFLARE_DOMAIN_ACCOUNT_ID}`,env.CLOUDFLARE_DOMAIN_API_TOKEN);
  if(!zones.some(zone=>zone.name==='ilymmd.com'&&zone.status==='active'&&zone.account?.id===env.CLOUDFLARE_DOMAIN_ACCOUNT_ID))throw new Error('Website zone/account check failed.');
  const gh=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  stage='GitHub Pages configuration';
  const pages=await api(fetcher,gh+'/pages',env.GH_TOKEN);
  if(pages.build_type!=='legacy'||pages.source?.branch!=='gathering-redirect'||pages.source?.path!=='/')throw new Error('Pages must publish only the dedicated gathering-redirect branch before release.');
  stage='GitHub Pages redirect artifacts';
  const tree=await api(fetcher,gh+'/git/trees/gathering-redirect?recursive=1',env.GH_TOKEN);
  if(tree.truncated||tree.tree?.length!==Object.keys(redirectFiles).length||tree.tree.some(entry=>entry.type!=='blob'||!Object.hasOwn(redirectFiles,entry.path)))throw new Error('Pages branch must contain only the approved redirect artifact.');
  // Pin content reads to this tree, so branch changes cannot mix snapshots.
  for(const entry of tree.tree) {
    const blob=await api(fetcher,gh+'/git/blobs/'+entry.sha,env.GH_TOKEN);
    if(blob.encoding!=='base64'||Buffer.from(blob.content,'base64').toString('utf8')!==redirectFiles[entry.path])throw new Error('Pages redirect content does not match the reviewed artifact.');
  }
  // Also require actual Pages publication; source settings alone are insufficient.
  stage='published GitHub Pages redirect';
  const published=await fetcher('https://kasstmaster.github.io/themeyersgatherings/',{cache:'no-store',redirect:'error'});
  if(!published.ok||await published.text()!==redirectFiles['index.html'])throw new Error('Redirect-only Pages publication is not yet verified.');
  return {ready:true};
  } catch(error) {
    error.safeDiagnostic={stage};
    throw error;
  }
}

// Metadata and receipt reads only; never download the private state or backup.
export async function verifyBackupCurrency(env,fetcher=boundedFetch) {
  let stage='private backup repository metadata';
  try {
  if(!env.STATE_REPOSITORY_TOKEN)throw new Error('Private repository read credential is required.');
  const base='https://api.github.com/repos/kasstmaster/themeyersevents-data',token=env.STATE_REPOSITORY_TOKEN;
  if((await api(fetcher,base,token)).private!==true)throw new Error('Backup repository must remain private.');
  stage='private state and backup receipt metadata';
  const current=await api(fetcher,base+'/git/trees/main?recursive=1',token);
  if(current.truncated)throw new Error('Cannot verify a truncated tree.');
  const source=current.tree?.find(entry=>entry.path==='data/app-state.json'&&entry.type==='blob');
  const receiptEntry=current.tree?.filter(entry=>/^security-backups\/[^/]+\/receipt.json$/.test(entry.path)&&entry.type==='blob').sort((a,b)=>a.path.localeCompare(b.path)).at(-1);
  if(!source||!receiptEntry)throw new Error('Verified backup receipt is missing.');
  const path=receiptEntry.path;
  const record=await api(fetcher,base+'/git/blobs/'+receiptEntry.sha,token);
  const receipt=JSON.parse(Buffer.from(record.content,'base64').toString('utf8'));
  if(receipt.repository!=='kasstmaster/themeyersevents-data'||receipt.branch!=='main'||receipt.statePath!=='data/app-state.json'||receipt.verified!==true||receipt.restoreDryRun!==true||receipt.sourceBlob!==source.sha||!/^[a-f0-9]{64}$/.test(receipt.sha256)||!/^[a-f0-9]{40}$/.test(receipt.backupCommit)||receipt.path!==path.replace(/receipt.json$/,'app-state.json'))throw new Error('Verified backup is missing or no longer current.');
  stage='immutable backup verification';
  const immutable=await api(fetcher,base+'/git/trees/'+receipt.backupCommit+'?recursive=1',token);
  if(immutable.truncated||immutable.tree?.find(entry=>entry.path===receipt.path&&entry.type==='blob')?.sha!==source.sha)throw new Error('Immutable backup does not match the source.');
  stage='backup currency verification';
  const latest=await api(fetcher,base+'/git/trees/main?recursive=1',token);
  if(latest.truncated||latest.tree?.find(entry=>entry.path==='data/app-state.json'&&entry.type==='blob')?.sha!==source.sha)throw new Error('State changed during preflight; refresh backup.');
  return {ready:true};
  } catch(error) {
    error.safeDiagnostic={stage};
    throw error;
  }
}

export async function verifyService(url,commit,fetcher=boundedFetch) {
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid reviewed release commit.');
  const health=await fetcher(url+'/health/state-auth',{cache:'no-store',redirect:'error'});
  const data=await health.json();
  if(!health.ok||data.ready!==true||data.protocol!=='state-auth-v1'||data.commit!==commit){
    const checks={};
    for(const key of ['activationReady','hostPasswordReady','storageReady','githubReady','releaseCommitReady'])if(typeof data.checks?.[key]==='boolean')checks[key]=data.checks[key];
    throw Object.assign(new Error('Secure service readiness/commit verification failed. Do not publish the frontend.'),{safeDiagnostic:{status:health.status,protocolMatches:data.protocol==='state-auth-v1',ready:data.ready===true,commitMatches:data.commit===commit,checks}});
  }
  // The new implementation rejects before reading state; do not call on old code.
  const denied=await fetcher(url+'/state',{cache:'no-store',redirect:'error'});
  if(denied.status!==401)throw new Error('Anonymous state denial failed. Do not publish the frontend.');
  return {ready:true};
}
export async function verifyFrontend(commit,fetcher=boundedFetch,{attempts=12,delayMs=10000,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onRetry=()=>{}}={}) {
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid reviewed release commit.');
  let diagnostic={};
  for(let attempt=1;attempt<=attempts;attempt++) {
    try {
      const response=await fetcher('https://themeyers.ilymmd.com/release.json?commit='+commit,{cache:'no-store',redirect:'error'});
      diagnostic={status:response.status};
      const data=await response.json();
      diagnostic={...diagnostic,commitMatches:data.commit===commit,protocolMatches:data.protocol==='state-auth-v1'};
      if(response.ok&&diagnostic.commitMatches&&diagnostic.protocolMatches)return {ready:true};
    } catch {diagnostic={...diagnostic,requestOrJsonFailed:true};}
    if(attempt<attempts){onRetry(attempt,attempts);await wait(delayMs);}
  }
  throw Object.assign(new Error('Frontend release verification failed. Keep maintenance active.'),{safeDiagnostic:diagnostic});
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]==='service')await verifyService('https://curly-sun-ef0f.kassandraraudman.workers.dev',process.env.RELEASE_COMMIT);
    else if(process.argv[2]==='frontend')await verifyFrontend(process.env.RELEASE_COMMIT,boundedFetch,{onRetry:(attempt,total)=>console.log(`Waiting for matching frontend receipt (${attempt}/${total}).`)});
    else {await verifyBackupCurrency(process.env);await preflight(process.env);}
    console.log('Read-only release checks passed.');
  } catch(error) { console.error('Release checks failed; stop publication. Review targets, readiness and credential permissions privately. No API response bodies are logged.');if(error.safeDiagnostic)console.error(JSON.stringify(error.safeDiagnostic));process.exitCode=1; }
}

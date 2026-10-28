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
  const keys=['CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID','CLOUDFLARE_DOMAIN_API_TOKEN','CLOUDFLARE_DOMAIN_ACCOUNT_ID','GH_TOKEN','GITHUB_REPOSITORY'];
  if(keys.some(key=>!env[key]))throw new Error('Required release credential or repository setting is absent.');
  const cf='https://api.cloudflare.com/client/v4';
  const get=async(path,token)=>{const data=await api(fetcher,cf+path,token);if(data.success!==true)throw new Error('Cloudflare preflight failed.');return data.result;};
  const service=`/accounts/${env.CLOUDFLARE_ACCOUNT_ID}`,domain=`/accounts/${env.CLOUDFLARE_DOMAIN_ACCOUNT_ID}`;
  // Both account/token pairs and existing Workers must be accessible before writes.
  await get(service,env.CLOUDFLARE_API_TOKEN);await get(domain,env.CLOUDFLARE_DOMAIN_API_TOKEN);
  const settings=await get(service+'/workers/scripts/curly-sun-ef0f/settings',env.CLOUDFLARE_API_TOKEN);
  const secrets=await get(service+'/workers/scripts/curly-sun-ef0f/secrets',env.CLOUDFLARE_API_TOKEN);
  for(const name of ['HOST_PASSWORD','AUTH_MIGRATION_READY','GITHUB_TOKEN','DROPBOX_APP_KEY','DROPBOX_APP_SECRET']) {
    if(!secrets.some(value=>value.name===name && value.type==='secret_text'))throw new Error('Required service secret metadata is missing.');
  }
  const bindings=settings.bindings||[];
  if(!bindings.some(value=>value.name==='INVITATION_BACKGROUNDS'&&value.type==='r2_bucket'&&value.bucket_name==='meyers-invitation-backgrounds'))throw new Error('Unexpected private storage binding.');
  await get(domain+'/workers/scripts/themeyers-site/settings',env.CLOUDFLARE_DOMAIN_API_TOKEN);
  const zones=await get(`/zones?name=ilymmd.com&account.id=${env.CLOUDFLARE_DOMAIN_ACCOUNT_ID}`,env.CLOUDFLARE_DOMAIN_API_TOKEN);
  if(!zones.some(zone=>zone.name==='ilymmd.com'&&zone.status==='active'&&zone.account?.id===env.CLOUDFLARE_DOMAIN_ACCOUNT_ID))throw new Error('Website zone/account check failed.');
  const gh=`https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const pages=await api(fetcher,gh+'/pages',env.GH_TOKEN);
  if(pages.build_type!=='legacy'||pages.source?.branch!=='gathering-redirect'||pages.source?.path!=='/')throw new Error('Pages must publish only the dedicated gathering-redirect branch before release.');
  const tree=await api(fetcher,gh+'/git/trees/gathering-redirect?recursive=1',env.GH_TOKEN);
  if(tree.truncated||tree.tree?.length!==Object.keys(redirectFiles).length||tree.tree.some(entry=>entry.type!=='blob'||!Object.hasOwn(redirectFiles,entry.path)))throw new Error('Pages branch must contain only the approved redirect artifact.');
  // Pin content reads to this tree, so branch changes cannot mix snapshots.
  for(const entry of tree.tree) {
    const blob=await api(fetcher,gh+'/git/blobs/'+entry.sha,env.GH_TOKEN);
    if(blob.encoding!=='base64'||Buffer.from(blob.content,'base64').toString('utf8')!==redirectFiles[entry.path])throw new Error('Pages redirect content does not match the reviewed artifact.');
  }
  // Also require actual Pages publication; source settings alone are insufficient.
  const published=await fetcher('https://kasstmaster.github.io/themeyersgatherings/',{cache:'no-store',redirect:'error'});
  if(!published.ok||await published.text()!==redirectFiles['index.html'])throw new Error('Redirect-only Pages publication is not yet verified.');
  return {ready:true};
}

export async function verifyService(url,commit,fetcher=boundedFetch) {
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid reviewed release commit.');
  const health=await fetcher(url+'/health/state-auth',{cache:'no-store',redirect:'error'});
  const data=await health.json();
  if(!health.ok||data.ready!==true||data.protocol!=='state-auth-v1'||data.commit!==commit)throw new Error('Secure service readiness/commit verification failed. Do not publish the frontend.');
  // The new implementation rejects before reading state; do not call on old code.
  const denied=await fetcher(url+'/state',{cache:'no-store',redirect:'error'});
  if(denied.status!==401)throw new Error('Anonymous state denial failed. Do not publish the frontend.');
  return {ready:true};
}
export async function verifyFrontend(commit,fetcher=boundedFetch) {
  if(!/^[a-f0-9]{40}$/.test(commit))throw new Error('Invalid reviewed release commit.');
  const response=await fetcher('https://themeyers.ilymmd.com/release.json?commit='+commit,{cache:'no-store',redirect:'error'});
  const data=await response.json();
  if(!response.ok||data.commit!==commit||data.protocol!=='state-auth-v1')throw new Error('Frontend release verification failed. Keep maintenance active.');
  return {ready:true};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if(process.argv[2]==='service')await verifyService('https://curly-sun-ef0f.kassandraraudman.workers.dev',process.env.RELEASE_COMMIT);
    else if(process.argv[2]==='frontend')await verifyFrontend(process.env.RELEASE_COMMIT);
    else await preflight(process.env);
    console.log('Read-only release checks passed.');
  } catch { console.error('Release checks failed; stop publication. Review targets, readiness and credential permissions privately. No API response bodies are logged.');process.exitCode=1; }
}

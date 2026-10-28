// Explicit, one-time cloud provisioning. Never rotates an existing key or reads live state.
import {pathToFileURL} from 'node:url';
const service='https://curly-sun-ef0f.kassandraraudman.workers.dev';
export async function setupHostPush({env=process.env,fetchImpl=fetch,mask=()=>{}}={}){
 if(env.HOST_PUSH_SETUP_CONFIRM!=='CREATE_HOST_PUSH_KEYS')throw new Error('Explicit setup confirmation is required.');
 if(!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID||'')||!env.CLOUDFLARE_API_TOKEN)throw new Error('Cloudflare setup credentials are missing.');
 const readiness=await fetchImpl(service+'/health/host-push',{redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!readiness.ok||(await readiness.json()).protocol!=='host-push-v1')throw new Error('Deploy the reviewed host-push feature first.');
 const url=`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/curly-sun-ef0f/secrets`;
 const headers={Authorization:'Bearer '+env.CLOUDFLARE_API_TOKEN,'Content-Type':'application/json'};
 const metadata=await fetchImpl(url,{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
 if(!metadata.ok)throw new Error('Cloudflare secret metadata could not be checked.');
 const data=await metadata.json();if(!data.success||!Array.isArray(data.result))throw new Error('Cloudflare secret metadata was invalid.');
 if(data.result.some(item=>item.name==='HOST_PUSH_VAPID'))throw new Error('Host push keys already exist. Setup will not replace or rotate them.');
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const publicKey=Buffer.from(await crypto.subtle.exportKey('raw',pair.publicKey)).toString('base64url'),privateKey=(await crypto.subtle.exportKey('jwk',pair.privateKey)).d;
 const value=JSON.stringify({version:1,publicKey,privateKey});mask(privateKey);mask(value);
 const result=await fetchImpl(url,{method:'PUT',headers,redirect:'error',signal:AbortSignal.timeout(15000),body:JSON.stringify({name:'HOST_PUSH_VAPID',type:'secret_text',text:value})});
 if(!result.ok||(await result.json()).success!==true)throw new Error('Cloudflare did not confirm setup. Inspect secret metadata before retrying; never rotate blindly.');
 return {configured:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 setupHostPush({mask:value=>{if(process.env.GITHUB_ACTIONS==='true')console.log('::add-mask::'+value);}})
 .then(()=>console.log('Host push signing secret created. Existing credentials and gathering data were not changed.'))
 .catch(()=>{console.error('Host push setup stopped. Check readiness, permissions and whether the secret already exists. No credentials or API response bodies are logged.');process.exitCode=1;});
}

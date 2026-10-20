const CONFIG = 'dropbox-private/connection';
const STATE = 'dropbox-private/oauth/';
let cachedAccess;
const encode = value => btoa(String.fromCharCode(...value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const configured = env => Boolean(env.DROPBOX_APP_KEY && env.DROPBOX_APP_SECRET);
async function read(bucket, key) { const object=await bucket.get(key);return object?JSON.parse(await object.text()):null; }
async function write(bucket,key,value){await bucket.put(key,JSON.stringify(value));}
async function tokenRequest(env, values) {
  const result=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:`Basic ${btoa(`${env.DROPBOX_APP_KEY}:${env.DROPBOX_APP_SECRET}`)}`},body:new URLSearchParams(values)});
  const body=await result.json();
  if(!result.ok)throw new Error('Dropbox authorization failed. Reconnect Dropbox from Host View.');
  return body;
}
async function accessToken(env, forceRefresh = false) {
  if(!configured(env))throw new Error('Dropbox is not configured.');
  const connection=await read(env.INVITATION_BACKGROUNDS,CONFIG);
  if(!connection?.refreshToken)throw new Error('The host needs to connect Dropbox first.');
  if(!forceRefresh && cachedAccess?.refreshToken===connection.refreshToken && cachedAccess.expires>Date.now()+60000)return cachedAccess.token;
  const result=await tokenRequest(env,{grant_type:'refresh_token',refresh_token:connection.refreshToken});
  cachedAccess={refreshToken:connection.refreshToken,token:result.access_token,expires:Date.now()+result.expires_in*1000};return result.access_token;
}
async function content(env, endpoint, args, bytes = new Uint8Array()) {
  const token=await accessToken(env);
  const result=await fetch(`https://content.dropboxapi.com/2/files/${endpoint}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream','Dropbox-API-Arg':JSON.stringify(args).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))},body:bytes});
  const body=await result.json().catch(()=>({}));
  if(!result.ok){const error=new Error(result.status===429?'Dropbox is busy. Please retry shortly.':'Dropbox could not accept this upload. Please retry.');error.correctOffset=body.error?.correct_offset;throw error;}
  return body;
}
async function connectionStatus(env) {
  if(!configured(env))return {configured:false,connected:false};
  if(!(await read(env.INVITATION_BACKGROUNDS,CONFIG))?.refreshToken)return {configured:true,connected:false};
  try { await accessToken(env,true); return {configured:true,connected:true}; }
  catch { return {configured:true,connected:false}; }
}
export async function handleDropboxOAuth(request,env,{response,jsonResponse,requireHost}) {
  const url=new URL(request.url),bucket=env.INVITATION_BACKGROUNDS;
  const reply=(value,status=200)=>jsonResponse(request,env,value,status);
  if(!bucket)return reply({error:'Storage is not configured.'},503);
  const redirectUri=`${url.origin}/dropbox/callback`;
  if(url.pathname==='/dropbox/callback') {
    const state=url.searchParams.get('state')||'';
    if(!/^[a-f0-9-]{36}$/.test(state))return response(request,env,'Invalid Dropbox connection request.',400);
    const record=await read(bucket,STATE+state);await bucket.delete(STATE+state);
    if(!record || record.expires<Date.now() || url.searchParams.has('error') || !url.searchParams.get('code'))return response(request,env,'Dropbox connection expired or was canceled. Return to the website and choose Connect Dropbox again.',400);
    try{
      const result=await tokenRequest(env,{grant_type:'authorization_code',code:url.searchParams.get('code'),redirect_uri:record.redirectUri,code_verifier:record.verifier});
      if(!result.refresh_token)throw new Error('Missing renewable access.');
      await write(bucket,CONFIG,{refreshToken:result.refresh_token,connectedAt:new Date().toISOString()});cachedAccess=null;
      return response(request,env,'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dropbox connected</title></head><body><h1>Dropbox connected</h1><p>You can close this tab and return to the wedding website. The website will check the connection when you return.</p></body></html>',200,{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});
    }catch{return response(request,env,'Dropbox could not be connected. Verify the app settings and try Connect Dropbox again.',502);}
  }
  if(!requireHost(request,env))return reply({error:'Host authentication required.'},401);
  if(url.pathname==='/dropbox/status' && request.method==='GET')return reply({...await connectionStatus(env),redirectUri});
  if(url.pathname==='/dropbox/connect' && request.method==='POST') {
    if(!configured(env))return reply({error:'Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET to the Worker secrets first.'},503);
    const state=crypto.randomUUID(),verifier=encode(crypto.getRandomValues(new Uint8Array(32)));
    const challenge=encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
    await write(bucket,STATE+state,{verifier,redirectUri,expires:Date.now()+10*60*1000});
    const params=new URLSearchParams({client_id:env.DROPBOX_APP_KEY,response_type:'code',redirect_uri:redirectUri,token_access_type:'offline',scope:'files.content.write',state,code_challenge:challenge,code_challenge_method:'S256',force_reapprove:'true'});
    return reply({url:`https://www.dropbox.com/oauth2/authorize?${params}`});
  }
  return reply({error:'Not found.'},404);
}
const safeName=value=>String(value||'Upload').normalize('NFKC').replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').replace(/[. ]+$/,'').slice(0,120)||'Upload';
export async function handleDropboxUpload(request,env,identity,{jsonResponse}) {
  const reply=(value,status=200)=>jsonResponse(request,env,value,status);
  const url=new URL(request.url),bucket=env.INVITATION_BACKGROUNDS;
  const base=`dropbox-private/uploads/${identity.owner}/`;
  if(url.pathname==='/wedding-media/dropbox-upload/status' && request.method==='GET')return reply({connected:(await connectionStatus(env)).connected});
  if(url.pathname==='/wedding-media/dropbox-upload/start' && request.method==='POST') {
    const input=await request.json().catch(()=>null);
    const types=['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/ogg'];
    if(!input || !types.includes(input.contentType) || !Number.isSafeInteger(input.size) || input.size<=0 || typeof input.name!=='string')return reply({error:'Choose a supported photo or video.'},400);
    try {
      const started=await content(env,'upload_session/start',{close:false});const id=crypto.randomUUID();
      await write(bucket,base+id,{sessionId:started.session_id,offset:0,size:input.size,name:safeName(input.name),contentType:input.contentType,path:`/${identity.eventId && identity.eventId !== 'wedding' ? `Gathering Uploads/${safeName(identity.eventId)}` : 'Wedding Uploads'}/${safeName(identity.accountName)}/${safeName(identity.uploadedBy)}/${id}-${safeName(input.name)}`});
      return reply({id,offset:0});
    }catch(error){return reply({error:error.message},503);}
  }
  const match=/^\/wedding-media\/dropbox-upload\/([a-f0-9-]{36})\/(chunk|finish)$/.exec(url.pathname);
  if(!match || request.method!=='POST')return reply({error:'Not found.'},404);
  const job=await read(bucket,base+match[1]);if(!job)return reply({error:'Upload not found for this account.'},404);
  if(job.completed)return reply({ok:true,offset:job.offset});
  try {
    if(match[2]==='chunk') {
      if(Number(request.headers.get('Content-Length')||0)>8*1024*1024)return reply({error:'Upload chunk is too large.'},413);
      const bytes=new Uint8Array(await request.arrayBuffer()),offset=Number(url.searchParams.get('offset'));
      if(!bytes.length || bytes.length>8*1024*1024 || !Number.isSafeInteger(offset) || offset<0 || offset+bytes.length>job.size)return reply({error:'Invalid upload chunk.'},400);
      if(offset+bytes.length===job.offset)return reply({offset:job.offset});
      if(offset!==job.offset)return reply({error:'Upload position changed. Retry this file.',offset:job.offset},409);
      try{await content(env,'upload_session/append_v2',{cursor:{session_id:job.sessionId,offset},close:false},bytes);}catch(error){if(error.correctOffset!==offset+bytes.length)throw error;}
      job.offset+=bytes.length;await write(bucket,base+match[1],job);return reply({offset:job.offset});
    }
    if(job.offset!==job.size)return reply({error:'The file has not finished uploading.'},409);
    await content(env,'upload_session/finish',{cursor:{session_id:job.sessionId,offset:job.offset},commit:{path:job.path,mode:'add',autorename:false,mute:true}});
    await bucket.put(`wedding-media/uploads/${identity.owner}/${match[1]}`,'',{customMetadata:{eventId:identity.eventId || 'wedding',kind:'dropbox',name:job.name,uploadedBy:identity.uploadedBy,accountName:identity.accountName,uploadedAt:new Date().toISOString(),contentType:job.contentType}});
    job.completed=true;await write(bucket,base+match[1],job);return reply({ok:true});
  }catch(error){return reply({error:error.message},503);}
}

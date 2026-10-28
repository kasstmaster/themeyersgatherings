import {authenticate,login,logout,boundedJson} from './auth.js';
import {releaseReadiness} from './release-readiness.js';
import {projectState,updateFromChanges,accountForActor} from './state-access.js';
import '../guest-planning.js';
import '../gathering-history.js';
import { handleDropboxOAuth } from './dropbox.js';
import { handleWeddingMedia } from './wedding-media.js';
const GITHUB_API = 'https://api.github.com';

function allowedOrigins(env) {
  const origins = [env.ALLOWED_ORIGIN, env.ALLOWED_ORIGINS].filter(Boolean).join(',').split(/[\s,]+/).filter(Boolean);
  return origins.length ? [...new Set(origins)] : ['*'];
}
function originAllowed(origin, env) {
  const origins = allowedOrigins(env);
  return !origin || origins.includes('*') || origins.includes(origin);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const origins = allowedOrigins(env);
  const allowedOrigin = origins.includes('*') ? '*' : origins.includes(origin) ? origin : origins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Media-Session, Range, If-Match',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function response(request, env, body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...corsHeaders(request, env), ...headers } });
}

function jsonResponse(request, env, value, status = 200) {
  return response(request, env, JSON.stringify(value), status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy':'no-referrer' });
}

function githubHeaders(env) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'meyers-family-events-state-worker',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function repositoryConfig(env) {
  const [owner, repository, extra] = (env.GITHUB_REPOSITORY || '').split('/');
  if (!owner || !repository || extra || !env.GITHUB_TOKEN) {
    throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN must be configured.');
  }
  const path = (env.GITHUB_STATE_PATH || 'data/app-state.json').split('/').map(encodeURIComponent).join('/');
  const branch = env.GITHUB_BRANCH || 'main';
  return { url: `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${path}`, branch };
}

const requestActors=new WeakMap();
function requireHost(request) {return requestActors.get(request)?.role==='host';}

const INVITATION_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
function invitationBackgroundKey(pathname) {
  const match = /^\/invitation-backgrounds\/([a-zA-Z0-9-]+)$/.exec(pathname);
  return match ? `invitation-backgrounds/${match[1]}` : '';
}
async function handleInvitationBackground(request, env, key) {
  if (!env.INVITATION_BACKGROUNDS) return response(request, env, 'Invitation background storage is not configured.', 503);
  if (request.method === 'GET') {
    const object = await env.INVITATION_BACKGROUNDS.get(key);
    if (!object) return response(request, env, 'Not found.', 404);
    return response(request, env, object.body, 200, { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'public, max-age=3600', 'ETag': object.httpEtag });
  }
  if (!requireHost(request, env)) return response(request, env, 'Host authentication failed.', 401);
  if (request.method === 'PUT') {
    const contentType = (request.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
    if (!INVITATION_IMAGE_TYPES.has(contentType)) return response(request, env, 'Only PNG, JPEG, and WebP images are supported.', 415);
    const declaredSize = Number(request.headers.get('Content-Length') || 0);
    if (declaredSize > 15_000_000) return response(request, env, 'Image is too large (15 MB maximum).', 413);

    // Browser request bodies are not guaranteed to arrive as fixed-length
    // streams. R2 rejects streams without a known length, which previously
    // surfaced to hosts as the generic "Unable to access shared state" error.
    // Buffering also lets us enforce the limit when Content-Length is omitted.
    const image = await request.arrayBuffer();
    if (image.byteLength > 15_000_000) return response(request, env, 'Image is too large (15 MB maximum).', 413);
    await env.INVITATION_BACKGROUNDS.put(key, image, { httpMetadata: { contentType }, customMetadata: { uploadedAt: new Date().toISOString() } });
    return jsonResponse(request, env, { ok: true });
  }
  if (request.method === 'DELETE') { await env.INVITATION_BACKGROUNDS.delete(key); return response(request, env, null, 204); }
  return response(request, env, 'Method not allowed.', 405, { Allow: 'GET, PUT, DELETE, OPTIONS' });
}

const ATTIRE_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);
const MAX_ATTIRE_VIDEO_BYTES = 50_000_000;
async function handleAttireVideo(request, env, key) {
  const bucket = env.INVITATION_BACKGROUNDS;
  if (!bucket) return response(request, env, 'Video storage is not configured. Deploy the latest Worker and verify its R2 bucket.', 503);
  if (request.method === 'GET') {
    const range = request.headers.get('Range');
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return response(request, env, 'Unsupported video range.', 416);
    let partial;
    if (range) {
      const metadata = await bucket.head(key);
      if (!metadata) return response(request, env, 'Not found.', 404);
      const [first, last] = range.slice(6).split('-');
      const start = first ? Number(first) : Math.max(0, metadata.size - Number(last));
      const end = first && last ? Math.min(Number(last), metadata.size - 1) : metadata.size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= metadata.size || (!first && Number(last) === 0)) {
        return response(request, env, 'Range not satisfiable.', 416, { 'Content-Range': `bytes */${metadata.size}` });
      }
      partial = { offset: start, length: end - start + 1 };
    }
    const object = await bucket.get(key, partial ? { range: partial } : undefined);
    if (!object) return response(request, env, 'Not found.', 404);
    const headers = {
      'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
      'Cache-Control': 'public, max-age=3600', 'Accept-Ranges': 'bytes',
      'Content-Length': String(partial ? partial.length : object.size),
      'ETag': object.httpEtag, 'X-Content-Type-Options': 'nosniff'
    };
    if (partial) headers['Content-Range'] = `bytes ${partial.offset}-${partial.offset + partial.length - 1}/${object.size}`;
    return response(request, env, object.body, partial ? 206 : 200, headers);
  }
  if (!requireHost(request, env)) return response(request, env, 'Host authentication failed.', 401);
  if (request.method === 'DELETE') { await bucket.delete(key); return response(request, env, null, 204); }
  if (request.method !== 'PUT') return response(request, env, 'Method not allowed.', 405);
  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
  if (!ATTIRE_VIDEO_TYPES.has(contentType)) return response(request, env, 'Only MP4, WebM, and Ogg videos are supported.', 415);
  if (Number(request.headers.get('Content-Length') || 0) > MAX_ATTIRE_VIDEO_BYTES) return response(request, env, 'Video is too large (50 MB maximum).', 413);
  // Bound streamed bodies too, without trusting Content-Length.
  const reader = request.body?.getReader();
  const chunks = []; let size = 0;
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTIRE_VIDEO_BYTES) { await reader.cancel(); return response(request, env, 'Video is too large (50 MB maximum).', 413); }
      chunks.push(value);
    }
  }
  if (!size) return response(request, env, 'Video file is empty.', 400);
  const video = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { video.set(chunk, offset); offset += chunk.byteLength; }
  await bucket.put(key, video.buffer, { httpMetadata: { contentType }, customMetadata: { uploadedAt: new Date().toISOString() } });
  return jsonResponse(request, env, { ok: true });
}

async function dispatchAnyListSync(env, syncId) {
  const [owner, repository] = (env.GITHUB_WORKFLOW_REPOSITORY || '').split('/');
  if (!owner || !repository) throw new Error('GITHUB_WORKFLOW_REPOSITORY must be configured.');
  const result = await fetch(`${GITHUB_API}/repos/${owner}/${repository}/actions/workflows/sync-anylist.yml/dispatches`, {
    method: 'POST', headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: env.GITHUB_WORKFLOW_BRANCH || 'main', inputs: { sync_id: syncId } })
  });
  if (!result.ok) return { status: 502, error: `GitHub workflow dispatch failed (${result.status}).` };
  return { status: 202 };
}

async function readSyncStatus(env, syncId) {
  if (!/^[a-f0-9-]{36}$/.test(syncId)) return { status: 400, error: 'Invalid sync ID.' };
  const config = repositoryConfig(env);
  const path = `.anylist-sync/${syncId}.json`.split('/').map(encodeURIComponent).join('/');
  const url = config.url.replace((env.GITHUB_STATE_PATH || 'data/app-state.json').split('/').map(encodeURIComponent).join('/'), path);
  const result = await fetch(`${url}?ref=${encodeURIComponent(config.branch)}`, { headers: githubHeaders(env) });
  if (result.status === 404) return { status: 200, text: JSON.stringify({ state: 'running' }) };
  if (!result.ok) return { status: 502, error: `GitHub status read failed (${result.status}).` };
  const file = await result.json();
  return { status: 200, text: base64ToText(file.content) };
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

function base64ToText(value) {
  const binary = atob(value.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)));
}

async function readState(env) {
  const { url, branch } = repositoryConfig(env);
  const result = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: githubHeaders(env) });
  if (result.status === 404) return { status: 404 };
  if (!result.ok) return { status: 502, error: `GitHub read failed (${result.status}).` };
  const file = await result.json();
  return { status: 200, sha: file.sha, text: base64ToText(file.content) };
}

async function writeState(env, text, {historyOnly=false} = {}) {
  const { url, branch } = repositoryConfig(env);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readState(env);
    if (current.status !== 200 && current.status !== 404) return current;
    if(historyOnly && current.status===404)return {status:200};
    const stored=current.status===200?JSON.parse(current.text):{events:{},accounts:[]};
    GatheringHistory.archiveDue(stored);
    const next=historyOnly?stored:JSON.parse(text);
    GatheringHistory.preserve(next,stored);GatheringHistory.archiveDue(next);
    const content=`${JSON.stringify(next,null,2)}\n`;
    if(content.length>1_000_000)return {status:413,error:'State is too large.'};
    if (current.text === content) return { status: 200, text:content };
    const body = {
      message: 'Update shared family event state',
      content: bytesToBase64(new TextEncoder().encode(content)),
      branch
    };
    if (current.sha) body.sha = current.sha;
    const result = await fetch(url, {
      method: 'PUT',
      headers: { ...githubHeaders(env), 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (result.ok) return { status: 200, text:content };
    if (result.status !== 409) return { status: 502, error: `GitHub write failed (${result.status}).` };
  }
  return { status: 409, error: 'The state changed at the same time. Please try again.' };
}

async function writeConditional(env,next,sha) {
 const {url,branch}=repositoryConfig(env);
 const text=JSON.stringify(next,null,2)+'\n';
 if(new TextEncoder().encode(text).length>1_000_000)return {status:413};
 const result=await fetch(url,{method:'PUT',headers:{...githubHeaders(env),'Content-Type':'application/json'},body:JSON.stringify({message:'Save authorized gathering changes',branch,sha,content:bytesToBase64(new TextEncoder().encode(text))})});
 if(result.status===409||result.status===422)return {status:409};
 if(!result.ok)return {status:502};
 const data=await result.json();return {status:200,revision:data.content.sha};
}
async function secureState(request,env,url,actor) {
 if(url.pathname!=='/auth/login'&&!actor)return jsonResponse(request,env,{error:'Sign in to continue.'},401);
 if(url.pathname==='/auth/login'&&request.method!=='POST')return jsonResponse(request,env,{error:'Method not allowed.'},405);
 if(url.pathname.startsWith('/auth/')&&!['/auth/login','/auth/logout','/auth/session'].includes(url.pathname))return jsonResponse(request,env,{error:'Not found.'},404);
 let result,state;
 const load=async()=>{if(!result){result=await readState(env);if(result.status!==200)throw Object.assign(new Error('Shared state is unavailable.'),{status:503});state=JSON.parse(result.text);}return state;};
 if(url.pathname==='/auth/login'&&request.method==='POST'){
  const session=await login(request,env,load);if(session.next)return jsonResponse(request,env,{next:session.next});await load();return jsonResponse(request,env,{token:session.token,expires:session.expires,role:session.identity.role,person:session.identity.person,state:projectState(state,session.identity),revision:result.sha});
 }
 if(url.pathname==='/auth/logout'&&request.method==='POST'){await logout(request,env);return response(request,env,null,204);}
 await load();
 if(!actor)return jsonResponse(request,env,{error:'Sign in to continue.'},401);
 if(actor.role!=='host'&&!accountForActor(state,actor))return jsonResponse(request,env,{error:'Session no longer valid.'},401);
 if(url.pathname==='/auth/session'){
  if(request.method!=='POST')return jsonResponse(request,env,{error:'Method not allowed.'},405);
  const input=await boundedJson(request,8192),account=actor.role==='guest'?accountForActor(state,actor):null;
  if(!input||typeof input!=='object'||Array.isArray(input))return jsonResponse(request,env,{error:'Invalid request.'},400);
  if(input.qrToken&&account&&account.qrToken!==input.qrToken)return jsonResponse(request,env,{error:'Sign in for this invitation.'},401);
  const view=projectState(state,actor);if(actor.role==='guest'&&!Object.keys(view.events).length)return jsonResponse(request,env,{error:'Session no longer valid.'},401);
  return jsonResponse(request,env,{token:request.headers.get('Authorization').slice(7),expires:actor.expires,role:actor.role,person:actor.person,state:view,revision:result.sha});
 }
 if(request.method==='GET'){
  if(GatheringHistory.archiveDue(state)){const archived=await writeState(env,null,{historyOnly:true});if(archived.status!==200)return jsonResponse(request,env,{error:'Could not preserve history.'},503);result=await readState(env);if(result.status!==200)return jsonResponse(request,env,{error:'State unavailable.'},503);state=JSON.parse(result.text);}
  return jsonResponse(request,env,{state:projectState(state,actor),revision:result.sha});
 }
 if(request.method!=='PATCH')return jsonResponse(request,env,{error:'Upgrade this page before saving.'},405);
 if(!request.headers.has('If-Match'))return jsonResponse(request,env,{error:'Reload the current revision before saving.'},428);
 if(request.headers.get('If-Match')!==result.sha)return jsonResponse(request,env,{error:'Newer information is available. Your changes were not applied.'},409);
 const payload=await boundedJson(request);GatheringHistory.archiveDue(state);const next=updateFromChanges(state,actor,payload.changes);
 GatheringHistory.preserve(next,state);next.savedAt=new Date().toISOString();
 const saved=await writeConditional(env,next,result.sha);
 if(saved.status!==200)return jsonResponse(request,env,{error:saved.status===409?'Newer information is available. Your changes were not applied.':'Changes could not be saved.'},saved.status);
 return jsonResponse(request,env,{state:projectState(next,actor),revision:saved.revision});
}
export default {
  async scheduled(_event,env) {
    const result=await writeState(env,null,{historyOnly:true});
    if(result.status!==200)throw new Error(result.error || 'Could not save gathering history.');
  },
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (!originAllowed(origin, env)) {
      return response(request, env, 'Origin not allowed.', 403);
    }
    if (request.method === 'OPTIONS') return response(request, env, null, 204);
    try {
      const url = new URL(request.url);
      if(url.pathname==='/health/state-auth')return request.method==='GET'?releaseReadiness(env):response(request,env,null,405);
      const actor=await authenticate(request,env);if(actor)requestActors.set(request,actor);
      if(url.pathname==='/'||url.pathname==='/state'||url.pathname.startsWith('/auth/'))return await secureState(request,env,url,actor);

      if (url.pathname.startsWith('/dropbox/')) return await handleDropboxOAuth(request, env, { response, jsonResponse, requireHost });
      if (url.pathname === '/wedding-media' || url.pathname.startsWith('/wedding-media/')) return await handleWeddingMedia(request, env, { response, jsonResponse, requireHost, readState, actor });
      const videoMatch = /^\/attire-videos\/([a-zA-Z0-9-]+)$/.exec(url.pathname);
      if (videoMatch) {
        try { return await handleAttireVideo(request, env, `attire-videos/${videoMatch[1]}`); }
        catch (error) {
          console.error('Attire video storage failed.', error);
          return response(request, env, 'Video storage failed. Deploy the latest Worker and verify that its R2 bucket exists.', 503);
        }
      }
      const backgroundKey = invitationBackgroundKey(url.pathname);
      if (backgroundKey) {
        try {
          return await handleInvitationBackground(request, env, backgroundKey);
        } catch (error) {
          console.error('Invitation background storage failed.', error);
          return response(request, env, 'Invitation background storage failed. Deploy the latest Worker and verify that its R2 bucket exists.', 503);
        }
      }
      if (url.pathname === '/anylist-sync' || url.pathname === '/anylist-sync/status') {
        if (!requireHost(request, env)) return jsonResponse(request, env, { error: 'host_authentication_failed' }, 401);
        if (url.pathname === '/anylist-sync' && request.method === 'POST') {
          const syncId = crypto.randomUUID();
          const result = await dispatchAnyListSync(env, syncId);
          if (result.error) return jsonResponse(request, env, { error: 'workflow_dispatch_failed' }, result.status);
          return jsonResponse(request, env, { syncId }, result.status);
        }
        if (url.pathname === '/anylist-sync/status' && request.method === 'GET') {
          const result = await readSyncStatus(env, url.searchParams.get('id') || '');
          if (result.error) return jsonResponse(request, env, { error: 'status_read_failed' }, result.status);
          return response(request, env, result.text, result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy':'no-referrer' });
        }
        return response(request, env, 'Method not allowed.', 405);
      }
      return response(request,env,'Not found.',404);
    } catch (error) {
      return jsonResponse(request,env,{error:error.status&&error.status<500?error.message:'Unable to access shared state.'},error.status||500);
    }
  }
};

const GITHUB_API = 'https://api.github.com';

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin === '*' ? '*' : (origin === allowedOrigin ? origin : allowedOrigin),
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Host-Password',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function response(request, env, body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { ...corsHeaders(request, env), ...headers } });
}

function jsonResponse(request, env, value, status = 200) {
  return response(request, env, JSON.stringify(value), status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
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

function safeEqual(left, right) {
  const a = new TextEncoder().encode(left || '');
  const b = new TextEncoder().encode(right || '');
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index] || 0) ^ (b[index] || 0);
  return difference === 0;
}

function requireHost(request, env) {
  return env.HOST_PASSWORD && safeEqual((request.headers.get('X-Host-Password') || '').toLowerCase(), env.HOST_PASSWORD.toLowerCase());
}

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

async function writeState(env, text) {
  const { url, branch } = repositoryConfig(env);
  const content = `${text}\n`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const current = await readState(env);
    if (current.status !== 200 && current.status !== 404) return current;
    if (current.text === content) return { status: 200 };
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
    if (result.ok) return { status: 200 };
    if (result.status !== 409) return { status: 502, error: `GitHub write failed (${result.status}).` };
  }
  return { status: 409, error: 'The state changed at the same time. Please try again.' };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return response(request, env, null, 204);
    const origin = request.headers.get('Origin');
    if (env.ALLOWED_ORIGIN && origin && origin !== env.ALLOWED_ORIGIN) {
      return response(request, env, 'Origin not allowed.', 403);
    }
    try {
      const url = new URL(request.url);
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
          return response(request, env, result.text, result.status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        }
        return response(request, env, 'Method not allowed.', 405);
      }
      if (request.method === 'GET') {
        const result = await readState(env);
        if (result.status === 404) return response(request, env, null, 404);
        if (result.status !== 200) return response(request, env, result.error, result.status);
        return response(request, env, result.text, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      }
      if (request.method === 'PUT') {
        if (Number(request.headers.get('Content-Length') || 0) > 1_000_000) return response(request, env, 'State is too large.', 413);
        const state = await request.json();
        if (!state || typeof state !== 'object' || !state.events || !Array.isArray(state.accounts)) {
          return response(request, env, 'Invalid application state.', 400);
        }
        const text = JSON.stringify(state, null, 2);
        if (text.length > 1_000_000) return response(request, env, 'State is too large.', 413);
        const result = await writeState(env, text);
        return response(request, env, result.error || null, result.status);
      }
      return response(request, env, 'Method not allowed.', 405, { 'Allow': 'GET, PUT, OPTIONS' });
    } catch (error) {
      console.error(error);
      return response(request, env, 'Unable to access shared state.', 500);
    }
  }
};

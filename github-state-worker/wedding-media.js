import '../gathering-history.js';
import {eventAllowed} from './permissions.js';
import {digest,boundedJson} from './auth.js';
import { handleDropboxUpload } from './dropbox.js';
import { accountPeople, normalizedPerson } from '../scripts/anylist-accounts.js';
const PREFIX = 'wedding-media/';
const TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif','image/avif','image/heic','image/heif','video/mp4','video/quicktime','video/webm','video/ogg']);
const ID = /^[a-f0-9-]{36}$/;
const OWNER = /^[a-f0-9]{64}$/;
async function ownerId(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function handleWeddingMedia(request, env, { response, jsonResponse, requireHost, readState, actor }) {
  const bucket = env.INVITATION_BACKGROUNDS;
  const scopeAllowed=(state,eventId,date,account,host=false)=>{
    if(GatheringHistory.record(state,eventId,date))return false;
    const snapshot=state.gatheringHistory?.[eventId]?.[date];
    if(snapshot)return host||Boolean(GatheringHistory.historicalAccount(state,account,snapshot));
    const event=state.events?.[eventId];return Boolean(event&&event.eventDate===date&&!event.cancelled&&(host||eventAllowed(account,eventId)));
  };
  const reply = (value, status = 200) => jsonResponse(request, env, value, status);
  const fail = (error, status) => reply({ error }, status);
  if (!bucket) return fail('Photo and video upload storage is not configured.', 503);
  const url = new URL(request.url), route = url.pathname.replace('/wedding-media', '') || '/';
  if(!actor && (route==='/session'||!/^\/uploads\//.test(route)))return fail('Sign in before accessing uploads.',401);
  if (route === '/session' && request.method === 'POST') {
    const body=await boundedJson(request,8192);if(!body||typeof body!=='object')return fail('Invalid sign-in request.',400);
    let identity;
    if (requireHost(request, env) && !body.preview) identity = { host: true, owner: await ownerId('host'), accountName: 'The Host', uploadedBy: 'The Host' };
    else {
      const name=actor.role==='host'&&body.preview?(typeof body.name==='string'?body.name.trim():''):actor.person||'';
      if (!normalizedPerson(name)) return fail('Sign in before uploading.', 401);
      const result = await readState(env);
      if (result.status !== 200) return fail('Unable to verify your sign-in. Please try again.', 503);
      const state = JSON.parse(result.text);
      const eventId=typeof body.eventId==='string'?body.eventId:'wedding';
      if(!Object.hasOwn(state.events || {},eventId)&&!state.gatheringHistory?.[eventId]?.[body.archiveDate])return fail('That gathering is not available.',401);
      const matches = (state.accounts || []).flatMap(account => {
        if (!(body.archiveDate?scopeAllowed(state,eventId,body.archiveDate,account):eventAllowed(account,eventId)) || actor.role!=='host' && (account.qrToken||account.anyListCategoryId||account.name)!==actor.accountId) return [];
        const names = accountPeople(account.name);
        const canonical = names.find(person => normalizedPerson(person) === normalizedPerson(name));
        const alias = (account.signInAliases || []).find(entry => normalizedPerson(entry.alias) === normalizedPerson(name) && names.some(person => normalizedPerson(person) === normalizedPerson(entry.name)));
        return canonical || alias ? [{ account, person: canonical || alias.name }] : [];
      });
      if (matches.length !== 1) return fail('Your gathering account could not be verified.', 401);
      const { account, person } = matches[0];
      identity = { host: false, owner: await ownerId(String(account.anyListCategoryId || account.qrToken || account.name)), accountName: account.name, uploadedBy: person };
    }
    const requestedEventId=typeof body.eventId==='string'?body.eventId:identity.host?null:'wedding';
    if(requestedEventId){
      const result=await readState(env);if(result.status!==200)return fail('Unable to verify the gathering.',503);
      const state=JSON.parse(result.text),eventId=requestedEventId,date=body.archiveDate||state.events?.[eventId]?.eventDate;
      const account=state.accounts?.find(a=>(a.qrToken||a.anyListCategoryId||a.name)===actor.accountId);
      if(!scopeAllowed(state,eventId,date,account,identity.host))return fail('That gathering is not available.',403);
      identity={...identity,accountId:actor.accountId,eventId,eventDate:date,readOnly:Boolean(body.archiveDate)};
    }
    const token = crypto.randomUUID() + crypto.randomUUID();
    const expires = Date.now() + 60 * 60 * 1000;
    await bucket.put(`${PREFIX}sessions/${token}`, JSON.stringify({ ...identity, expires, stateSessionVersion:actor.version, issuedToRole:actor.role }), { httpMetadata: { contentType: 'application/json' } });
    return reply({ token, expires });
  }
  const token = request.headers.get('X-Media-Session') || url.searchParams.get('session') || '';
  if (!/^[a-f0-9-]{72}$/.test(token)) return fail('Sign in before accessing uploads.', 401);
  const sessionObject = await bucket.get(`${PREFIX}sessions/${token}`);
  if (!sessionObject) return fail('Your upload session has expired. Please try again.', 401);
  const identity = JSON.parse(await sessionObject.text());
  if(identity.stateSessionVersion!==await digest(env.HOST_PASSWORD||''))return fail('Sign in again to access uploads.',401);
  if (identity.expires < Date.now()) { await bucket.delete(`${PREFIX}sessions/${token}`); return fail('Your upload session has expired. Please try again.', 401); }
  if(actor && (identity.issuedToRole!==actor.role||actor.role!=='host'&&(identity.host||identity.uploadedBy!==actor.person)))return fail('Sign in before accessing uploads.',401);
  if(identity.eventId){
    const result=await readState(env);if(result.status!==200)return fail('Unable to verify the gathering.',503);
    const state=JSON.parse(result.text),account=state.accounts?.find(a=>(a.qrToken||a.anyListCategoryId||a.name)===identity.accountId);
    if(!scopeAllowed(state,identity.eventId,identity.eventDate,account,identity.host))return fail('That gathering is not available.',403);
    if(identity.readOnly&&request.method!=='GET')return fail('Past gatherings are read-only.',403);
  }
  if (url.pathname.startsWith('/wedding-media/dropbox-upload/')) return await handleDropboxUpload(request, env, identity, { jsonResponse });
  const prefix = `${PREFIX}uploads/`;
  if (route === '/' && request.method === 'GET') {
    const items = []; let cursor;
    do {
      const page = await bucket.list({ prefix: identity.host ? prefix : `${prefix}${identity.owner}/`, include: ['customMetadata'], cursor });
      for (const object of page.objects) {const meta=object.customMetadata||{};if(identity.eventId&&meta.eventId&&(meta.eventId!==identity.eventId||meta.eventDate!==identity.eventDate))continue;items.push({ ...meta, unassigned:!meta.eventId, path: object.key.slice(PREFIX.length), size: object.size });}
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    items.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));
    return reply({ items, host: identity.host });
  }
  if (route === '/upload' && request.method === 'POST') {
    const contentType = (request.headers.get('Content-Type') || '').split(';')[0].toLowerCase();
    if (!TYPES.has(contentType)) return fail('Unsupported photo or video type.', 415);
    const limit = contentType.startsWith('video/') ? 50_000_000 : 15_000_000;
    if (Number(request.headers.get('Content-Length') || 0) > limit) return fail('File exceeds the upload size limit.', 413);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > limit) return fail('Empty file or file exceeds the upload size limit.', 413);
    const name = (url.searchParams.get('name') || 'Upload').slice(0, 240);
    const metadata = { ...(identity.eventId?{eventId:identity.eventId,eventDate:identity.eventDate}:{}), name, contentType, accountName: identity.accountName, uploadedBy: identity.uploadedBy, uploadedAt: new Date().toISOString(), kind: contentType.startsWith('video/') ? 'video' : 'image' };
    await bucket.put(`${prefix}${identity.owner}/${crypto.randomUUID()}`, bytes, { httpMetadata: { contentType }, customMetadata: metadata });
    return reply({ ok: true }, 201);
  }
  if (route === '/links' && request.method === 'POST') {
    let body; try { body = await request.json(); } catch { return fail('Enter a valid photo-sharing link.', 400); }
    if (!body || typeof body.url !== 'string' || body.url.length > 4000) return fail('Enter a valid photo-sharing link.', 400);
    let link; try { link = new URL(body.url); } catch { return fail('Enter a valid photo-sharing link.', 400); }
    if (!['https:', 'http:'].includes(link.protocol) || link.username || link.password) return fail('Use an http or https sharing link.', 400);
    const metadata = { ...(identity.eventId?{eventId:identity.eventId,eventDate:identity.eventDate}:{}), kind: 'link', name: link.hostname, url: link.href, accountName: identity.accountName, uploadedBy: identity.uploadedBy, uploadedAt: new Date().toISOString() };
    await bucket.put(`${prefix}${identity.owner}/${crypto.randomUUID()}`, '', { customMetadata: metadata });
    return reply({ ok: true }, 201);
  }
  const file = /^\/uploads\/([a-f0-9]{64})\/([a-f0-9-]{36})$/.exec(route);
  if (file && request.method === 'GET') {
    if (!OWNER.test(file[1]) || !ID.test(file[2]) || (!identity.host && file[1] !== identity.owner)) return fail('Not found.', 404);
    const key = `${PREFIX}${route.slice(1)}`;
    if(identity.eventId){const meta=await bucket.head(key);if(meta?.customMetadata?.eventId&&(meta.customMetadata.eventId!==identity.eventId||meta.customMetadata.eventDate!==identity.eventDate))return fail('Not found.',404);}
    let range;
    if (request.headers.has('Range')) {
      const metadata = await bucket.head(key);
      if (!metadata) return fail('Not found.', 404);
      const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('Range'));
      const size = metadata.size;
      const start = match?.[1] ? Number(match[1]) : Math.max(0, size - Number(match?.[2]));
      const end = match?.[1] ? (match[2] ? Math.min(size - 1, Number(match[2])) : size - 1) : size - 1;
      if (!match || (!match[1] && !match[2]) || start > end || start >= size || (!match[1] && Number(match[2]) === 0)) return response(request, env, null, 416, { 'Content-Range': `bytes */${size}`, 'Cache-Control': 'private, no-store' });
      range = { offset: start, length: end - start + 1 };
    }
    const object = await bucket.get(key, range ? { range } : undefined);
    if (!object) return fail('Not found.', 404);
    const headers = { 'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Accept-Ranges': 'bytes' };
    headers['Content-Length'] = String(range ? range.length : object.size);
    if (range) headers['Content-Range'] = `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`;
    return response(request, env, object.body, range ? 206 : 200, headers);
  }
  return fail('Not found.', 404);
}

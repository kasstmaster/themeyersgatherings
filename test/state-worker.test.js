import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';

function uploadRequest(body, headers = {}) {
  return new Request('https://state.example/invitation-backgrounds/template-123', {
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', 'X-Host-Password': 'secret', ...headers },
    body
  });
}

test('invitation uploads are buffered before being stored in R2', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71]);
  let stored;
  const env = {
    HOST_PASSWORD: 'secret',
    INVITATION_BACKGROUNDS: {
      async put(key, value, options) {
        assert.ok(value instanceof ArrayBuffer);
        stored = { key, bytes: [...new Uint8Array(value)], options };
      }
    }
  };

  const response = await worker.fetch(uploadRequest(bytes), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(stored.key, 'invitation-backgrounds/template-123');
  assert.deepEqual(stored.bytes, [...bytes]);
  assert.equal(stored.options.httpMetadata.contentType, 'image/png');
});

test('invitation uploads reject an oversized body without a Content-Length header', async () => {
  let stored = false;
  const env = {
    HOST_PASSWORD: 'secret',
    INVITATION_BACKGROUNDS: { async put() { stored = true; } }
  };
  const request = uploadRequest(new Uint8Array(15_000_001));
  request.headers.delete('Content-Length');

  const response = await worker.fetch(request, env);

  assert.equal(response.status, 413);
  assert.equal(await response.text(), 'Image is too large (15 MB maximum).');
  assert.equal(stored, false);
});

test('invitation storage failures return actionable setup guidance', async () => {
  const env = {
    HOST_PASSWORD: 'secret',
    INVITATION_BACKGROUNDS: { async put() { throw new Error('No such bucket'); } }
  };

  const response = await worker.fetch(uploadRequest(new Uint8Array([1, 2, 3])), env);

  assert.equal(response.status, 503);
  assert.match(await response.text(), /Deploy the latest Worker/);
  assert.match(response.headers.get('Access-Control-Allow-Origin'), /\*/);
});

function videoRequest(method = 'PUT', body = new Uint8Array([0, 1, 2, 3]), headers = {}) {
 return new Request('https://state.example/attire-videos/video-123', {
  method, headers: { 'Content-Type': 'video/mp4', 'X-Host-Password': 'secret', ...headers },
  ...(method === 'PUT' ? { body } : {})
 });
}

test('uploaded videos store bytes and media type, play publicly, seek, and delete with host authentication', async () => {
 let stored; let removed;
 const env = { HOST_PASSWORD: 'secret', INVITATION_BACKGROUNDS: {
  async put(key, body, options) { stored = { key, body: [...new Uint8Array(body)], options }; },
  async head() { return { size: 4 }; },
  async get(key, options) {
   const range = options?.range;
   const bytes = new Uint8Array([0, 1, 2, 3]);
   return { size: 4, httpMetadata: { contentType: 'video/mp4' }, httpEtag: '"video"', body: range ? bytes.slice(range.offset, range.offset + range.length) : bytes };
  },
  async delete(key) { removed = key; }
 } };
 assert.equal((await worker.fetch(videoRequest(), env)).status, 200);
 assert.equal(stored.key, 'attire-videos/video-123');
 assert.deepEqual(stored.body, [0, 1, 2, 3]);
 assert.equal(stored.options.httpMetadata.contentType, 'video/mp4');
 const playback = await worker.fetch(videoRequest('GET', null, { 'X-Host-Password': '' }), env);
 assert.equal(playback.status, 200); assert.equal(playback.headers.get('Content-Type'), 'video/mp4');
 assert.deepEqual([...new Uint8Array(await playback.arrayBuffer())], [0, 1, 2, 3]);
 for (const [range, expected] of [['bytes=1-2', [1, 2]], ['bytes=-2', [2, 3]], ['bytes=2-', [2, 3]]]) {
  const result = await worker.fetch(videoRequest('GET', null, { Range: range }), env);
  assert.equal(result.status, 206); assert.equal(result.headers.get('Content-Length'), '2');
  assert.match(result.headers.get('Content-Range'), /bytes [12]-[23]\/4/);
  assert.deepEqual([...new Uint8Array(await result.arrayBuffer())], expected);
 }
 assert.equal((await worker.fetch(videoRequest('GET', null, { Range: 'bytes=9-' }), env)).status, 416);
 assert.equal((await worker.fetch(videoRequest('DELETE', null, { 'X-Host-Password': '' }), env)).status, 401);
 assert.equal((await worker.fetch(videoRequest('DELETE'), env)).status, 204);
 assert.equal(removed, 'attire-videos/video-123');
});

test('video uploads reject unsupported, empty, unauthenticated, and oversized files before storage', async () => {
 let stored = false;
 const env = { HOST_PASSWORD: 'secret', INVITATION_BACKGROUNDS: { async put() { stored = true; } } };
 assert.equal((await worker.fetch(videoRequest('PUT', null), env)).status, 400);
 assert.equal((await worker.fetch(videoRequest('PUT', new Uint8Array([1]), { 'Content-Type': 'text/html' }), env)).status, 415);
 assert.equal((await worker.fetch(videoRequest('PUT', new Uint8Array([1]), { 'X-Host-Password': 'wrong' }), env)).status, 401);
 assert.equal((await worker.fetch(videoRequest('PUT', new Uint8Array([1]), { 'Content-Length': '50000001' }), env)).status, 413);
 const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(25_000_000)); controller.enqueue(new Uint8Array(25_000_001)); controller.close(); } });
 const request = new Request('https://state.example/attire-videos/video-123', { method: 'PUT', duplex: 'half', headers: { 'Content-Type': 'video/mp4', 'X-Host-Password': 'secret' }, body: stream });
 assert.equal((await worker.fetch(request, env)).status, 413);
 assert.equal(stored, false);
});

test('video uploads report missing storage and reject disallowed origins', async () => {
 assert.equal((await worker.fetch(videoRequest(), { HOST_PASSWORD: 'secret' })).status, 503);
 assert.equal((await worker.fetch(videoRequest('PUT', new Uint8Array([1]), { Origin: 'https://wrong.example' }), { ALLOWED_ORIGIN: 'https://site.example' })).status, 403);
 const preflight = await worker.fetch(new Request('https://state.example/attire-videos/video-123', { method: 'OPTIONS' }), {});
 assert.equal(preflight.status, 204);
 assert.match(preflight.headers.get('Access-Control-Allow-Headers'), /X-Host-Password/);
});

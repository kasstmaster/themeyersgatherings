import test from 'node:test';
import assert from 'node:assert/strict';
await import('../attire-videos.js');
const { normalize, validate, assetUrl, fileType } = globalThis.AttireVideos;

test('video state preserves external links and uploaded metadata through serialization', () => {
 const input = ['https://youtu.be/example', { id: 'video-1', name: '<my video>.mp4', contentType: 'video/mp4' }, null, { id: '../secret', contentType: 'video/mp4' }, { id: 'bad', contentType: 'text/html' }];
 const result = normalize(input);
 assert.deepEqual(result, input.slice(0, 2));
 assert.deepEqual(normalize(JSON.parse(JSON.stringify(result))), result);
 assert.equal(assetUrl('https://worker.example/', 'video-1'), 'https://worker.example/attire-videos/video-1');
 assert.equal(assetUrl('javascript:alert(1)', 'video-1'), '');
 assert.equal(assetUrl('https://worker.example', '../secret'), '');
});

test('video upload validation enforces types, empty files, and size limits', () => {
 assert.equal(validate({ name: 'clip.mp4', type: 'video/mp4', size: 50_000_000 }), '');
 assert.equal(fileType({ name: 'clip.WEBM', type: '' }), 'video/webm');
 assert.match(validate({ name: 'clip.mov', type: 'video/quicktime', size: 100 }), /MP4/);
 assert.match(validate({ name: 'clip.mp4', type: 'video/mp4', size: 50_000_001 }), /50 MB/);
 assert.match(validate({ name: 'clip.mp4', type: 'video/mp4', size: 0 }), /empty/);
 assert.match(validate(null), /Choose/);
});

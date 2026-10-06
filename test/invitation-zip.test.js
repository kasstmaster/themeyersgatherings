import test from 'node:test';
import assert from 'node:assert/strict';
await import('../invitation-zip.js');

test('ZIP stores complete file data and standard CRC and directory records', async () => {
  const blob = await InvitationZip.zipFiles([new File(['123456789'], 'invitation.png')]);
  assert.equal(blob.type, 'application/zip');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const view = new DataView(bytes.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(8, true), 0);
  assert.equal(view.getUint32(14, true), 0xcbf43926); // Published CRC-32 check value.
  const nameLength = view.getUint16(26, true);
  assert.equal(new TextDecoder().decode(bytes.slice(30, 30 + nameLength)), 'invitation.png');
  assert.equal(new TextDecoder().decode(bytes.slice(30 + nameLength, 39 + nameLength)), '123456789');
  const directory = 39 + nameLength;
  assert.equal(view.getUint32(directory, true), 0x02014b50);
  assert.equal(view.getUint32(directory + 16, true), 0xcbf43926);
  assert.equal(view.getUint32(directory + 42, true), 0);
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 10, true), 1);
  assert.equal(view.getUint32(end + 16, true), directory);
});
test('ZIP preserves Unicode filenames and prevents duplicate entries or directory paths', async () => {
  const blob = await InvitationZip.zipFiles([new File(['a'], 'José.png'), new File(['b'], 'José.png'), new File(['c'], 'folder/name.png')]);
  const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer);
  let offset = 0;
  const names = [], contents = [];
  for (let index = 0; index < 3; index++) {
    assert.equal(view.getUint16(offset + 6, true), 0x800);
    const length = view.getUint16(offset + 26, true), size = view.getUint32(offset + 18, true);
    names.push(new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + length)));
    contents.push(new TextDecoder().decode(bytes.slice(offset + 30 + length, offset + 30 + length + size)));
    offset += 30 + length + size;
  }
  assert.deepEqual(names, ['José.png', 'José-2.png', 'folder-name.png']);
  assert.deepEqual(contents, ['a', 'b', 'c']);
});

// PNGs are already compressed; store them in a standard ZIP without recompression.
(() => {
  const crcTable = Array.from({ length: 256 }, (_, value) => {
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  async function zipFiles(files) {
    if (files.length > 65535) throw new Error('Too many invitations for one ZIP.');
    const local = [], central = [], names = new Set();
    let offset = 0, centralSize = 0;
    for (const file of files) {
      const original = file.name.replace(/[\\/]/g, '-');
      let name = original, suffix = 2;
      while (names.has(name)) name = original.replace(/(\.[^.]+)?$/, `-${suffix++}$1`);
      names.add(name);
      const filename = new TextEncoder().encode(name);
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (bytes.length + offset > 0xffffffff) throw new Error('Invitations exceed the ZIP size limit.');
      const crc = crc32(bytes);
      const header = new Uint8Array(30 + filename.length), h = new DataView(header.buffer);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
      h.setUint16(12, 33, true); // January 1, 1980; no private file timestamps.
      h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true);
      h.setUint16(26, filename.length, true); header.set(filename, 30);
      const record = new Uint8Array(46 + filename.length), c = new DataView(record.buffer);
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
      c.setUint16(14, 33, true); c.setUint32(16, crc, true); c.setUint32(20, bytes.length, true); c.setUint32(24, bytes.length, true);
      c.setUint16(28, filename.length, true); c.setUint32(42, offset, true); record.set(filename, 46);
      local.push(header, bytes); central.push(record); offset += header.length + bytes.length; centralSize += record.length;
    }
    const end = new Uint8Array(22), e = new DataView(end.buffer);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    return new Blob([...local, ...central, end], { type: 'application/zip' });
  }
  globalThis.InvitationZip = { zipFiles };
})();

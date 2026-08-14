import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function readIcoOpaqueRgb(path) {
  const data = readFileSync(path);
  const size = data.readUInt32LE(14);
  const imageOff = data.readUInt32LE(18);
  const headerSize = data.readUInt32LE(imageOff);
  const xorOff = imageOff + headerSize;
  for (let i = xorOff; i < xorOff + size; i += 4) {
    const a = data[i + 3];
    if (a > 200) return [data[i + 2], data[i + 1], data[i]];
  }
  return null;
}

function readPngOpaqueRgb(path) {
  const data = readFileSync(path);
  if (data.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') {
    return null;
  }
  let width = 0;
  const idat = [];
  let offset = 8;
  while (offset + 8 <= data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString('ascii');
    const chunk = data.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') width = chunk.readUInt32BE(0);
    if (type === 'IDAT') idat.push(chunk);
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const rowSize = 1 + width * 4;
  for (let y = 0; y * rowSize < raw.length; y += 1) {
    const row = raw.subarray(y * rowSize + 1, (y + 1) * rowSize);
    for (let x = 0; x < width; x += 1) {
      const i = x * 4;
      if (row[i + 3] > 200) return [row[i], row[i + 1], row[i + 2]];
    }
  }
  return null;
}

const AMBER = [245, 158, 11];

test('chat exposes an amber 聪 icon via Next app metadata files', () => {
  const layout = readFileSync('apps/web/app/layout.tsx', 'utf8');
  assert.match(layout, /url:\s*['"]\/icon\.png['"]/);
  assert.match(layout, /url:\s*['"]\/favicon\.ico['"]/);
  assert.equal(existsSync('apps/web/app/favicon.ico'), true);
  assert.equal(existsSync('apps/web/app/icon.png'), true);
  assert.equal(existsSync('apps/web/public/favicon.ico'), true);
  assert.equal(existsSync('apps/web/public/icon.png'), true);
  assert.deepEqual(readIcoOpaqueRgb('apps/web/app/favicon.ico'), AMBER);
  assert.deepEqual(readIcoOpaqueRgb('apps/web/public/favicon.ico'), AMBER);
  assert.deepEqual(readPngOpaqueRgb('apps/web/app/icon.png'), AMBER);
  assert.deepEqual(readPngOpaqueRgb('apps/web/public/icon.png'), AMBER);
});

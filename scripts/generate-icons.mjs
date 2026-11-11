import { deflateSync } from "node:zlib";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const name = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function pngRect(width, height, paint) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y, width, height);
      const index = row + 1 + x * 4;
      raw[index] = r;
      raw[index + 1] = g;
      raw[index + 2] = b;
      raw[index + 3] = a;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function png(size, paint) {
  return pngRect(size, size, (x, y) => paint(x, y, size));
}

function belt(paddingRatio) {
  return (x, y, size) => {
    const pad = Math.round(size * paddingRatio);
    const lx = x - pad;
    const ly = y - pad;
    const inner = size - pad * 2;
    if (lx < 0 || ly < 0 || lx >= inner || ly >= inner) return [255, 255, 255, 255];
    const beltTop = inner * 0.4;
    const beltHeight = inner * 0.2;
    if (ly >= beltTop && ly < beltTop + beltHeight) {
      if (lx < inner * 0.22) return [200, 16, 46, 255];
      return [17, 17, 17, 255];
    }
    return [255, 255, 255, 255];
  };
}

mkdirSync(new URL("../public/icons/", import.meta.url), { recursive: true });
mkdirSync(new URL("../src/app/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/icons/icon-192.png", import.meta.url), png(192, belt(0)));
writeFileSync(new URL("../public/icons/icon-512.png", import.meta.url), png(512, belt(0)));
writeFileSync(new URL("../public/icons/apple-touch-icon.png", import.meta.url), png(180, belt(0)));
writeFileSync(new URL("../public/icons/icon-maskable-192.png", import.meta.url), png(192, belt(0.18)));
writeFileSync(new URL("../public/icons/icon-maskable-512.png", import.meta.url), png(512, belt(0.18)));
writeFileSync(new URL("../src/app/icon.png", import.meta.url), png(192, belt(0)));

const splashDir = new URL("../public/splash/", import.meta.url);
mkdirSync(splashDir, { recursive: true });
const splash = JSON.parse(readFileSync(new URL("../src/data/ios-splash.json", import.meta.url), "utf8"));
for (const item of splash) {
  const side = Math.round(Math.min(item.width, item.height) * 0.34);
  const left = Math.round((item.width - side) / 2);
  const top = Math.round((item.height - side) / 2);
  const tile = belt(0);
  writeFileSync(
    new URL(`iphone-${item.width}x${item.height}.png`, splashDir),
    pngRect(item.width, item.height, (x, y) => {
      if (x < left || y < top || x >= left + side || y >= top + side) return [255, 255, 255, 255];
      return tile(x - left, y - top, side);
    }),
  );
}
console.log("icons and splash written");

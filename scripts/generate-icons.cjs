const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'binary');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function generateIconPNG(size) {
  const width = size;
  const height = size;
  const rawData = Buffer.alloc((1 + width * 4) * height);
  
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.44;
  const innerRadius = width * 0.38;
  
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      let r = 8, g = 8, b = 8, a = 255;
      
      if (dist <= radius) {
        const t = (x + y) / (width * 2);
        const circleR = Math.round(16 + (5 - 16) * t);
        const circleG = Math.round(185 + (150 - 185) * t);
        const circleB = Math.round(129 + (105 - 129) * t);
        
        if (dist <= innerRadius) {
          r = Math.round(10 + circleR * 0.25);
          g = Math.round(15 + circleG * 0.25);
          b = Math.round(22 + circleB * 0.25);
          
          const normX = (x - cx) / (width * 0.22);
          const normY = (y - cy) / (height * 0.26);
          
          let isDollar = false;
          // Vertical spine
          if (Math.abs(normX) <= 0.14 && Math.abs(normY) <= 1.15) {
            isDollar = true;
          }
          // S top arc
          if (normY >= -0.85 && normY <= -0.1) {
            const arcY = normY - (-0.48);
            const arcX = normX - (-0.05);
            const arcDist = Math.sqrt(arcX * arcX * 1.5 + arcY * arcY * 2.8);
            if (arcDist >= 0.28 && arcDist <= 0.55 && (normX < 0.25 || normY < -0.4)) {
              isDollar = true;
            }
          }
          // S bottom arc
          if (normY >= 0.1 && normY <= 0.85) {
            const arcY = normY - 0.48;
            const arcX = normX - 0.05;
            const arcDist = Math.sqrt(arcX * arcX * 1.5 + arcY * arcY * 2.8);
            if (arcDist >= 0.28 && arcDist <= 0.55 && (normX > -0.25 || normY > 0.4)) {
              isDollar = true;
            }
          }
          // Middle bar
          if (Math.abs(normY) <= 0.14 && Math.abs(normX) <= 0.42) {
            isDollar = true;
          }
          // Top bar
          if (Math.abs(normY - (-0.78)) <= 0.12 && normX >= -0.38 && normX <= 0.38) {
            isDollar = true;
          }
          // Bottom bar
          if (Math.abs(normY - 0.78) <= 0.12 && normX >= -0.38 && normX <= 0.38) {
            isDollar = true;
          }

          if (isDollar) {
            r = 52;
            g = 211;
            b = 153;
          }
        } else {
          r = circleR;
          g = circleG;
          b = circleB;
        }
      }
      
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }
  
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const png192 = generateIconPNG(192);
fs.writeFileSync(path.join(outDir, 'icon-192x192.png'), png192);
console.log('Generated icon-192x192.png (' + png192.length + ' bytes)');

const png512 = generateIconPNG(512);
fs.writeFileSync(path.join(outDir, 'icon-512x512.png'), png512);
console.log('Generated icon-512x512.png (' + png512.length + ' bytes)');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none">
  <rect width="512" height="512" rx="112" fill="#080808"/>
  <circle cx="256" cy="256" r="200" fill="url(#grad)" stroke="#10B981" stroke-width="16"/>
  <circle cx="256" cy="256" r="160" fill="#0c141c"/>
  <text x="256" y="335" font-family="system-ui, -apple-system, sans-serif" font-size="240" font-weight="900" fill="#34D399" text-anchor="middle">$</text>
  <defs>
    <linearGradient id="grad" x1="56" y1="56" x2="456" y2="456" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent);
console.log('Generated icon.svg');

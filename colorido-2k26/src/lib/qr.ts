/**
 * Phase 16 ② — QR Code encoder (pure TypeScript, zero dependencies).
 *
 * Byte mode, error-correction level M, versions 2–6 (payloads up to ~105
 * bytes — plenty for a check-in token). At level M these versions use only
 * equal-sized Reed–Solomon blocks, which keeps interleaving simple and
 * provably correct. Implements ISO/IEC 18004: function patterns, format and
 * version info, GF(256) Reed–Solomon EC, zigzag data placement and the
 * penalty-score mask choice. Deliberately offline and server-only: check-in
 * passes render to SVG on the server and never depend on an external API.
 */

// ------------------------------------------------------------------ GF(256) --
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gmul = (a: number, b: number): number =>
  a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];

/** Generator polynomial for n EC codewords. */
function rsGenerator(n: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]; // × α^0
      next[j + 1] ^= gmul(poly[j], EXP[i]); // × α^i
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGenerator(ecLen);
  const rem = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ rem[0];
    rem.copyWithin(0, 1);
    rem[ecLen - 1] = 0;
    for (let i = 0; i < ecLen; i++) {
      rem[i] ^= gmul(factor, gen[i + 1]);
    }
  }
  return rem;
}

// ------------------------------------------------------- version constants --
// EC level M, versions 2–6: data codewords per block, EC codewords per block.
// Every one of these versions uses equal-sized blocks (ISO/IEC 18004 §8.5).
interface VersionSpec {
  version: number;
  size: number; // modules per side (17 + 4v)
  dataPerBlock: number;
  ecPerBlock: number;
  blockCount: number;
  align: number[]; // alignment pattern centers
}

const VERSIONS: VersionSpec[] = [
  { version: 2, size: 25, dataPerBlock: 28, ecPerBlock: 16, blockCount: 1, align: [6, 18] },
  { version: 3, size: 29, dataPerBlock: 44, ecPerBlock: 26, blockCount: 1, align: [6, 22] },
  { version: 4, size: 33, dataPerBlock: 32, ecPerBlock: 18, blockCount: 2, align: [6, 26] },
  { version: 5, size: 37, dataPerBlock: 43, ecPerBlock: 24, blockCount: 2, align: [6, 30] },
  { version: 6, size: 41, dataPerBlock: 27, ecPerBlock: 16, blockCount: 4, align: [6, 34] },
];

function pickVersion(byteLen: number): VersionSpec {
  for (const spec of VERSIONS) {
    const capacity = spec.dataPerBlock * spec.blockCount;
    // Byte mode: 4-bit mode indicator + 8-bit count + 8 bits per byte.
    if (4 + 8 + byteLen * 8 <= capacity * 8) return spec;
  }
  throw new Error("QR payload too long (105-byte limit at EC level M, v6)");
}

// ------------------------------------------------------------------ matrix --
interface Matrix {
  size: number;
  modules: boolean[][]; // true = dark
  reserved: boolean[][];
}

function makeMatrix(size: number): Matrix {
  return {
    size,
    modules: Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    ),
    reserved: Array.from({ length: size }, () =>
      new Array<boolean>(size).fill(false),
    ),
  };
}

function setFunction(m: Matrix, r: number, c: number, dark: boolean) {
  if (r < 0 || c < 0 || r >= m.size || c >= m.size) return;
  m.modules[r][c] = dark;
  m.reserved[r][c] = true;
}

function drawFinder(m: Matrix, r: number, c: number) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= m.size || cc >= m.size) continue;
      const inPattern =
        dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
        (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
      m.modules[rr][cc] = inPattern;
      m.reserved[rr][cc] = true;
    }
  }
}

function drawAlignment(m: Matrix, r: number, c: number) {
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      setFunction(m, r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
    }
  }
}

function drawReservedAreas(m: Matrix, spec: VersionSpec) {
  const size = m.size;

  // The three finder patterns + their light separators.
  drawFinder(m, 0, 0);
  drawFinder(m, 0, size - 7);
  drawFinder(m, size - 7, 0);

  // Timing patterns.
  for (let i = 8; i < size - 8; i++) {
    setFunction(m, 6, i, i % 2 === 0);
    setFunction(m, i, 6, i % 2 === 0);
  }

  // Alignment patterns (skip the three that overlap finder patterns).
  for (const r of spec.align) {
    for (const c of spec.align) {
      const overlapsFinder =
        (r <= 8 && c <= 8) ||
        (r <= 8 && c >= size - 9) ||
        (r >= size - 9 && c <= 8);
      if (!overlapsFinder) drawAlignment(m, r, c);
    }
  }

  // Reserve format-info areas with a dummy mask (drawFormatInfo reserves
  // exactly the 30 format cells via setFunction — this must NOT blank the
  // timing cells (6,8)/(8,6), which are not format cells).
  drawFormatInfo(m, 0);
  setFunction(m, size - 8, 8, true); // the always-dark module
}

/** 15-bit format info (BCH(15,5)) with the 0x5412 mask; EC level M = 0b00. */
function formatInfoBits(mask: number): number {
  const data = mask; // (0b00 << 3) | mask
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if (((rem >> i) & 1) === 1) rem ^= 0x537 << (i - 10);
  }
  return (((data << 10) | rem) ^ 0x5412) & 0x7fff;
}

function drawFormatInfo(m: Matrix, mask: number) {
  const size = m.size;
  const bits = formatInfoBits(mask);
  const bitAt = (i: number) => ((bits >> i) & 1) === 1;

  // Copy 1: down column 8, then left along row 8 (skips the timing cell).
  for (let i = 0; i <= 5; i++) setFunction(m, i, 8, bitAt(i));
  setFunction(m, 7, 8, bitAt(6));
  setFunction(m, 8, 8, bitAt(7));
  setFunction(m, 8, 7, bitAt(8));
  for (let i = 9; i < 15; i++) setFunction(m, 8, 14 - i, bitAt(i));

  // Copy 2: bits 0–7 run left along row 8 from the top-right finder;
  // bits 8–14 run down column 8 from the bottom-left finder.
  for (let i = 0; i < 8; i++) setFunction(m, 8, size - 1 - i, bitAt(i));
  for (let i = 8; i < 15; i++) setFunction(m, size - 15 + i, 8, bitAt(i));
  setFunction(m, size - 8, 8, true); // dark module (copy 2 overlaps it)
}

// -------------------------------------------------------------- codewords ---
function buildCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  push(0b0100, 4); // byte-mode indicator
  push(bytes.length, 8); // char count (8 bits for v1–9)
  for (const b of bytes) push(b, 8);

  const capacityBits = spec.dataPerBlock * spec.blockCount * 8;
  push(0, Math.min(4, capacityBits - bits.length)); // terminator
  while (bits.length % 8 !== 0) push(0, 1); // byte alignment
  const pad = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < capacityBits) push(pad[padIdx++ % 2], 8);

  const dataLen = spec.dataPerBlock * spec.blockCount;
  const data = new Uint8Array(dataLen);
  for (let i = 0; i < dataLen; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | bits[i * 8 + j];
    data[i] = byte;
  }

  // Reed–Solomon EC per block, then interleave data + EC codewords.
  const blockDataLen = spec.dataPerBlock;
  const ecBlocks: Uint8Array[] = [];
  for (let b = 0; b < spec.blockCount; b++) {
    ecBlocks.push(
      rsEncode(data.subarray(b * blockDataLen, (b + 1) * blockDataLen), spec.ecPerBlock),
    );
  }

  const out = new Uint8Array(dataLen + spec.ecPerBlock * spec.blockCount);
  let o = 0;
  for (let i = 0; i < blockDataLen; i++) {
    for (let b = 0; b < spec.blockCount; b++) out[o++] = data[b * blockDataLen + i];
  }
  for (let i = 0; i < spec.ecPerBlock; i++) {
    for (let b = 0; b < spec.blockCount; b++) out[o++] = ecBlocks[b][i];
  }
  return out;
}

// ------------------------------------------------------------- placement ----
function placeData(m: Matrix, codewords: Uint8Array, mask: number) {
  const size = m.size;
  const totalBits = codewords.length * 8;
  const bit = (i: number) => (codewords[i >> 3] >> (7 - (i & 7))) & 1;

  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    let c = col;
    if (c <= 6) c--; // shift left past the vertical timing column
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (const cc of [c, c - 1]) {
        if (m.reserved[r][cc]) continue;
        let dark = bitIdx < totalBits ? bit(bitIdx) === 1 : false;
        bitIdx++;
        if (maskBit(mask, r, cc)) dark = !dark;
        m.modules[r][cc] = dark;
      }
    }
    upward = !upward;
  }
}

function maskBit(mask: number, r: number, c: number): boolean {
  switch (mask) {
    case 0: return (r + c) % 2 === 0;
    case 1: return r % 2 === 0;
    case 2: return c % 3 === 0;
    case 3: return (r + c) % 3 === 0;
    case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
    case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
    case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
    default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
  }
}

// ------------------------------------------------------------------ masks ---
function penaltyScore(m: Matrix): number {
  const size = m.size;
  let score = 0;

  // Rule 1: runs of ≥ 5 same-color modules in every row/column.
  for (let r = 0; r < size; r++) {
    let runColor = m.modules[r][0];
    let runLen = 1;
    for (let c = 1; c < size; c++) {
      if (m.modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runColor = m.modules[r][c];
        runLen = 1;
      }
    }
  }
  for (let c = 0; c < size; c++) {
    let runColor = m.modules[0][c];
    let runLen = 1;
    for (let r = 1; r < size; r++) {
      if (m.modules[r][c] === runColor) {
        runLen++;
        if (runLen === 5) score += 3;
        else if (runLen > 5) score += 1;
      } else {
        runColor = m.modules[r][c];
        runLen = 1;
      }
    }
  }

  // Rule 2: 2×2 same-color blocks.
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m.modules[r][c];
      if (v === m.modules[r][c + 1] && v === m.modules[r + 1][c] &&
          v === m.modules[r + 1][c + 1]) score += 3;
    }
  }

  // Rule 3: finder-like 1011101 patterns with 4 light modules on one side.
  const p1 = [true, false, true, true, true, false, true, false, false, false, false];
  const p2 = [false, false, false, false, true, false, true, true, true, false, true];
  const countMatches = (get: (i: number) => boolean): number => {
    let count = 0;
    for (let i = 0; i <= size - 11; i++) {
      let m1 = true;
      let m2 = true;
      for (let j = 0; j < 11; j++) {
        const v = get(i + j);
        if (v !== p1[j]) m1 = false;
        if (v !== p2[j]) m2 = false;
      }
      if (m1) count++;
      if (m2) count++;
    }
    return count;
  };
  for (let r = 0; r < size; r++) score += 40 * countMatches((i) => m.modules[r][i]);
  for (let c = 0; c < size; c++) score += 40 * countMatches((i) => m.modules[i][c]);

  // Rule 4: deviation of the dark proportion from 50 %.
  let dark = 0;
  for (const row of m.modules) for (const v of row) if (v) dark++;
  const k = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1;
  score += Math.max(0, k) * 10;

  return score;
}

// ---------------------------------------------------------------- public ----
export interface QrMatrix {
  size: number;
  get(r: number, c: number): boolean;
}

/**
 * Encode a UTF-8 string into a QR matrix (byte mode, EC level M, v2–6).
 * `fixedMask` (0–7) pins the mask pattern — used by the verification suite
 * to prove matrix equality against the reference encoder mask-by-mask.
 */
export function qrEncode(text: string, fixedMask?: number): QrMatrix {
  const bytes = new TextEncoder().encode(text);
  const spec = pickVersion(bytes.length);
  const base = makeMatrix(spec.size);
  drawReservedAreas(base, spec);
  const codewords = buildCodewords(bytes, spec);

  const masks = fixedMask !== undefined ? [fixedMask] : [0, 1, 2, 3, 4, 5, 6, 7];
  let best: { matrix: Matrix; score: number } | null = null;
  for (const mask of masks) {
    const candidate: Matrix = {
      size: base.size,
      modules: base.modules.map((row) => [...row]),
      reserved: base.reserved,
    };
    placeData(candidate, codewords, mask);
    drawFormatInfo(candidate, mask);
    const score = penaltyScore(candidate);
    if (!best || score < best.score) best = { matrix: candidate, score };
  }

  const chosen = best!.matrix;
  return { size: chosen.size, get: (r, c) => chosen.modules[r][c] };
}

/** Render the QR as a crisp SVG string (4-module quiet zone included). */
export function qrSvg(text: string, pixelSize = 6): string {
  const qr = qrEncode(text);
  const quiet = 4;
  const dim = (qr.size + quiet * 2) * pixelSize;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code">`,
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>`,
  ];
  for (let r = 0; r < qr.size; r++) {
    for (let c = 0; c < qr.size; c++) {
      if (qr.get(r, c)) {
        parts.push(
          `<rect x="${(c + quiet) * pixelSize}" y="${(r + quiet) * pixelSize}" width="${pixelSize}" height="${pixelSize}"/>`,
        );
      }
    }
  }
  parts.push("</svg>");
  return parts.join("");
}

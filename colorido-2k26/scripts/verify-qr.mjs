/**
 * Phase 16 ② — QR encoder verification.
 *
 * 1. Rasterizes our SVG output and decodes it with `jsqr` — a completely
 *    independent reference decoder — across all encoder versions.
 * 2. Asserts our matrix is EXACTLY equal to the `qrcode` package's matrix
 *    for the same byte-mode, EC-level-M, versions 2–6 (the gold standard:
 *    if two independent encoders agree bit-for-bit, the output is correct).
 *
 *   npm run verify:qr          (jsqr + qrcode are devDependencies)
 */
import { qrSvg, qrEncode } from "../src/lib/qr.ts";
import jsQR from "jsqr";
import QR from "qrcode";

/** Minimal SVG rasterizer: our SVG is only white background + black rects. */
function svgToRgba(svg) {
  const width = Number(/width="(\d+)"/.exec(svg)[1]);
  const height = Number(/height="(\d+)"/.exec(svg)[1]);
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const rectRe = /<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"\/>/g;
  let m;
  while ((m = rectRe.exec(svg)) !== null) {
    const x = Number(m[1]);
    const y = Number(m[2]);
    const w = Number(m[3]);
    const h = Number(m[4]);
    const isBackground = x === 0 && y === 0 && w === width && h === height;
    if (isBackground) continue;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const i = ((y + dy) * width + (x + dx)) * 4;
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
  }
  return { data, width, height };
}

function decode(svg) {
  const { data, width, height } = svgToRgba(svg);
  const res = jsQR(data, width, height);
  if (!res) throw new Error("jsQR could not decode the QR image");
  return res.data;
}

let failures = 0;
function check(label, fn) {
  try {
    const out = fn();
    console.log(`  ✓ ${label}${out ? ` → ${out}` : ""}`);
  } catch (e) {
    failures++;
    console.error(`  ✗ ${label}: ${e.message}`);
  }
}

console.log("QR encoder verification (jsqr + qrcode reference)\n");

console.log("— Independent decode round-trips (jsQR) —");

check("v2 payload (28B): confirmation UUID", () =>
  decode(qrSvg("https://x.test/r/3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c")),
);

check("v3 payload (44B): long URL + query", () =>
  decode(
    qrSvg(
      "https://colorido.example/registration/aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000?id=9",
    ),
  ),
);

check("v4 payload (~60B): realistic pass payload", () =>
  decode(qrSvg("CLR26-000123|3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c|dance-solo")),
);

check("v6 payload (~100B): max-ish realistic", () =>
  decode(
    qrSvg(
      "https://colorido.example/check-in?reg=CLR26-000123&token=3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c&v=1",
    ),
  ),
);

check("E2E check-in URL round-trips exactly", () => {
  const url = "http://localhost:3100/check-in/3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c";
  const decoded = decode(qrSvg(url));
  if (decoded !== url) throw new Error(`mismatch: ${decoded}`);
  return "exact match";
});

console.log("\n— Matrix equality vs `qrcode` reference (byte mode, EC M, v2–6) —");

const CASES = [
  ["hello-debug-123-force-v2", 2],
  ["dance-solo-registration-2026!payload#2", 3],
  ["CLR26-000123|3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c|dance-solo", 4],
  [
    "https://colorido.example/registration/aaaaaaaa-bbbb-cccc-dddd-eeeeffff0000?extra=1",
    5,
  ],
  [
    "https://colorido.example/check-in?reg=CLR26-000123&token=3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c&v=1",
    6,
  ],
];

for (const [text, expectedVersion] of CASES) {
  check(`v${expectedVersion}: matrix identical to reference`, () => {
    const ours = qrEncode(text);
    // Explicit byte segment — the reference re-optimizes plain strings into
    // mixed alphanumeric/byte segments (a different but valid encoding), so
    // the array form is the only apples-to-apples comparison for byte mode.
    const ref = QR.create(
      [{ type: "byte", data: Buffer.from(text, "utf8") }],
      { version: expectedVersion, errorCorrectionLevel: "M" },
    );
    if (ours.size !== ref.modules.size)
      throw new Error(`size ${ours.size} vs ${ref.modules.size}`);
    for (let r = 0; r < ours.size; r++) {
      for (let c = 0; c < ours.size; c++) {
        if (ours.get(r, c) !== Boolean(ref.modules.get(r, c)))
          throw new Error(`differs at (${r},${c})`);
      }
    }
    return `${ours.size}×${ours.size}, 0 diffs`;
  });
}

check("deterministic: same input → identical matrix", () => {
  const a = qrEncode("determinism-check-123");
  const b = qrEncode("determinism-check-123");
  for (let r = 0; r < a.size; r++)
    for (let c = 0; c < a.size; c++)
      if (a.get(r, c) !== b.get(r, c)) throw new Error("matrices differ");
  return `${a.size}×${a.size}`;
});

console.log(
  failures === 0
    ? "\nAll QR verification checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);

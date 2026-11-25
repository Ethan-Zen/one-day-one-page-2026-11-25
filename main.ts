// main.ts — publish "The World in One Day" for Wednesday 25 November 2026.
//
// The page is drawn ahead of time and shipped as entry.png beside this file.
// This program's whole job is to hand those exact bytes to the grader after
// checking they would pass the gate: a whole 1024x1024 PNG under 1 MiB.
// It reads nothing from the network and writes nothing but /output/entry.png,
// so two runs of it produce byte-identical output.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";

const MAX_BYTES = 1024 * 1024;
const SIDE = 1024;

function refuse(why: string): never {
  console.error(`entry.png refused before writing: ${why}`);
  process.exit(1);
}

// the repository is mounted read-only; this file and the image sit side by side
const repoRoot = import.meta.dirname ?? dirname(new URL(import.meta.url).pathname);
const sourcePath = join(repoRoot, "entry.png");
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
const outPath = join(outDir, "entry.png");

const bytes = readFileSync(sourcePath);

// 1. the size gate: at most 1 MiB
if (bytes.length === 0) refuse("the file is empty");
if (bytes.length > MAX_BYTES) refuse(`${bytes.length} bytes is over ${MAX_BYTES}`);

// 2. it must be a PNG, told apart by its first bytes
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
  if (bytes[i] !== PNG_SIGNATURE[i]) refuse("the signature is not a PNG's");
}

// 3. IHDR comes first and carries the dimensions; the gate wants 1024 by 1024
if (bytes.toString("latin1", 12, 16) !== "IHDR") refuse("the first chunk is not IHDR");
const width = bytes.readUInt32BE(16);
const height = bytes.readUInt32BE(20);
if (width !== SIDE || height !== SIDE) refuse(`${width}x${height} is not ${SIDE}x${SIDE}`);
const bitDepth = bytes[24];
const colourType = bytes[25];
if (bitDepth !== 8 || (colourType !== 2 && colourType !== 6)) {
  refuse(`bit depth ${bitDepth} colour type ${colourType} is not the 8-bit RGB this page ships`);
}

// 4. a whole file ends on IEND, so the image data is complete
if (bytes.toString("latin1", bytes.length - 8, bytes.length - 4) !== "IEND") {
  refuse("the file does not end on the IEND chunk");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, bytes);

const digest = createHash("sha256").update(bytes).digest("hex");
console.log(`wrote ${outPath}`);
console.log(`${bytes.length} bytes, ${width}x${height}, sha256 ${digest}`);

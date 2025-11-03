import { readFile } from 'node:fs/promises';
import { SourceMapConsumer } from 'source-map-js';

const frames = [
  { file: 'vendor.react-8OAAvjFX.js', line: 17, column: 4340 },
  { file: 'vendor.react-8OAAvjFX.js', line: 17, column: 7915 },
  { file: 'vendor.other-D08RHtzm.js', line: 3876, column: 52 },
  { file: 'vendor.other-D08RHtzm.js', line: 3876, column: 867 },
  { file: 'vendor.other-D08RHtzm.js', line: 3876, column: 891 }
];

async function mapFrame({ file, line, column }) {
  const mapFile = `${file}.map`;
  const mapPath = new URL(`../dist/assets/${mapFile}`, import.meta.url);
  const raw = await readFile(mapPath, 'utf-8');
  const map = JSON.parse(raw);
  const consumer = await new SourceMapConsumer(map);
  const original = consumer.originalPositionFor({ line, column });
  if (typeof consumer.destroy === 'function') {
    consumer.destroy();
  }
  return { file, line, column, original };
}

for (const frame of frames) {
  const result = await mapFrame(frame);
  console.log('\nFrame:', `${result.file}:${result.line}:${result.column}`);
  console.log('  =>', result.original);
}

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

for (const relativePath of ['dist/hook.mjs', 'dist/server.mjs', 'dist/widget.js']) {
  const path = resolve(root, relativePath);
  const source = await readFile(path, 'utf8');
  await writeFile(path, source.replace(/[ \t]+$/gm, ''), 'utf8');
}

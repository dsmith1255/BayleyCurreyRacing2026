import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
// Replace only generated public output; environment files and server source stay out.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const name of await readdir(root)) {
  if (/\.(html|css|js|jpg|jpeg|png|webp|svg)$/.test(name) || name === 'shopify-storefront.mjs' || name === '.nojekyll') await cp(resolve(root, name), resolve(output, name));
}
for (const name of ['assets', 'merch']) await cp(resolve(root, name), resolve(output, name), { recursive: true });
console.log('Built public site in dist/ (environment files excluded).');

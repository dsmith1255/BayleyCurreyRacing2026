import { cp, mkdir, readdir, rm, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
// Copy only public code and referenced media; retain original artwork in the checkout.
const code = [];
async function collect(directory = '') {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const name = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory() && name === 'merch') await collect(name);
    else if (entry.isDirectory() && directory.startsWith('merch')) await collect(name);
    else if (entry.isFile() && (/\.(html|css|js)$/.test(name) || name === 'shopify-storefront.mjs' || name === '.nojekyll')) code.push(name);
  }
}
await collect();
const references = (await Promise.all(code.map(name => readFile(resolve(root, name), 'utf8')))).join('\n');
// Replace only generated public output; environment files and server source stay out.
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
async function copyPublic(name) {
  await mkdir(dirname(resolve(output, name)), { recursive: true });
  await cp(resolve(root, name), resolve(output, name));
}
for (const name of code) await copyPublic(name);
async function copyReferencedMedia(directory = '') {
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    const name = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory() && (name === 'assets' || directory.startsWith('assets'))) await copyReferencedMedia(name);
    else if (entry.isFile() && /\.(jpg|jpeg|png|webp|svg|woff2?)$/.test(name) && references.includes(name)) await copyPublic(name);
  }
}
await copyReferencedMedia();
console.log('Built public site in dist/ (environment files excluded).');

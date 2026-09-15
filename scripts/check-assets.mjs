import assert from 'node:assert/strict';
import { readFile, access, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '../dist');
const pages = ['index.html', 'sponsorship.html', 'merch/index.html', 'merch/tee/index.html', 'merch/hoodie/index.html', 'merch/hat/index.html'];
let checked = 0;
for (const page of pages) {
  const html = await readFile(resolve(root, page), 'utf8');
  const links = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(match => match[1]);
  for (const match of html.matchAll(/srcset="([^"]+)"/g)) links.push(...match[1].split(',').map(item => item.trim().split(' ')[0]));
  for (const url of links) {
    if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
    const clean = decodeURIComponent(url.split(/[?#]/)[0]);
    const target = resolve(clean.startsWith('/') ? root : dirname(resolve(root, page)), '.' + (clean.startsWith('/') ? clean : '/' + clean));
    await access(target);
    checked++;
  }
  for (const match of html.matchAll(/<img\b[^>]*src="\/assets\/optimized\/[^>]*>/g)) {
    assert.match(match[0], /srcset=/);
    assert.match(match[0], /width="\d+" height="\d+"/);
    assert.match(match[0], /loading="(?:lazy|eager)"/);
  }
}
async function bytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) total += entry.isDirectory() ? await bytes(resolve(directory, entry.name)) : (await stat(resolve(directory, entry.name))).size;
  return total;
}
const { default: archive } = await import(pathToFileURL(resolve(root, 'gallery-data.js')).href);
assert.ok(archive.length > 8);
for (const photo of archive) {
  assert.ok(photo.caption && photo.variants.length);
  for (const variant of photo.variants) {
    assert.ok(variant.width > 0 && variant.height > 0);
    assert.match(variant.src, /^\/assets\/optimized\/archive-[a-f0-9]+-\d+\.webp$/);
    await access(resolve(root, '.' + variant.src));
    checked++;
  }
}
const home = await readFile(resolve(root,'index.html'),'utf8');
const gallery = home.match(/<div class="archive-grid"[\s\S]*?<\/div>/)[0];
assert.equal([...gallery.matchAll(/<figure>/g)].length, 8);
assert.ok(home.includes('data-gallery-more'));
console.log(`${checked} local references verified across ${pages.length} pages and ${archive.length} gallery photos. Public bundle: ${await bytes(root)} bytes.`);

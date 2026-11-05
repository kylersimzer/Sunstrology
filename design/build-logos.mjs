// Builds logos.html: logos.template.html with marks.js inlined, so the page stands on its own.
// Run: node design/build-logos.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('.', import.meta.url);
const marks = readFileSync(new URL('marks.js', here), 'utf8').replace(/\nif \(typeof module[^\n]*\n?/, '\n');
const page = readFileSync(new URL('logos.template.html', here), 'utf8').replace('/*MARKS*/', () => marks);
writeFileSync(new URL('logos.html', here), page);
console.log('logos.html', page.length, 'bytes');

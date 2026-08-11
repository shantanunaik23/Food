/**
 * Post-build: fold the CSS and JS into dist/index.html.
 *
 * Leaves a single self-contained file that opens straight from the filesystem.
 * Without this the page is blank over file://, because a `<script type=module>`
 * is fetched under CORS rules that file:// URLs cannot satisfy.
 */

import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const indexPath = join(dist, 'index.html');

if (!existsSync(indexPath)) {
  console.error('inline: dist/index.html not found — did vite build run?');
  process.exit(1);
}

let html = readFileSync(indexPath, 'utf8');
const consumed = [];

// A closing script tag inside a JS string would end the block early.
const escapeForScript = (js) => js.replace(/<\/script/gi, '<\\/script');

html = html.replace(
  /<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/gi,
  (tag, href) => {
    const file = join(dist, href.replace(/^\.?\//, ''));
    if (!existsSync(file)) return tag;
    consumed.push(file);
    return `<style>\n${readFileSync(file, 'utf8')}\n</style>`;
  },
);

/*
 * The script has to end up at the end of <body>, not where Vite put it in
 * <head>. A module script is deferred until after parsing; a classic one runs
 * immediately, and `defer` is ignored on inline scripts — so leaving it in the
 * head means it executes before #root exists.
 */
const scripts = [];

html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/gi, (tag, src) => {
  const file = join(dist, src.replace(/^\.?\//, ''));
  if (!existsSync(file)) return tag;
  consumed.push(file);
  // Deliberately no type="module": a classic script is not CORS-restricted.
  scripts.push(`<script>\n${escapeForScript(readFileSync(file, 'utf8'))}\n</script>`);
  return '';
});

if (scripts.length) {
  const block = scripts.join('\n');
  // Function replacement, not a string: a bundle is full of `$` sequences and
  // String.replace would expand `$&` and friends inside them.
  html = html.includes('</body>')
    ? html.replace('</body>', () => `${block}\n</body>`)
    : html + block;
}

writeFileSync(indexPath, html);
for (const file of consumed) rmSync(file, { force: true });

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`\n  inlined ${consumed.length} asset(s) — dist/index.html is now ${kb} kB and self-contained\n`);

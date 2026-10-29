// Fails if a useTranslations('ns') namespace is missing from CLIENT_NAMESPACES
// (src/i18n/client-namespaces.ts): that component would show raw keys.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const listed = new Set(
  [...readFileSync('src/i18n/client-namespaces.ts', 'utf8').matchAll(/^\s+'([\w-]+)',$/gm)].map((m) => m[1]),
);
const used = new Map();
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(name)) {
      for (const m of readFileSync(p, 'utf8').matchAll(/useTranslations\(\s*(['"`])([^'"`]*)\1/g)) {
        const root = m[2].split('.')[0];
        // 'namespace' is the placeholder in a how-to comment in src/lib/strings.ts.
        if (root && root !== 'namespace') used.set(root, p);
      }
    }
  }
};
walk('src');
const missing = [...used].filter(([ns]) => !listed.has(ns));
if (missing.length) {
  for (const [ns, file] of missing) console.error(`Missing client namespace "${ns}" (used in ${file})`);
  process.exit(1);
}
console.log(`client namespaces ok (${used.size} used, ${listed.size} listed)`);

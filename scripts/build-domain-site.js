// Create only the two subdirectories needed by the parent website. Never change its home page.
import { cp, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../', import.meta.url));
const canonical = 'https://themeyers.ilymmd.com/';

export function legacyRedirectHtml() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><meta name="referrer" content="no-referrer">
<title>The Meyers</title><link rel="canonical" href="${canonical}">
<script>
const target = new URL(${JSON.stringify(canonical)});
target.search = window.location.search;
target.hash = window.location.hash;
window.location.replace(target.href);
</script></head><body><p>Continue to <a id="continue" href="${canonical}">The Meyers Gatherings</a>.</p>
<script>document.getElementById('continue').href = target.href;</script>
<noscript>Please enable JavaScript to keep your invitation sign-in link when continuing.</noscript></body></html>\n`;
}

export async function buildDomainSite(output) {
  const destination = resolve(output);
  // Fail rather than overwrite existing published directories or source files.
  for (const name of ['themeyers', 'themeyersgatherings']) {
    try { await access(join(destination, name)); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    throw new Error(`${name}/ already exists in the output directory.`);
  }
  const site = join(destination, 'themeyers');
  await mkdir(site, { recursive: true });
  const html = await readFile(join(source, 'index.html'), 'utf8');
  const files = new Set([...html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"/g)]
    .map(match => match[1].split(/[?#]/)[0]).filter(path => !/^(?:[a-z]+:|\/)/i.test(path)));
  for (const file of files) {
    if (file.split('/').includes('..')) throw new Error('Site assets must stay within the source directory.');
    await mkdir(dirname(join(site, file)), { recursive: true });
    await cp(join(source, file), join(site, file));
  }
  for (const directory of ['assets', 'vendor', 'data']) await cp(join(source, directory), join(site, directory), { recursive: true });
  for (const file of ['service-worker.js', 'offline.html']) await cp(join(source, file), join(site, file));
  await writeFile(join(site, 'index.html'), html.replace('</head>', `    <link rel="canonical" href="${canonical}" />\n  </head>`));
  await mkdir(join(destination, 'themeyersgatherings'));
  await writeFile(join(destination, 'themeyersgatherings/index.html'), legacyRedirectHtml());
  return destination;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/build-domain-site.js OUTPUT_DIRECTORY');
  console.log(await buildDomainSite(process.argv[2]));
}

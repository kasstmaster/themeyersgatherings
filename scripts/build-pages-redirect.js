import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Deliberately contains no application, saved state, assets or service worker.
export const redirectHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>The Meyers Gatherings</title></head>
<body><p>Opening <a href="https://themeyers.ilymmd.com/">The Meyers Gatherings</a>…</p>
<script>window.location.replace('https://themeyers.ilymmd.com/'+window.location.search+window.location.hash);</script>
</body></html>
`;
export const redirectFiles = {'index.html':redirectHtml, '404.html':redirectHtml, '.nojekyll':''};
export async function buildPagesRedirect(directory) {
  await mkdir(directory); // Refuse to mix with an old checkout/artifact.
  for (const [name,content] of Object.entries(redirectFiles)) await writeFile(resolve(directory,name),content);
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  await buildPagesRedirect(resolve(process.argv[2]||'.pages-redirect'));
}

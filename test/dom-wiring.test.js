import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('statically registered event targets exist in the page', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  const pageIds = new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
  const registeredIds = [...javascript.matchAll(/document\.querySelector\('#([^']+)'\)\.addEventListener/g)]
    .map(match => match[1]);

  // This control is rendered into the field inspector before its listener is registered.
  const dynamicallyRenderedIds = new Set(['deleteTemplateField']);
  const missingIds = [...new Set(registeredIds)]
    .filter(id => !pageIds.has(id) && !dynamicallyRenderedIds.has(id));

  assert.deepEqual(missingIds, [], `Event listeners reference missing page elements: ${missingIds.join(', ')}`);
});

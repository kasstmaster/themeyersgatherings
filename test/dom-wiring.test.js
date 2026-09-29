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

test('template editor renders and refreshes a real QR preview', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /function templateEditorQrSvg\(\)[\s\S]*qrSvg\(makeQrCode\(invitationQrUrl\(account\)\)\)/);
  assert.match(javascript, /#templatePreviewAccount'\)\.addEventListener\('change', renderEditorFields\)/);
  assert.doesNotMatch(javascript, /Sample account QR|sample-qr/);
});

test('account invitation preview opens immediately and reports its loading state', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const previewFunction = javascript.match(/async function openInvitationPreview[\s\S]*?\n}\nasync function downloadInvitation/)?.[0] || '';

  assert.match(previewFunction, /status\.textContent = 'Loading invitation preview…'/);
  assert.ok(previewFunction.indexOf('dialog.showModal()') < previewFunction.indexOf('await renderInvitation'), 'the preview should open before its background finishes loading');
  assert.match(previewFunction, /appState\.invitationTemplates\.length === 1[\s\S]*state\.invitationTemplateId = assignedTemplate\.id/);
  assert.match(previewFunction, /saved invitation templates, but none is assigned/);
  assert.match(previewFunction, /Unable to preview the invitation/);
});

test('creating the first template assigns it to the viewed gathering', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const createHandler = javascript.match(/#createTemplateButton'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(createHandler, /appState\.invitationTemplates\.push\(template\)[\s\S]*state\.invitationTemplateId = template\.id[\s\S]*saveState\(\)/);
});

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
  assert.match(previewFunction, /gatheringTemplates\.length === 1[\s\S]*state\.invitationTemplateId = assignedTemplate\.id/);
  assert.match(previewFunction, /saved invitation templates for[\s\S]*none is selected/);
  assert.match(previewFunction, /Unable to preview the invitation/);
});

test('creating the first template assigns it to the viewed gathering', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const createHandler = javascript.match(/#createTemplateButton'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(createHandler, /template\.eventId = viewedEventId[\s\S]*appState\.invitationTemplates\.push\(template\)[\s\S]*state\.invitationTemplateId = template\.id[\s\S]*saveState\(\)/);
});

test('template manager only renders templates for the previewed gathering', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /function invitationTemplatesForEvent\(eventId = viewedEventId\)[\s\S]*template\.eventId === eventId/);
  assert.match(javascript, /function renderTemplateManager\(\)[\s\S]*const gatheringTemplates = invitationTemplatesForEvent\(\)[\s\S]*gatheringTemplates\.map/);
  assert.match(javascript, /function renderInvitationSettings\(\)[\s\S]*invitationTemplatesForEvent\(\)\.map/);
});

test('wedding party access is tied to the individual sign-in name', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="weddingPartyTabs"[\s\S]*Registry &amp; Attire[\s\S]*Wedding Party/);
  assert.match(javascript, /signedInPersonName = accountName/);
  assert.match(javascript, /state\.weddingPartyMembers\?\.find\(member => normalizeAccountName\(member\.name\) === normalizeAccountName\(signedInPersonName\)\)/);
  assert.match(javascript, /hostAuthenticated \|\| Boolean\(signedInWeddingPartyMember\)/);
  assert.match(javascript, /weddingPartyTabs\.hidden = !isWeddingPartyMember/);
});

test('wedding party manager only accepts people from wedding-invited accounts', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const addHandler = javascript.match(/#adminAddWeddingPartyMember'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(addHandler, /accountNameMatches\(name, item\.name\)/);
  assert.match(addHandler, /accountCanSignIn\(account, 'wedding'\)/);
  assert.match(addHandler, /state\.weddingPartyMembers\.push\(\{ name, title: selectedTitle\.value, description:/);
});

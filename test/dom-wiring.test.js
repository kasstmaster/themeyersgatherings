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
  assert.match(javascript, /visibleWeddingPartyMembers = \[viewedWeddingPartyMember\]\.filter\(Boolean\)/);
  assert.match(javascript, /function formatWeddingPartyDescription\(value\)[\s\S]*<strong>[\s\S]*<li>/);
  assert.match(javascript, /state\.weddingPartyDescriptions\?\.\[member\.title\]/);
  assert.match(javascript, /formatWeddingPartyDescription\(description\)/);
  assert.match(html, /id="previewWeddingPartyButton"[\s\S]*Preview wedding party view/);
  assert.match(javascript, /#openWeddingPartyPreview'[\s\S]*hostWeddingPartyViewName = document\.querySelector\('#hostWeddingPartyView'\)\.value[\s\S]*enterEvent\('wedding'\)/);
});

test('wedding party manager only accepts people from wedding-invited accounts', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const addHandler = javascript.match(/#adminAddWeddingPartyMember'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(addHandler, /accountNameMatches\(name, item\.name\)/);
  assert.match(addHandler, /accountCanSignIn\(account, 'wedding'\)/);
  assert.match(addHandler, /state\.weddingPartyMembers\.push\(\{ name, title: selectedTitle\.value \}\)/);
});

test('wedding party descriptions are shared and editable by title', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /const DEFAULT_WEDDING_PARTY_DESCRIPTIONS = \{[\s\S]*'Matron of Honor'[\s\S]*Officiant/);
  assert.match(javascript, /id="adminWeddingPartyDescriptions"|#adminWeddingPartyDescriptions/);
  assert.match(javascript, /data-wedding-party-description=/);
  assert.match(javascript, /state\.weddingPartyDescriptions\[title\] = event\.target\.value\.trim\(\)/);
  assert.doesNotMatch(javascript.match(/data-wedding-party-description=[\s\S]*?<\/label>/)?.[0] || '', /\bmaxlength=/i);
});

test('bachelorette party brief is available only to the Matron of Honor with sharing actions', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="bacheloretteInfoButton"[\s\S]*Bachelorette Party Info/);
  assert.match(html, /id="bacheloretteInfoDialog"[\s\S]*id="copyBacheloretteInfo"[\s\S]*id="emailBacheloretteInfo"[\s\S]*id="printBacheloretteInfo"/);
  assert.match(html, /relaxed girls' getaway[\s\S]*The Most Important Rule[\s\S]*cozy two-night girls' getaway/);
  assert.match(javascript, /bacheloretteInfoButton'\)\.hidden = !showingWeddingPartyPage \|\| viewedWeddingPartyMember\?\.title !== 'Matron of Honor'/);
  assert.match(javascript, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(javascript, /mailto:\?subject=/);
  assert.match(javascript, /window\.print\(\)/);
});

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

  assert.match(html, /id="weddingPartyTabs"[\s\S]*>Attire<[\s\S]*>Registry<[\s\S]*>Your Role</);
  assert.match(javascript, /signedInPersonName = accountName/);
  assert.match(javascript, /state\.weddingPartyMembers\?\.find\(member => normalizeAccountName\(member\.name\) === normalizeAccountName\(signedInPersonName\)\)/);
  assert.match(javascript, /hostAuthenticated && hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW/);
  assert.match(javascript, /weddingPartyTabs\.hidden = !isWedding/);
  assert.match(javascript, /visibleWeddingPartyMembers = \[viewedWeddingPartyMember\]\.filter\(Boolean\)/);
  assert.match(javascript, /function formatWeddingPartyDescription\(value\)[\s\S]*<strong>[\s\S]*<li>/);
  assert.match(javascript, /state\.weddingPartyDescriptions\?\.\[member\.title\]/);
  assert.match(javascript, /formatWeddingPartyDescription\(description\)/);
  assert.match(html, /id="previewWeddingPartyButton"[\s\S]*Preview Party\/Guest view/);
  assert.match(javascript, /#openWeddingPartyPreview'[\s\S]*hostWeddingPartyViewName = document\.querySelector\('#hostWeddingPartyView'\)\.value[\s\S]*enterEvent\('wedding'\)/);
});

test('wedding attire and registry have separate guest-visible tabs with attire selected by default', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.ok(html.indexOf('id="registryAttireSection"') < html.indexOf('id="registrySection"'));
  assert.match(html, /data-wedding-tab="attire"[^>]*aria-selected="true">Attire/);
  assert.match(html, /data-wedding-tab="registry"[^>]*aria-selected="false">Registry/);
  assert.match(styles, /\.wedding-party-tabs button\{[^}]*color:#fff/);
  assert.match(styles, /\.wedding-party-tabs button\[aria-selected="true"\]\{[^}]*border:1px solid var\(--gold\)[^}]*background:var\(--orange\)[^}]*color:#fff/);
});

test('Bride & Groom is a host-only Markdown page edited from wedding details', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.ok(html.indexOf('data-wedding-tab="couple"') < html.indexOf('data-wedding-tab="attire"'));
  assert.match(html, /data-wedding-tab="couple"[^>]*hidden>Bride &amp; Groom/);
  assert.match(html, /id="brideGroomHeading">Bride &amp; Groom/);
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('Bride &amp; Groom page') < weddingEditor.indexOf('Title descriptions'));
  const editor = html.match(/<textarea id="adminBrideGroomContent"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(editor, /maxlength/);
  assert.match(javascript, /button\.dataset\.weddingTab === 'couple' && !hostAuthenticated/);
  assert.match(javascript, /showingBrideGroomPage = isWedding && hostAuthenticated && selectedWeddingTab === 'couple'/);
  assert.match(javascript, /brideGroomContent'\)\.innerHTML = formatEditableText\(state\.brideGroomContent\)/);
  assert.match(javascript, /#adminBrideGroomContent'\)\.addEventListener\('change'/);
  assert.match(javascript, /state\.brideGroomContent = event\.target\.value/);
});

test('wedding party tabs use guest-facing labels and only restrict Your Role', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, />Your Role<\/button>/);
  assert.match(html, />Responsibilities<\/button>/);
  assert.match(javascript, /button\.hidden = button\.dataset\.weddingTab === 'party' && !isWeddingPartyMember/);
  assert.match(javascript, /registrySection\.hidden = !showingRegistryPage/);
  assert.match(javascript, /querySelector\('#registryAttireSection'\)\.hidden = !showingAttirePage/);
});

test('selected wedding detail tabs use white text inside a visible tab', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.matron-info-tabs button\[aria-selected="true"\]\{[^}]*border:1px solid var\(--gold\)[^}]*background:var\(--orange\)[^}]*color:#fff/);
});

test('host can preview the wedding as a general guest without selecting an account', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /<h2>Preview Party\/Guest view<\/h2>/);
  assert.match(javascript, /const GENERAL_GUEST_PREVIEW = '__general_guest__'/);
  assert.match(javascript, />General guest<\/option>/);
  assert.match(javascript, /hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW/);
  assert.match(javascript, /hostWeddingPartyViewName === GENERAL_GUEST_PREVIEW \? 'attire' : 'party'/);
});

test('private attire galleries are rendered only for wedding party viewers', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="weddingPartyLadiesAttire"[\s\S]*id="weddingPartyGentlemenAttire"/);
  assert.match(javascript, /renderWeddingPartyAttireImages\(isWeddingPartyMember && showingAttirePage\)/);
  assert.match(javascript, /const entries = canView && Array\.isArray\(images\[section\]\) \? images\[section\] : \[\]/);
  assert.match(html, /id="adminWeddingPartyAttireCaption"[\s\S]*id="adminWeddingPartyAttireFile"/);
});

test('wedding detail editor places party copy and private attire before tip videos', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';

  assert.ok(weddingEditor.indexOf('Title descriptions') < weddingEditor.indexOf('Private attire images'));
  assert.ok(weddingEditor.indexOf('Private attire images') < weddingEditor.indexOf('Formal attire tip videos'));
  assert.equal((html.match(/id="adminWeddingPartyDescriptions"/g) || []).length, 1);
  assert.equal((html.match(/id="adminWeddingPartyAttireImages"/g) || []).length, 1);
});

test('wedding party attire images show the complete upload with rounded edges', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.wedding-party-attire-gallery img\{[^}]*width:100%;height:auto;[^}]*border-radius:5px/);
  assert.match(styles, /\.wedding-party-attire-image-list img\{[^}]*object-fit:contain;[^}]*border-radius:4px/);
  assert.doesNotMatch(styles, /\.wedding-party-attire-gallery img\{[^}]*object-fit:cover/);
});

test('wedding party viewers keep shopping links but do not see guest attire requirements', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.equal((html.match(/class="guest-attire-requirements"/g) || []).length, 2);
  assert.match(html, /guest-attire-requirements[\s\S]*Shop Pre-Loved[\s\S]*Shop Affordable New/);
  assert.match(javascript, /querySelectorAll\('#registryAttireSection \.guest-attire-requirements'\)[\s\S]*requirements\.hidden = isWeddingPartyMember/);
});

test('private attire image picker supports clicking and drag and drop', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="adminWeddingPartyAttireDropzone"[\s\S]*Drop an image here/);
  assert.match(javascript, /configureDropzone\(weddingPartyAttireDropzone, weddingPartyAttireFileInput/);
  assert.match(javascript, /if \(!weddingPartyAttireFile\)[\s\S]*fileInput\.click\(\)/);
  assert.match(javascript, /uploadWeddingPartyAttireImage\(crypto\.randomUUID\(\), weddingPartyAttireFile\)/);
});

test('private attire notes and image captions are unlimited and editable', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="adminWeddingPartyLadiesAttireNote"[\s\S]*id="adminWeddingPartyGentlemenAttireNote"/);
  assert.doesNotMatch(html.match(/id="adminWeddingPartyCaption"[^>]*|id="adminWeddingPartyAttireCaption"[^>]*/)?.[0] || '', /maxlength/);
  assert.match(javascript, /weddingPartyAttireNotes: \{ ladies: '', gentlemen: '' \}/);
  assert.match(javascript, /class="wedding-party-attire-note"/);
  assert.match(javascript, /data-party-attire-caption=/);
  assert.match(javascript, /image\.caption = input\.value\.trim\(\)/);
  assert.match(javascript, /<figcaption>\$\{formatEditableText\(image\.caption\)\}<\/figcaption>/);
  assert.match(javascript, /class="wedding-party-attire-note">\$\{formatEditableText\(note\)\}/);
});

test('all editable wedding party copy supports safe Markdown formatting', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /function formatWeddingPartyDescription\(value\)/);
  assert.match(javascript, /replace\(\/\\\*\\\*\(\.\+\?\)\\\*\\\*\/g, '<strong>\$1<\/strong>'\)/);
  assert.match(javascript, /output\.push\(`<li>\$\{formatInline/);
  assert.match(javascript, /function formatEditableText\(value\) \{ return formatWeddingPartyDescription\(value\); \}/);
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

test('bachelorette party brief replaces the Matron of Honor duties panel', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="matronInfoTabs"[\s\S]*data-matron-tab="duties"[\s\S]*data-matron-tab="bachelorette"/);
  assert.match(html, /id="weddingPartyDetails"[\s\S]*id="bacheloretteInfoPanel"[\s\S]*id="copyBacheloretteInfo"[\s\S]*id="emailBacheloretteInfo"[\s\S]*id="printBacheloretteInfo"/);
  assert.doesNotMatch(html, /id="bacheloretteInfoDialog"/);
  assert.match(html, /relaxed girls' getaway[\s\S]*The Most Important Rule[\s\S]*cozy two-night girls' getaway/);
  assert.match(javascript, /isViewingMatron = showingWeddingPartyPage && viewedWeddingPartyMember\?\.title === 'Matron of Honor'/);
  assert.match(javascript, /weddingPartyDetails'\)\.hidden = isViewingMatron && selectedMatronTab === 'bachelorette'/);
  assert.match(styles, /\.wedding-party-details\[hidden\]\{display:none\}/);
  assert.match(javascript, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(javascript, /mailto:\?subject=/);
  assert.match(javascript, /window\.print\(\)/);
});

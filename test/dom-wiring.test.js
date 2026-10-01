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

test('sync status stays hidden unless shared saving needs attention', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="syncStatus"[^>]*hidden/);
  assert.match(javascript, /status\.hidden = false;[\s\S]*status\.className = 'sync-status local-only'/);
  assert.match(javascript, /status\.hidden = !sharedSaveError/);
  assert.doesNotMatch(javascript, /Cross-device saving is on/);
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

  assert.match(html, /id="weddingPartyTabs"[\s\S]*>Wedding Party<[\s\S]*>Attire<[\s\S]*>Registry</);
  assert.match(javascript, /signedInPersonName = accountName/);
  assert.match(javascript, /state\.weddingPartyMembers\?\.find\(member => normalizeAccountName\(member\.name\) === normalizeAccountName\(signedInPersonName\)\)/);
  assert.match(javascript, /viewingAsGuest && hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW/);
  assert.match(javascript, /weddingPartyTabs\.hidden = !isWedding/);
  assert.match(javascript, /visibleWeddingPartyMembers = \[viewedWeddingPartyMember\]\.filter\(Boolean\)/);
  assert.match(javascript, /function formatWeddingPartyDescription\(value\)[\s\S]*<strong>[\s\S]*<li>/);
  assert.match(javascript, /state\.weddingPartyDescriptions\?\.\[member\.title\]/);
  assert.match(javascript, /formatWeddingPartyDescription\(description\)/);
  assert.match(html, /id="previewWeddingPartyButton"[\s\S]*Preview Party\/Guest view/);
  assert.match(javascript, /#openWeddingPartyPreview'[\s\S]*hostWeddingPartyViewName = document\.querySelector\('#hostWeddingPartyView'\)\.value[\s\S]*enterEvent\('wedding', \{ preserveWeddingView: true \}\)/);
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

test('Wedding Details is a guest-only editable page immediately after Attire', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  const pageTabs = html.match(/<nav id="weddingPartyTabs"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.match(pageTabs, /data-wedding-tab="attire"[\s\S]*data-wedding-tab="expect"[^>]*>Wedding Details<\/button>[\s\S]*data-wedding-tab="registry"/);
  assert.match(html, /id="whatToExpectSection"[^>]*hidden/);
  assert.match(html, /<h2 id="whatToExpectHeading">Wedding Details<\/h2>/);
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('The Perfect Experience page') < weddingEditor.indexOf('What to Expect page'));
  assert.match(javascript, /whatToExpectContent: ''/);
  assert.match(javascript, /button\.dataset\.weddingTab === 'expect' && isWeddingPartyMember/);
  assert.match(javascript, /formatEditableText\(state\.whatToExpectContent\)/);
  assert.match(javascript, /state\.whatToExpectContent = event\.target\.value/);
});

test('Bride & Groom is a host-only Markdown page edited from wedding details', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.ok(html.indexOf('data-wedding-tab="couple"') < html.indexOf('data-wedding-tab="party"'));
  assert.match(html, /data-wedding-tab="couple"[^>]*hidden>Bride &amp; Groom/);
  assert.match(html, /id="brideGroomHeading">Bride &amp; Groom/);
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('Bride &amp; Groom page') < weddingEditor.indexOf('Title descriptions'));
  const editor = html.match(/<textarea id="adminBrideGroomContent"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(editor, /maxlength/);
  assert.match(javascript, /button\.dataset\.weddingTab === 'couple' && !hostView/);
  assert.match(javascript, /showingBrideGroomPage = isWedding && hostView && selectedWeddingTab === 'couple'/);
  assert.match(javascript, /brideGroomContent'\)\.innerHTML = formatEditableText\(state\.brideGroomContent\)/);
  assert.match(javascript, /#adminBrideGroomContent'\)\.addEventListener\('change'/);
  assert.match(javascript, /state\.brideGroomContent = event\.target\.value/);
});

test('wedding page tabs use guest-facing labels and audience-specific visibility', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, />Wedding Party<\/button>/);
  assert.match(html, />Responsibilities<\/button>/);
  assert.match(javascript, /button\.hidden = \(button\.dataset\.weddingTab === 'party' && !isWeddingPartyMember\)[\s\S]*button\.dataset\.weddingTab === 'attire' && isWeddingPartyMember/);
  assert.match(javascript, /registrySection\.hidden = !showingRegistryPage/);
  assert.match(javascript, /registryAttireSection\.hidden = !showingAttirePage/);
});

test('wedding party attire shares the Wedding Party card and Registry remains rightmost', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  const pageTabs = html.match(/<nav id="weddingPartyTabs"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.ok(pageTabs.indexOf('data-wedding-tab="party"') < pageTabs.indexOf('data-wedding-tab="registry"'));
  assert.ok(pageTabs.indexOf('data-wedding-tab="party"') < pageTabs.indexOf('data-wedding-tab="attire"'));
  assert.match(html, /data-matron-tab="experience"[^>]*>The Perfect Experience<\/button>\s*<button[^>]*data-matron-tab="duties"[^>]*>Responsibilities<\/button>\s*<button[^>]*data-matron-tab="attire"[^>]*>Attire<\/button>/);
  assert.match(javascript, /isWeddingPartyMember && selectedWeddingTab === 'attire'\) selectedWeddingTab = 'party'/);
  assert.match(javascript, /showingPartyAttirePage = showingWeddingPartyPage && selectedMatronTab === 'attire'/);
  assert.match(javascript, /showingAttirePage = isWedding && \(\(!isWeddingPartyMember && selectedWeddingTab === 'attire'\) \|\| showingPartyAttirePage\)/);
  assert.match(javascript, /renderWeddingPartyAttireImages\(showingPartyAttirePage\)/);
  assert.match(javascript, /showingPartyAttirePage[\s\S]*weddingPartyAttirePanel[\s\S]*attireDestination\.append\(registryAttireSection\)/);
  assert.match(html, /id="weddingPartyAttirePanel"[\s\S]*id="guestAttireAnchor"[\s\S]*id="registryAttireSection"/);
});

test('selected wedding detail tabs use white text inside a visible tab', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.matron-info-tabs button\[aria-selected="true"\]\{[^}]*border:1px solid var\(--gold\)[^}]*background:var\(--orange\)[^}]*color:#fff/);
});

test('The Perfect Experience is an editable tab for every wedding party member', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /The Perfect Experience<\/button>[\s\S]*data-matron-tab="duties"[^>]*>Responsibilities<\/button>[\s\S]*data-matron-tab="attire"/);
  assert.match(html, /id="perfectExperiencePanel"[^>]*aria-label="The Perfect Experience"/);
  assert.match(html, /id="adminPerfectExperienceContent"/);
  assert.match(javascript, /perfectExperienceContent: ''/);
  assert.match(javascript, /formatEditableText\(state\.perfectExperienceContent\)/);
  assert.match(javascript, /state\.perfectExperienceContent = event\.target\.value/);
  assert.match(javascript, /matronInfoTabs\.hidden = !showingWeddingPartyPage/);
  assert.match(javascript, /button\.hidden = button\.dataset\.matronTab === 'bachelorette' && !isViewingMatron/);
  assert.match(javascript, /perfectExperiencePanel'\)\.hidden = !showingWeddingPartyPage \|\| selectedMatronTab !== 'experience'/);
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

test('View As removes host-only UI and provides a persistent return to Host View', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="cancelViewAsButton"[^>]*hidden>Cancel view<\/button>/);
  assert.match(javascript, /function isHostView\(\) \{ return hostAuthenticated && !isViewingAsGuest\(\); \}/);
  assert.match(javascript, /hostToolsPanel'\)\.hidden = !hostAuthenticated \|\| viewingAsGuest/);
  assert.match(javascript, /cancelViewAsButton'\)\.hidden = !viewingAsGuest/);
  assert.match(javascript, /#cancelViewAsButton'[\s\S]*hostWeddingPartyViewName = '';[\s\S]*selectedWeddingTab = 'couple'/);
  assert.match(styles, /\.cancel-view-as\{[^}]*position:fixed;[^}]*top:16px;right:16px;[^}]*z-index:30/);
});

test('private attire galleries are rendered only for wedding party viewers', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="weddingPartyLadiesAttire"[\s\S]*id="weddingPartyGentlemenAttire"/);
  assert.match(javascript, /renderWeddingPartyAttireImages\(showingPartyAttirePage\)/);
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
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(javascript, /function formatWeddingPartyDescription\(value\)/);
  assert.match(javascript, /replace\(\/\\\*\\\*\(\.\+\?\)\\\*\\\*\/g, '<strong>\$1<\/strong>'\)/);
  assert.match(javascript, /output\.push\(`<li>\$\{formatInline/);
  assert.match(javascript, /function formatEditableText\(value\) \{ return formatWeddingPartyDescription\(value\); \}/);
  assert.match(javascript, /output\.push\('<hr>'\)/, 'a standalone --- should render a divider');
  assert.match(javascript, /href="geo:0,0\?q=\$\{encodeURIComponent\(address\)\}"/, 'angle-bracketed addresses should use the device maps handler');
  assert.match(html, /Put <code>---<\/code> on its own line for a divider/);
});

test('wedding party manager creates wedding-enabled accounts for new people', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const addHandler = javascript.match(/#adminAddWeddingPartyMember'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(addHandler, /accountNameMatches\(name, item\.name\)/);
  assert.match(addHandler, /account = \{ name, selected: false, selectedEvents: \{ wedding: true \}, alwaysInvite: false \}/);
  assert.match(addHandler, /appState\.accounts\.push\(account\)/);
  assert.match(addHandler, /accountCanSignIn\(account, 'wedding'\)/);
  assert.match(addHandler, /state\.weddingPartyMembers\.push\(\{ name, title: selectedTitle\.value \}\)/);
});

test('wedding party editor arranges complementary roles together', async () => {
  const [javascript, styles] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  const renderer = javascript.match(/function renderWeddingPartyMemberList[\s\S]*?\n}/)?.[0] || '';
  assert.match(renderer, /fullWidthGroup\('Officiant', 'top'\)[\s\S]*pairedGroup\('Matron of Honor', 'Best Man'\)[\s\S]*pairedGroup\('Bridesmaid', 'Groomsman'\)[\s\S]*pairedGroup\('Flower Girl', 'Ring Bearer'\)[\s\S]*fullWidthGroup\('Ushers', 'bottom'\)/);
  assert.match(styles, /\.wedding-party-pair\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
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
  assert.match(javascript, /weddingPartyDetails'\)\.hidden = showingWeddingPartyPage && selectedMatronTab !== 'duties'/);
  assert.match(styles, /\.wedding-party-details\[hidden\]\{display:none\}/);
  assert.match(javascript, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(javascript, /mailto:\?subject=/);
  assert.match(javascript, /window\.print\(\)/);
});


test('wedding defaults match each signed-in audience', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /eventId === 'wedding' && !preserveWeddingView[\s\S]*hostAuthenticated \? 'couple' : partyMember \? 'party' : 'attire'/);
  assert.match(javascript, /selectedMatronTab = 'experience'/);
  assert.match(javascript, /enterEvent\('wedding', \{ preserveWeddingView: true \}\)/);
});

test('choosing Wedding from Gatherings restores the host Bride & Groom tab', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const eventPreviewHandler = javascript.match(/querySelectorAll\('\[data-preview-event\]'\)[\s\S]*?\n  \}\)\);/)?.[0] || '';

  assert.match(eventPreviewHandler, /const eventId = button\.dataset\.previewEvent/);
  assert.match(eventPreviewHandler, /enterEvent\(eventId\)/);
  assert.doesNotMatch(eventPreviewHandler, /viewedEventId = button\.dataset\.previewEvent[\s\S]*render\(\)/);
  assert.match(javascript, /eventId === 'wedding' && !preserveWeddingView[\s\S]*selectedWeddingTab = hostAuthenticated \? 'couple'/);
});

test('host tools are persistent buttons directly below the signed-in household', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  const accountIndex = html.indexOf('id="signedInAccount"');
  const toolsIndex = html.indexOf('id="hostToolsPanel"');
  const mainIndex = html.indexOf('<main>');
  assert.ok(accountIndex < toolsIndex && toolsIndex < mainIndex);
  assert.match(html, /id="hostToolsPanel"[\s\S]*>Gatherings<\/button>[\s\S]*>Wedding Details<\/button>[\s\S]*>Clear a Claim<\/button>[\s\S]*>Accounts<\/button>[\s\S]*>View As<\/button>[\s\S]*>Templates<\/button>/);
  assert.match(javascript, /hostToolsPanel'\)\.hidden = !hostAuthenticated/);
});

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

test('AnyList accounts are read-only while wedding party editing remains available', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  const accountsEditor = html.match(/<dialog id="accountsDialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.doesNotMatch(accountsEditor, /adminNewAccount|adminAddAccountButton/);
  assert.match(accountsEditor, /id="syncAnyListButton"/);
  const accountRenderer = javascript.match(/function openAccountsAdmin\(\)[\s\S]*?\n}\n\nfunction renderWeddingPartyAdmin/)?.[0] || '';
  assert.doesNotMatch(accountRenderer, /addEventListener\('change', \(\) => renameAccount|account-delete-button/);
  assert.match(javascript, /id="adminAddWeddingPartyMember"|#adminAddWeddingPartyMember/);
});

test('contact accounts are displayed as surname groups with inline children', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /function accountContactGroups\(accountName\)/);
  assert.match(javascript, /<strong>\$\{escapeHtml\(group\.surname\)\}:<\/strong> \$\{group\.givenNames\.map\(escapeHtml\)\.join\(', '\)\}/);
  assert.match(javascript, /<strong>Children:<\/strong> \$\{account\.children\.map\(escapeHtml\)\.join\(', '\)\}/);
  assert.match(javascript, /<div class="account-people">\$\{accountContactsHtml\(account\)\}<\/div>/);
});

test('invited families show household and overall adult and child totals', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /Families invited<\/h2>[\s\S]*id="invitedPeopleTotal"/);
  assert.match(javascript, /accountSignInNames\(account\.name\)\.length/);
  assert.match(javascript, /\(account\.children \|\| \[\]\)\.length/);
  assert.match(javascript, /const invitedAccounts = appState\.accounts\.filter\(account => accountIsInvited\(account, viewedEventId\)\)/);
});

test('every gathering can assign its own plus ones and include them in adult invitation totals', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const accountRenderer = javascript.match(/function openAccountsAdmin\(\)[\s\S]*?\n}\n\nfunction renderWeddingPartyAdmin/)?.[0] || '';

  assert.match(accountRenderer, />Plus ones<\/span>/);
  assert.match(accountRenderer, /account\.plusOnes\[viewedEventId\] = Number\(event\.target\.value\)/);
  assert.match(javascript, /plusOneCount\(account, viewedEventId\)/);
  assert.match(javascript, /adults: sum\.adults \+ accountSignInNames\(account\.name\)\.length \+ plusOneCount/);
});

test('gathering access and invitations are independent per-account settings', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const accountRenderer = javascript.match(/function openAccountsAdmin\(\)[\s\S]*?\n}\n\nfunction renderWeddingPartyAdmin/)?.[0] || '';
  const gatheringRenderer = javascript.match(/function openEventsAdmin\(\)[\s\S]*?\n}\nfunction updateClearClaimFamilies/)?.[0] || '';

  assert.match(accountRenderer, />Give Access<\/span>/);
  assert.doesNotMatch(accountRenderer, />Can sign in<\/span>/);
  assert.match(accountRenderer, />Invite<\/span>/);
  assert.match(accountRenderer, /account\.selectedEvents\[viewedEventId\] = event\.target\.checked/);
  assert.match(accountRenderer, /account\.invitedEvents\[viewedEventId\] = event\.target\.checked/);
  assert.doesNotMatch(accountRenderer, /Always Invite|account-always-invite/);
  assert.doesNotMatch(gatheringRenderer, /Activate|Deactivate|data-toggle-event/);
});

test('account invitation preview is stacked below the QR preview', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.account-preview-actions\{[^}]*display:flex;[^}]*flex-direction:column;/);
});

test('saved gathering access overrides retired account-wide access flags', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const normalizer = javascript.match(/function normalizeState\(saved\)[\s\S]*?\nfunction loadState\(\)/)?.[0] || '';

  assert.match(normalizer, /typeof account\.selectedEvents\?\.\[eventId\] === 'boolean'\s*\? account\.selectedEvents\[eventId\]\s*: legacySelection/);
  assert.doesNotMatch(normalizer, /account\.alwaysInvite === true \|\| \(typeof account\.selectedEvents/);
  assert.match(normalizer, /typeof account\.invitedEvents\?\.\[eventId\] === 'boolean'[\s\S]*?: typeof account\.selectedEvents\?\.\[eventId\] === 'boolean'[\s\S]*?\? account\.selectedEvents\[eventId\][\s\S]*?: legacySelection/);
});

test('editor inputs autosave while typing and every exit commits anything still pending', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /const editorInputSaveTimers = new WeakMap\(\)/);
  assert.match(javascript, /function commitPendingEditorControl\(control\)/);
  assert.match(javascript, /setTimeout\(\(\) => commitPendingEditorControl\(event\.target\), 300\)/);
  assert.match(javascript, /function commitPendingEditorInputs\(form\)/);
  assert.match(javascript, /form\.querySelectorAll\('\[data-editor-dirty\]'\)/);
  assert.match(javascript, /control\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
  assert.match(javascript, /form\.addEventListener\('submit', \(\) => commitPendingEditorInputs\(form\)\)/);
  assert.match(javascript, /addEventListener\('cancel', \(\) => commitPendingEditorInputs\(form\)\)/);
  assert.match(javascript, /addEventListener\('close', \(\) => commitPendingEditorInputs\(form\)\)/);
  assert.match(javascript, /window\.addEventListener\('pagehide', commitAllPendingEditorInputs\)/);
  assert.match(javascript, /document\.visibilityState === 'hidden'\) commitAllPendingEditorInputs\(\)/);
  const pendingCommitFunction = javascript.match(/function commitPendingEditorInputs\(form\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(pendingCommitFunction, /cancel/);
});

test('shared saves are serialized and unfinished saves survive a page reload', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /SHARED_SAVE_PENDING_KEY/);
  assert.match(javascript, /localStorage\.setItem\(SHARED_SAVE_PENDING_KEY, 'true'\)/);
  assert.match(javascript, /if \(!sharedSavePending \|\| sharedSaveInProgress\) return/);
  assert.match(javascript, /localStorage\.removeItem\(SHARED_SAVE_PENDING_KEY\)/);
  assert.match(javascript, /if \(sharedSavePending\) queueSharedStateSave\(\)/);
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

  assert.match(html, /id="weddingPartyTabs"[\s\S]*>Wedding Party<[\s\S]*>Guest<[\s\S]*>Timeline<[\s\S]*>Registry</);
  assert.match(javascript, /signedInPersonName = accountName/);
  assert.match(javascript, /state\.weddingPartyMembers\?\.find\(member => normalizeAccountName\(member\.name\) === normalizeAccountName\(signedInPersonName\)\)/);
  assert.match(javascript, /viewingAsGuest && hostWeddingPartyViewName !== GENERAL_GUEST_PREVIEW/);
  assert.match(javascript, /weddingPartyTabs\.hidden = !isWedding/);
  assert.match(javascript, /hostResponsibilityRoles = WEDDING_PARTY_TITLES\.map/);
  assert.match(javascript, /visibleWeddingPartyMembers = hostView \? hostResponsibilityRoles : \[viewedWeddingPartyMember\]\.filter\(Boolean\)/);
  assert.match(javascript, /function formatWeddingPartyDescription\(value\)[\s\S]*<strong>[\s\S]*<li>/);
  assert.match(javascript, /state\.weddingPartyDescriptions\?\.\[member\.title\]/);
  assert.match(javascript, /formatWeddingPartyDescription\(description\)/);
  assert.match(html, /id="previewWeddingPartyButton"[\s\S]*Preview Party\/Guest view/);
  assert.match(javascript, /#openWeddingPartyPreview'[\s\S]*hostWeddingPartyViewName = document\.querySelector\('#hostWeddingPartyView'\)\.value[\s\S]*enterEvent\('wedding', \{ preserveWeddingView: true \}\)/);
});

test('Guest and Registry are separate main tabs with Attire selected under Guest by default', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.ok(html.indexOf('id="registryAttireSection"') < html.indexOf('id="registrySection"'));
  assert.match(html, /data-wedding-tab="guest"[^>]*aria-selected="true">Guest/);
  assert.match(html, /data-wedding-tab="registry"[^>]*aria-selected="false">Registry/);
  assert.match(styles, /\.wedding-party-tabs button\{[^}]*color:#fff/);
  assert.match(styles, /\.wedding-party-tabs button\[aria-selected="true"\]\{[^}]*border:1px solid var\(--gold\)[^}]*background:var\(--orange\)[^}]*color:#fff/);
});

test('Wedding Details is an editable sub tab immediately after Attire under Guest', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  const guestTabs = html.match(/<nav id="guestInfoTabs"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.match(guestTabs, /data-guest-tab="attire"[\s\S]*data-guest-tab="details"[^>]*>Wedding Details<\/button>/);
  const guestSection = html.match(/<section id="guestSection"[\s\S]*?<section id="registrySection"/)?.[0] || '';
  assert.match(guestSection, /class="wedding-party-section guest-section"[\s\S]*id="guestHeading">Guest<[\s\S]*id="guestInfoTabs"[\s\S]*id="guestAttireAnchor"[\s\S]*id="registryAttireSection"[\s\S]*id="whatToExpectSection"/);
  assert.match(styles, /\.guest-section \.registry-attire-section,\.guest-section \.what-to-expect-section\{[^}]*margin:0[^}]*background:transparent[^}]*border:0[^}]*box-shadow:none/);
  assert.match(styles, /\.guest-section \.what-to-expect-content\{text-align:left\}/);
  assert.match(html, /id="whatToExpectSection"[^>]*hidden/);
  assert.match(html, /<h2 id="whatToExpectHeading">Wedding Details<\/h2>/);
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('The Perfect Experience page') < weddingEditor.indexOf('What to Expect page'));
  assert.match(javascript, /whatToExpectContent: ''/);
  assert.match(javascript, /hostCanViewTab = true/);
  assert.match(javascript, /guestCanViewTab = \['guest', 'registry'\]/);
  assert.match(javascript, /formatEditableText\(state\.whatToExpectContent\)/);
  assert.match(javascript, /state\.whatToExpectContent = event\.target\.value/);
});

test('Bride & Groom is a host-only Markdown page edited from wedding details', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.ok(html.indexOf('data-wedding-tab="couple"') < html.indexOf('data-wedding-tab="party"'));
  assert.match(html, /data-wedding-tab="couple"[^>]*hidden>Bride &amp; Groom/);
  assert.match(html, /id="brideGroomHeading">Bride &amp; Groom/);
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('Bride &amp; Groom page') < weddingEditor.indexOf('Wedding Party Members'));
  assert.ok(weddingEditor.indexOf('Wedding Party Members') < weddingEditor.indexOf('Title Descriptions'));
  const accountsEditor = html.match(/<dialog id="accountsDialog"[\s\S]*?<\/dialog>/)?.[0] || '';
  assert.doesNotMatch(accountsEditor, /Wedding Party Members/);
  assert.match(html, /class="editor-dialog-footer">\s*<button id="adminDoneButton"[^>]*>Done editing<\/button>/);
  assert.match(styles, /\.editor-dialog \.modal-card\{[^}]*max-height:calc\(100dvh - 32px\)[^}]*overflow-y:auto/);
  assert.match(styles, /\.editor-dialog-footer\{[^}]*position:sticky[^}]*bottom:-38px/);
  for (const dialogId of ['adminDialog', 'eventsDialog', 'accountsDialog', 'invitationTemplatesDialog']) {
    const editorDialog = html.match(new RegExp(`<dialog id="${dialogId}"[\\s\\S]*?</dialog>`))?.[0] || '';
    assert.match(editorDialog, /class="editor-dialog-footer">[\s\S]*?>Done(?: editing)?<\/button>/);
  }
  const editor = html.match(/<textarea id="adminBrideGroomContent"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(editor, /maxlength/);
  assert.match(javascript, /hostCanViewTab = true/);
  assert.match(javascript, /showingBrideGroomPage = isWedding && hostView && selectedWeddingTab === 'couple'/);
  assert.match(javascript, /brideGroomContent\.innerHTML = formatEditableText\(state\.brideGroomContent\)/);
  assert.match(javascript, /#adminBrideGroomContent'\)\.addEventListener\('change'/);
  assert.match(javascript, /state\.brideGroomContent = event\.target\.value/);
});

test('hosts can add editable tabbed pages inside Bride & Groom', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="brideGroomTabs"[^>]*role="tablist"[^>]*hidden/);
  assert.match(html, /Bride &amp; Groom page<\/span><button id="adminAddBrideGroomPage"[^>]*>\+<\/button>/);
  assert.match(html, /id="adminBrideGroomPages"/);
  assert.match(javascript, /brideGroomPages: \[\]/);
  assert.match(javascript, /#adminAddBrideGroomPage'[\s\S]*state\.brideGroomPages\.push\(page\)/);
  assert.match(javascript, /data-bride-groom-page=/);
  assert.match(javascript, /data-bride-groom-admin-page=/);
  assert.match(javascript, /page\.title = heading\.value\.trim\(\)/);
  assert.match(javascript, /page\.content = content\.value/);
  assert.match(styles, /\.bride-groom-tabs\{/);
});

test('Done saves dynamic Bride & Groom page titles and content together before editors rerender', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const pendingCommit = javascript.match(/function commitPendingEditorInputs\(form\)[\s\S]*?\n}/)?.[0] || '';
  const pageCommit = javascript.match(/function commitBrideGroomPageEditors\(\)[\s\S]*?\n}/)?.[0] || '';

  assert.match(pendingCommit, /commitBrideGroomPageEditors\(\)[\s\S]*dirtyControls/);
  assert.match(pageCommit, /#adminBrideGroomPages \[data-bride-groom-admin-page\]/);
  assert.match(pageCommit, /page\.title = title/);
  assert.match(pageCommit, /page\.content = content\.value/);
  assert.match(pageCommit, /control\.removeAttribute\('data-editor-dirty'\)/);
  assert.match(pageCommit, /if \(changed\) \{[\s\S]*saveState\(\)/);
});

test('wedding page tabs use guest-facing labels and audience-specific visibility', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, />Wedding Party<\/button>/);
  assert.match(html, />Responsibilities<\/button>/);
  assert.match(javascript, /hostCanViewTab = true/);
  assert.match(javascript, /partyMemberCanViewTab = \['party', 'timeline', 'registry'\]/);
  assert.match(javascript, /guestCanViewTab = \['guest', 'registry'\]/);
  assert.match(javascript, /button\.hidden = !\(hostView \? hostCanViewTab : isWeddingPartyMember \? partyMemberCanViewTab : guestCanViewTab\)/);
  assert.match(javascript, /showingWeddingPartyPage = isWedding && \(hostView \|\| isWeddingPartyMember\) && selectedWeddingTab === 'party'/);
  assert.match(javascript, /matronInfoTabs\.hidden = !showingWeddingPartyPage/);
  assert.match(javascript, /\$\{description \?/);
  assert.match(styles, /\.wedding-party-tabs\{[^}]*flex-wrap:wrap/);
  assert.doesNotMatch(styles, /\.wedding-party-tabs\{[^}]*overflow-x:auto/);
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
  assert.ok(pageTabs.indexOf('data-wedding-tab="party"') < pageTabs.indexOf('data-wedding-tab="guest"'));
  assert.match(html, /data-matron-tab="experience"[^>]*>The Perfect Experience<\/button>\s*<button[^>]*data-matron-tab="duties"[^>]*>Responsibilities<\/button>\s*<button[^>]*data-matron-tab="attire"[^>]*>Attire<\/button>/);
  assert.match(javascript, /showingPartyAttirePage = showingWeddingPartyPage && selectedMatronTab === 'attire'/);
  assert.match(javascript, /showingAttirePage = \(showingGuestPage && selectedGuestTab === 'attire'\) \|\| showingPartyAttirePage/);
  assert.match(javascript, /renderWeddingPartyAttireImages\(showingPartyAttirePage\)/);
  assert.match(javascript, /showingPartyAttirePage[\s\S]*weddingPartyAttirePanel\.append\(registryAttireSection\)/);
  assert.match(javascript, /guestAttireAnchor\.after\(registryAttireSection\)/);
  assert.match(html, /id="weddingPartyAttirePanel"[\s\S]*id="guestAttireAnchor"[\s\S]*id="registryAttireSection"/);
});

test('selected wedding detail tabs use white text inside a visible tab', async () => {
  const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(styles, /\.matron-info-tabs button\[aria-selected="true"\]\{[^}]*border:1px solid var\(--gold\)[^}]*background:var\(--orange\)[^}]*color:#fff/);
});

test('all Wedding Party sub tabs are available to hosts and wedding party members', async () => {
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
  assert.match(javascript, /button\.hidden = button\.dataset\.matronTab === 'bachelorette' && !hostView && !isViewingMatron/);
  assert.match(javascript, /perfectExperiencePanel'\)\.hidden = !showingWeddingPartyPage \|\| selectedMatronTab !== 'experience'/);
});

test('Bachelorette is a blank editable page under The Perfect Experience editor', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';
  assert.ok(weddingEditor.indexOf('The Perfect Experience page') < weddingEditor.indexOf('Bachelorette page'));
  assert.match(html, /id="adminBacheloretteContent"/);
  assert.match(html, /id="bacheloretteInfoContent" class="bachelorette-info-content"><\/div>/);
  assert.match(javascript, /bacheloretteContent: ''/);
  assert.match(javascript, /formatEditableText\(state\.bacheloretteContent\)/);
  assert.match(javascript, /state\.bacheloretteContent = event\.target\.value/);
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
  assert.match(javascript, /hostWeddingPartyViewName === GENERAL_GUEST_PREVIEW \? 'guest' : 'party'/);
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

test('wedding detail editor places party copy and wedding party attire before guest tip videos', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const weddingEditor = html.match(/<div id="adminAttireFields"[\s\S]*?<div id="menuAdminFields">/)?.[0] || '';

  assert.ok(weddingEditor.indexOf('Title Descriptions') < weddingEditor.indexOf('Wedding Party Attire Images'));
  assert.ok(weddingEditor.indexOf('Wedding Party Attire Images') < weddingEditor.indexOf('Guest Attire Tip Videos'));
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
  assert.match(javascript, /function safeEditableLink\(value\)/, 'editable links should be checked before rendering');
  assert.match(javascript, /`<a href="\$\{escapeAttribute\(href\)\}">\$\{formatMarkdown\(match\[1\]\)\}<\/a>`/, 'Markdown links should render clickable, formatted text');
  assert.match(javascript, /\(\?:https\?:\|mailto:\|tel:/, 'only explicitly supported URL schemes should be accepted');
  assert.match(html, /\[linked text\]\(https:\/\/example\.com\)/, 'editor help should document Markdown links');
  assert.match(html, /Put <code>---<\/code> on its own line for a divider/);
});

test('gathering details include labeled locations and editable text variables', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /Gathering date[\s\S]*<span>Home<\/span>[\s\S]*id="adminWeddingLocations"[\s\S]*<legend>Church<\/legend>[\s\S]*<legend>Venue<\/legend>/);
  assert.match(javascript, /adminWeddingLocations'\)\.hidden = !isWedding/);
  assert.match(javascript, /adminWeddingVariableHeading'\)\.hidden = !isWedding/);
  assert.match(javascript, /eventState\.homeAddress = typeof eventState\.homeAddress === 'string'/);
  assert.match(javascript, /replace\(\/\\\{\(date\|home\|church\|venue\|registry\|monetary\)\\\}\/g/);
  assert.match(javascript, /home: state\.homeAddress \|\| ''/);
  assert.match(javascript, /church: locationLines\(\['churchWeekDay', 'churchYear', 'churchTime', 'churchStreet', 'churchCityStateZip'\]\)/);
  assert.match(javascript, /venue: locationLines\(\['venueTime', 'venueStreet', 'venueCityStateZip'\]\)/);
  assert.match(javascript, /function formatWeddingPartyDescription\(value\) \{\s+value = expandEditableTextVariables\(value\)/);
});

test('church and venue variables use labeled custom-text inputs for every output line', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const church = html.match(/<legend>Church<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';
  const venue = html.match(/<legend>Venue<\/legend>([\s\S]*?)<\/fieldset>/)?.[1] || '';

  for (const label of ['Week, Day of Month', 'Year', 'Time', 'Street', 'City, State, Zip']) assert.match(church, new RegExp(`<span>${label}</span>`));
  for (const label of ['Time', 'Street', 'City, State, Zip']) assert.match(venue, new RegExp(`<span>${label}</span>`));
  assert.equal((church.match(/type="text"/g) || []).length, 5);
  assert.equal((venue.match(/type="text"/g) || []).length, 3);
  assert.doesNotMatch(`${church}${venue}`, /type="(?:date|time|number)"/);
});

test('wedding role and page editors share the Bachelorette editor height', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  ['adminBrideGroomContent', 'adminPerfectExperienceContent', 'adminBacheloretteContent', 'adminWhatToExpectContent'].forEach(id => {
    assert.match(html, new RegExp(`<textarea class="wedding-copy-editor" id="${id}"`));
  });
  assert.match(javascript, /<textarea class="wedding-copy-editor" data-wedding-party-description=/);
  assert.match(styles, /\.wedding-copy-editor\{[^}]*height:36px;min-height:36px/);
});

test('variables group the gathering date and reusable values above one divider', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="adminWeddingVariableHelp"[\s\S]*<h3 id="adminWeddingVariableHeading" hidden>Variables<\/h3>[\s\S]*<span>Gathering date<\/span>[\s\S]*<span>Home<\/span>[\s\S]*<legend>Church<\/legend>[\s\S]*<legend>Venue<\/legend>[\s\S]*<span>Wedding registry link<\/span>[\s\S]*<span>Monetary gift link<\/span>[\s\S]*id="weddingPagesAdmin"/);
  assert.ok(html.indexOf('id="adminWeddingVariableHelp"') < html.indexOf('id="weddingPagesAdmin"'));
  assert.match(styles, /\.admin-editor-section\{[^}]*border-bottom:1px solid var\(--border\)/);
  assert.doesNotMatch(styles, /\.admin-variable-help[^}]*border-(?:top|bottom)/);
  assert.doesNotMatch(styles, /\.admin-attire\{[^}]*border-(?:top|bottom)/);
});

test('the editor title is its own section with one bottom divider', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /<section class="admin-editor-section admin-editor-heading" aria-labelledby="adminHeading">\s*<p class="section-kicker">Host dashboard<\/p>\s*<h2 id="adminHeading">Edit the menu<\/h2>\s*<\/section>\s*<section id="adminWeddingVariableHelp"/);
  assert.match(styles, /\.admin-editor-section\{[^}]*border-bottom:1px solid var\(--border\)/);
  assert.doesNotMatch(styles, /\.admin-editor-heading\{[^}]*border-(?:top|bottom)/);
});

test('every wedding details section has a divider and the requested title', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);
  const sectionHeadings = [
    'Variables', 'Pages', 'Wedding Party Members', 'Title Descriptions',
    'Wedding Party Attire Images', 'Guest Attire Tip Videos'
  ];

  sectionHeadings.forEach(heading => assert.match(html, new RegExp(`>${heading}<\\/h3>`)));
  ['Bride &amp; Groom page', 'The Perfect Experience page', 'Bachelorette page', 'Wedding Timeline page', 'What to Expect page']
    .forEach(heading => assert.match(html, new RegExp(`<span>${heading}<\\/span>`)));
  assert.match(html, /<section id="guestAttireVideosAdmin" class="admin-editor-section guest-attire-videos-admin"[\s\S]*>Guest Attire Tip Videos<\/h3>[\s\S]*id="adminAttireVideos"[\s\S]*<\/section>/);
  assert.match(styles, /\.admin-editor-section\{[^}]*border-bottom:1px solid var\(--border\)/);
});

test('page editors are grouped in one Pages section between Variables and Wedding Party Members', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const sectionIds = ['adminWeddingVariableHelp', 'weddingPagesAdmin', 'weddingPartyAdmin'];
  const positions = sectionIds.map(id => html.indexOf(`id="${id}"`));

  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  const pagesStart = html.indexOf('<section id="weddingPagesAdmin"');
  const pagesEnd = html.indexOf('</section>', pagesStart);
  const pagesSection = html.slice(pagesStart, pagesEnd);
  ['brideGroomAdmin', 'perfectExperienceAdmin', 'bacheloretteAdmin', 'timelineAdmin', 'whatToExpectAdmin']
    .forEach(id => assert.match(pagesSection, new RegExp(`id="${id}"`)));
  assert.equal((pagesSection.match(/<h3\b/g) || []).length, 1);
  assert.equal((pagesSection.match(/class="wedding-party-description-editor wedding-page-editor"/g) || []).length, 5);
  assert.doesNotMatch(pagesSection, /<h4\b/);
  assert.match(pagesSection, /class="wedding-party-description-editors wedding-page-editors"/);
});

test('Wedding Timeline is private to hosts and wedding party members and remains host-editable', async () => {
  const [html, javascript] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8')
  ]);
  const pageTabs = html.match(/<nav id="weddingPartyTabs"[\s\S]*?<\/nav>/)?.[0] || '';

  assert.match(pageTabs, /data-wedding-tab="party"[\s\S]*data-wedding-tab="guest"[^>]*>Guest<\/button>[\s\S]*data-wedding-tab="timeline"[^>]*>Timeline<\/button>/);
  assert.match(html, /id="weddingTimelineSection"[^>]*hidden/);
  assert.match(html, /<th scope="col">Time<\/th><th scope="col">What Happens<\/th><th scope="col">Notes<\/th>/);
  assert.match(html, /id="weddingTimelineAboveContent"[\s\S]*id="weddingTimelineBody"[\s\S]*id="weddingTimelineBelowContent"/);
  assert.match(html, /id="adminTimelineAboveContent"[\s\S]*id="adminTimelineContent"[\s\S]*id="adminTimelineBelowContent"/);
  assert.match(html, /id="adminTimelineContent"/);
  assert.match(javascript, /partyMemberCanViewTab = \['party', 'timeline', 'registry'\]/);
  assert.match(javascript, /\(hostView \|\| isWeddingPartyMember\) && selectedWeddingTab === 'timeline'/);
  assert.match(javascript, /state\.timelineContent = event\.target\.value/);
  assert.match(javascript, /state\[`timeline\$\{position\}Content`\] = event\.target\.value/);
  assert.match(javascript, /#weddingTimelineAboveContent'[\s\S]*formatEditableText\(expandEditableTextVariables\(state\.timelineAboveContent\)\)/);
  assert.match(javascript, /#weddingTimelineBelowContent'[\s\S]*formatEditableText\(expandEditableTextVariables\(state\.timelineBelowContent\)\)/);
  assert.match(javascript, /\*\*11:00 AM\*\*[\s\S]*Whenever it feels right/);
});

test('wedding party manager creates wedding-enabled accounts for new people', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const addHandler = javascript.match(/#adminAddWeddingPartyMember'[\s\S]*?\n}\);/)?.[0] || '';

  assert.match(addHandler, /accountNameMatches\(name, item\.name\)/);
  assert.match(addHandler, /account = \{ name, selected: false, selectedEvents: \{ wedding: true \}, invitedEvents: \{ wedding: true \} \}/);
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

test('wedding party members can move up and down within their role', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /data-move-wedding-party="up"[\s\S]*data-move-wedding-party="down"/);
  assert.match(javascript, /partyMember\.title === member\.title/);
  assert.match(javascript, /roleIndexes\[rolePosition \+ \(button\.dataset\.moveWeddingParty === 'up' \? -1 : 1\)\]/);
  assert.match(javascript, /\[state\.weddingPartyMembers\[memberIndex\], state\.weddingPartyMembers\[targetIndex\]\] = \[state\.weddingPartyMembers\[targetIndex\], state\.weddingPartyMembers\[memberIndex\]\]/);
});

test('wedding party descriptions are shared and editable by title', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /const DEFAULT_WEDDING_PARTY_DESCRIPTIONS = \{[\s\S]*'Matron of Honor'[\s\S]*Officiant/);
  assert.match(javascript, /id="adminWeddingPartyDescriptions"|#adminWeddingPartyDescriptions/);
  assert.match(javascript, /data-wedding-party-description=/);
  assert.match(javascript, /state\.weddingPartyDescriptions\[title\] = event\.target\.value\.trim\(\)/);
  assert.doesNotMatch(javascript.match(/data-wedding-party-description=[\s\S]*?<\/label>/)?.[0] || '', /\bmaxlength=/i);
});

test('bachelorette party page is available to the host and Matron of Honor and is shareable', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="matronInfoTabs"[\s\S]*data-matron-tab="duties"[\s\S]*data-matron-tab="bachelorette"/);
  assert.match(html, /id="weddingPartyDetails"[\s\S]*id="bacheloretteInfoPanel"[\s\S]*id="copyBacheloretteInfo"[\s\S]*id="emailBacheloretteInfo"[\s\S]*id="printBacheloretteInfo"/);
  assert.doesNotMatch(html, /id="bacheloretteInfoDialog"/);
  assert.match(javascript, /bacheloretteInfoContent'\)\.innerHTML = formatEditableText\(state\.bacheloretteContent\)/);
  assert.match(javascript, /isViewingMatron = showingWeddingPartyPage && viewedWeddingPartyMember\?\.title === 'Matron of Honor'/);
  assert.match(javascript, /weddingPartyDetails'\)\.hidden = !showingWeddingPartyPage \|\| selectedMatronTab !== 'duties'/);
  assert.match(styles, /\.wedding-party-details\[hidden\]\{display:none\}/);
  assert.match(javascript, /navigator\.clipboard\.writeText\(text\)/);
  assert.match(javascript, /mailto:\?subject=/);
  assert.match(javascript, /window\.print\(\)/);
});


test('wedding defaults match each signed-in audience', async () => {
  const javascript = await readFile(new URL('../app.js', import.meta.url), 'utf8');

  assert.match(javascript, /eventId === 'wedding' && !preserveWeddingView[\s\S]*hostAuthenticated \? 'couple' : partyMember \? 'party' : 'guest'/);
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
  assert.match(html, /id="hostToolsPanel"[\s\S]*>Wedding Details<\/button>[\s\S]*>Clear a Claim<\/button>[\s\S]*>View As<\/button>[\s\S]*>Accounts<\/button>[\s\S]*>Templates<\/button>/);
  assert.doesNotMatch(html, /id="manageEventsButton"|>Gatherings<\/button>/);
  assert.doesNotMatch(javascript, /#manageEventsButton/);
  assert.match(javascript, /hostToolsPanel'\)\.hidden = !hostAuthenticated/);
});

test('gathering-specific host tools match the current gathering content', async () => {
  const [javascript, styles] = await Promise.all([
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(javascript, /#editItemsButton'\)\.textContent = isWedding \? 'Wedding Details' : 'Menu'/);
  assert.match(javascript, /#clearClaimButton'\)\.hidden = isWedding/);
  assert.match(javascript, /#previewWeddingPartyButton'\)\.hidden = !isWedding/);
  assert.match(styles, /\.host-tools-panel \.host-tool-actions button\[hidden\]\{display:none\}/);
});

test('wedding RSVP menu is configured by the host and collected one guest at a time', async () => {
  const [html, javascript, styles] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app.js', import.meta.url), 'utf8'),
    readFile(new URL('../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="weddingMenuAdmin"[\s\S]*id="adminWeddingMealOption1"[\s\S]*id="adminWeddingMealOption2"[\s\S]*id="adminWeddingMealOption3"[\s\S]*id="adminWeddingChildMealOption"/);
  assert.match(html, /id="weddingRsvpMenu"[^>]*hidden[\s\S]*id="weddingRsvpGuests"/);
  assert.match(javascript, /function renderWeddingRsvpMenu\(selections = \[\]\)[\s\S]*\['adult', 'child'\]\.flatMap/);
  assert.match(javascript, />Someone else<\/option>[\s\S]*Please note any dietary restrictions or food allergies\./);
  assert.match(javascript, /type === 'child' \? `[\s\S]*value="none"[\s\S]*>My child is too young</);
  assert.match(javascript, /wrapper\.hidden = event\.target\.value !== 'someone-else'/);
  assert.match(styles, /\[data-rsvp-custom-wrapper\]\[hidden\]\{display:none\}/);
  assert.match(javascript, /menuSelections: Array\.isArray\(rsvp\.menuSelections\)/);
});

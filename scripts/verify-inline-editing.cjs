// Optional Chromium integration check. External requests and live state writes are blocked.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = (process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/, '') + '/';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    if (!route.request().url().startsWith(base)) return route.abort();
    if (new URL(route.request().url()).pathname === '/') {
      const response = await route.fetch();
      return route.fulfill({ response, body: (await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/, '$1') });
    }
    return route.continue();
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof startApp === 'function' && !document.querySelector('#signInPage').hidden);
  await page.evaluate(() => {
    appState = initialAppState(); viewedEventId = 'wedding'; state = appState.events.wedding;
    state.brideGroomPages = [{ id: 'main', title: 'Bride & Groom', content: 'Original page' }];
    state.weddingMealOptions = ['Beef', 'Chicken']; state.weddingChildMealOption = 'Kids pasta';
    state.rsvps = [{ name: HOST_DISPLAY_NAME, adults: 1, children: 1, people: [{ name: HOST_DISPLAY_NAME, attending: true }], menuSelections: [{ meal: 'Beef' }, { meal: 'Chicken' }] }, { name: 'Zero Person', adults: 0, children: 0, people: [{ name: 'Zero Person', attending: false }] }];
    hostAuthenticated = true; guestName = HOST_DISPLAY_NAME; showSignedInDestination(); render();
  });
  async function show(selector) { await page.locator(selector).scrollIntoViewIfNeeded(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function edit(selector, name) { await show(selector); await page.getByRole('button', { name, exact: true }).click(); }
  const action = name => page.getByRole('button', { name, exact: true });
  assert.equal(await page.locator('.inline-edit-control').count(), 0);
  assert.deepEqual(await page.locator('.summary-strip>button').evaluateAll(buttons => buttons.map(button => button.id)), ['guestListButton', 'notAttendingButton', 'invitedListButton', 'editAccountsButton']);
  await page.locator('#editAccountsButton').click(); assert.equal(await page.locator('#accountsDialog').isVisible(), true); await page.locator('#accountsDialog .modal-close').click();
  await page.locator('#notAttendingButton').click(); assert.ok((await page.locator('#notAttendingList').textContent()).includes('Zero Person')); await page.locator('#notAttendingDialog .modal-close').click();
  await page.locator('#editItemsButton').click();
  assert.equal(await page.locator('#hostToolsPanel #invitationTemplatesButton').isVisible(), true);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(50);
  assert.ok(await page.evaluate(() => { const dock=document.querySelector('.event-dock').getBoundingClientRect(); return [...document.querySelectorAll('body>.inline-overlay-layer .inline-edit-control')].filter(el=>getComputedStyle(el).visibility!=='hidden' && !el.closest('[hidden]')).every(el=>el.getBoundingClientRect().bottom<=dock.top); }));
  await edit('#eventDate', 'Edit date'); assert.equal(await page.locator('.inline-editor[aria-label="Edit date"]').evaluate(el => !!el.closest('.inline-overlay-layer')), false); await page.locator('[aria-label="Edit date"] input').fill('2027-09-12'); await action('Save date').click(); assert.equal(await page.evaluate(() => state.eventDate), '2027-09-12');
  await page.locator('[data-wedding-tab="couple"]').click();
  await edit('#brideGroomContent', 'Edit page'); await page.locator('[aria-label="Edit page"] textarea').fill('**Updated** page'); await action('Save page').click(); assert.equal(await page.locator('#brideGroomContent strong').textContent(), 'Updated');
  await show('#brideGroomContent'); await page.locator('[data-inline-anchor="brideGroomTabs"] [aria-label="Add page"]').click(); assert.equal(await page.locator('#brideGroomTabs [role="tab"]').count(), 2);
  await show('#brideGroomTabs');
  await page.locator('[data-inline-tab-group="brideGroomTabs"] [aria-label="Edit title"]').last().click();
  await page.getByRole('textbox', {name:'Page title', exact:true}).fill('Renamed page'); await action('Save title').click();
  assert.equal(await page.locator('#brideGroomTabs').getByRole('tab', {name:'Renamed page',exact:true}).count(), 1);
  await show('#brideGroomTabs'); await page.locator('[data-inline-tab-group="brideGroomTabs"] [aria-label="Edit title"]').last().click();
  await page.getByRole('textbox', {name:'Page title',exact:true}).fill('New page'); await action('Save title').click();
  await show('#brideGroomTabs'); page.once('dialog', dialog => dialog.dismiss()); await action('Delete New page page').click(); assert.equal(await page.locator('#brideGroomTabs [role="tab"]').count(), 2);
  page.once('dialog', dialog => dialog.accept()); await action('Delete New page page').click(); assert.equal(await page.locator('#brideGroomTabs [role="tab"]').count(), 1);
  await page.locator('#rsvpButton').click(); assert.equal(await page.locator('#rsvpAttendance #rsvpChildrenCounter').count(), 1); await show('#weddingRsvpMenu');
  assert.ok((await page.locator('.inline-meal-editor').textContent()).includes('Kids pasta — Children only'));
  await page.locator('.inline-meal-editor').evaluate(element => { element.scrollTop = element.scrollHeight; }); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await action('Edit new meal').click(); await page.locator('[aria-label="Edit new meal"] input').fill('Fish'); await page.locator('[aria-label="Edit new meal"] select').selectOption('Adults only'); await page.locator('[aria-label="Edit new meal"] input').press('Enter');
  assert.deepEqual(await page.evaluate(() => GuestPlanning.weddingMealOptions(state, 'adult')), ['Beef', 'Chicken', 'Fish']); assert.deepEqual(await page.evaluate(() => GuestPlanning.weddingMealOptions(state, 'child')), ['Beef', 'Chicken', 'Kids pasta']);
  await page.locator('#rsvpDialog .modal-close').click();
  await page.locator('#guestListButton').click(); const attendance = await page.locator('.attendance-totals').boundingBox(), meals = await page.locator('.meal-totals').boundingBox(); assert.ok(meals.y >= attendance.y + attendance.height);
  assert.ok(!(await page.locator('#guestList').textContent()).includes('Zero Person')); assert.ok(!(await page.locator('#guestList').textContent()).includes('The Host:')); await page.locator('#guestListDialog .modal-close').click();
  await page.locator('[data-wedding-tab="party"]').click(); await page.locator('[data-matron-tab="attire"]').click(); await show('#weddingAttireGuidance');
  assert.equal(await page.locator('#weddingAttireGuidance').isVisible(), false); assert.equal(await page.locator('#adminAddWeddingPartyAttireImage').isVisible(), true);
  await page.locator('#editItemsButton').click(); assert.equal(await page.locator('#weddingAttireGuidance').isVisible(), true); assert.equal(await page.locator('#adminAddAttireVideo').isVisible(), false);
  await page.locator('#editItemsButton').click(); await page.evaluate(() => enterEvent('thanksgiving'));
  await edit('#hostNotesContent', 'Edit notes'); await page.locator('[aria-label="Edit notes"] textarea').fill('Home: {home} Date: {date}'); await action('Save notes').click();
  await edit('#eventPage footer address', 'Edit footer'); await page.locator('[aria-label="Edit footer"] textarea').fill('456 Oak Street\nNew Town CA'); await action('Save footer').click();
  assert.ok((await page.locator('#eventAddress').textContent()).includes('456 Oak Street')); assert.ok((await page.locator('#hostNotesContent').textContent()).includes('456 Oak Street')); assert.equal(await page.evaluate(() => state.addressLine1), '456 Oak Street');
  const saved = await page.evaluate(() => loadState().events.thanksgiving.homeAddress); assert.equal(saved, '456 Oak Street\nNew Town CA');
  await page.locator('#editItemsButton').click(); assert.equal(await page.locator('.inline-edit-control').count(), 0); assert.equal(await page.locator('.inline-overlay-layer').count(), 0);
  await page.evaluate(() => { appState.accounts = [{ name: 'Jane,John Smith', selectedEvents: { wedding: true } }]; hostAuthenticated = false; guestName = 'Jane,John Smith'; signedInPersonName = 'Jane Smith'; viewedEventId = 'wedding'; state = appState.events.wedding; selectedWeddingTab = 'guest'; render(); });
  assert.equal(await page.locator('.inline-edit-control').count(), 0);
  await page.locator('#rsvpButton').click(); assert.equal(await page.locator('[data-person-attending]').count(), 2);
  await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes'); await page.locator('[data-rsvp-person="John Smith"] [data-person-attending]').selectOption('no'); await page.locator('[data-target="children"][data-step="1"]').click();
  await page.locator('[data-guest-type="adult"] [data-rsvp-meal][value="Beef"]').check(); await page.locator('[data-guest-type="child"] [data-rsvp-meal][value="Kids pasta"]').check(); await page.locator('#rsvpForm>.primary-button').click();
  assert.deepEqual(await page.evaluate(() => state.rsvps.find(rsvp => rsvp.name === 'Jane,John Smith').people.map(person => [person.name, person.attending])), [['Jane Smith', true], ['John Smith', false]]);
  await page.evaluate(() => { state.rsvpDate='2000-01-01'; render(); });
  await page.locator('#rsvpButton').click();
  assert.equal(await page.locator('#rsvpDeadlineNotice').isVisible(), true);
  assert.equal(await page.locator('[data-rsvp-dietary]').first().isDisabled(), true);
  assert.equal(await page.locator('[data-rsvp-meal]').first().isDisabled(), true);
  assert.equal(await page.locator('[data-person-attending]').first().isEnabled(), true);
  await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('no');
  await page.locator('#rsvpForm>.primary-button').click();
  assert.equal(await page.evaluate(() => state.rsvps.find(rsvp=>rsvp.name==='Jane,John Smith').adults), 0);
  await page.locator('#rsvpButton').click();
  await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes');
  await page.locator('#rsvpForm>.primary-button').click();
  assert.equal(await page.evaluate(() => state.rsvps.find(rsvp=>rsvp.name==='Jane,John Smith').menuSelections.find(meal=>meal.name==='Jane Smith').meal), 'Beef');
  assert.deepEqual(errors, []); console.log('Inline editors, saving, tabs, RSVP meals, shared details, individual attendance and host gating passed.'); await browser.close();
})().catch(error => { console.error(error); process.exit(1); });

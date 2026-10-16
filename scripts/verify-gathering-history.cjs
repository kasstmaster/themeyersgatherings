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
    localStorage.clear();appState=initialAppState();
    appState.accounts=[{name:'Jane Smith',source:'website',address:'123 Old Street',invitedEvents:{christmas:true},selectedEvents:{christmas:true},children:['Sam']},{name:'Alex Doe',source:'website',invitedEvents:{christmas:true},selectedEvents:{christmas:true}},{name:'No Reply',invitedEvents:{christmas:true}}];
    const event=appState.events.christmas;event.eventDate='2025-12-25';event.hostNotes='Original private notes';event.homeAddress='Original gathering venue';
    event.items=[{id:'ham',name:'Ham',category:'Main Table',needed:2,claims:['Jane Smith','Jane Smith']},{id:'custom-pie',name:'Special pie',category:'Desserts',needed:1,claims:['Alex Doe']}];
    event.rsvps=[{name:'Jane Smith',adults:1,children:1,people:[{name:'Jane Smith',attending:true}],menuSelections:[{name:'Jane Smith',meal:'Beef',dietaryRestrictions:'No nuts'}]},{name:'Alex Doe',adults:0,children:0,people:[{name:'Alex Doe',attending:false}]}];
    hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='christmas';state=event;showSignedInDestination();render();
  });
  const locked=await page.evaluate(()=>structuredClone(appState.gatheringHistory.christmas['2025-12-25']));
  await page.locator('#editAccountsButton').click();page.once('dialog',dialog=>dialog.accept());await page.locator('[data-account-name="Jane Smith"] .account-delete-button').click();await page.locator('#accountsDialog .modal-close').click();
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;enterEvent('christmas');});
  assert.equal(await page.evaluate(()=>appState.accounts.some(account=>account.name==='Jane Smith')),false,'deleted account stays deleted after reload');
  await page.evaluate(()=>{state.homeAddress='Different venue';state.hostNotes='Changed notes';state.items[0].name='Changed dish';state.items[0].claims=[];saveState();});
  assert.deepEqual(await page.evaluate(()=>appState.gatheringHistory.christmas['2025-12-25']),locked);
  await page.locator('#gatheringHistoryButton').click();
  const content=await page.locator('#gatheringHistoryContent').textContent();
  for(const text of ['Jane Smith','123 Old Street','Original gathering venue','Ham','Special pie','Beef','No nuts','Original private notes','Alex Doe','No Reply'])assert.ok(content.includes(text),text);
  for(const text of ['Changed notes','Different venue','Changed dish'])assert.ok(!content.includes(text),text);
  assert.equal(await page.locator('#gatheringHistoryContent input,#gatheringHistoryContent textarea,#gatheringHistoryContent button').count(),0);
  await page.locator('#nextGatheringDate').fill('2030-12-25');await page.getByRole('button',{name:'Start next gathering',exact:true}).click();
  assert.deepEqual(await page.evaluate(()=>[state.eventDate,state.rsvps.length,state.items.length,state.items[0].claims.length,state.hostNotes]),['2030-12-25',0,1,0,'']);
  assert.equal(await page.evaluate(()=>appState.accounts[0].invitedEvents.christmas),false);
  assert.deepEqual(await page.evaluate(()=>appState.gatheringHistory.christmas['2025-12-25']),locked);
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;enterEvent('christmas');});
  assert.deepEqual(await page.evaluate(()=>[state.eventDate,state.rsvps.length]),['2030-12-25',0],'recovery backup must not restore the prior year');
  await page.evaluate(()=>{state.eventDate='2026-01-01';state.hostNotes='A second occurrence';render();});
  await page.locator('#gatheringHistoryButton').click();assert.equal(await page.locator('#gatheringHistoryDate option').count(),2);
  await page.locator('#gatheringHistoryDate').selectOption('2025-12-25');assert.ok((await page.locator('#gatheringHistoryContent').textContent()).includes('Original private notes'));
  await page.locator('#gatheringHistoryDate').selectOption('2026-01-01');assert.ok((await page.locator('#gatheringHistoryContent').textContent()).includes('A second occurrence'));
  await page.locator('#closeGatheringHistory').click();await page.reload();await page.waitForFunction(()=>typeof startApp==='function');
  await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;enterEvent('christmas');});await page.locator('#gatheringHistoryButton').click();await page.locator('#gatheringHistoryDate').selectOption('2025-12-25');assert.ok((await page.locator('#gatheringHistoryContent').textContent()).includes('123 Old Street'));
  await page.locator('#closeGatheringHistory').click();await page.evaluate(()=>{hostAuthenticated=false;guestName='Alex Doe';signedInPersonName='Alex Doe';render();});assert.equal(await page.locator('#gatheringHistoryButton').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Automatic history, frozen deleted-account details, meals/claims/notes, read-only reports, next occurrence resets, date selection, reload and host-only UI passed.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});

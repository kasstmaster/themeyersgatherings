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
    appState=initialAppState();appState.accounts=[{name:'John,Jane,Joe Smith/Michael,Sally Jones',selectedEvents:{wedding:true,christmas:true},invitedEvents:{wedding:true},plusOnePeople:{wedding:['John Smith','Michael Jones']},signInAliases:[{name:'Michael Jones',alias:'Mike Jones'}]}];
    hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;viewedEventId='wedding';state=appState.events.wedding;state.weddingMealOptions=['Beef','Chicken'];state.rsvpDate='2030-01-01';showSignedInDestination();render();
  });
  if(!await page.evaluate(()=>SiteEditing.enabled))await page.locator('#editItemsButton').click();await page.locator('#editAccountsButton').click();
  assert.equal(await page.locator('[data-invitation-quantity]').count(),0);
  await page.locator('[data-person-invitation="Michael Jones"]').fill('2');await page.locator('[data-person-invitation="Michael Jones"]').dispatchEvent('change');await page.locator('[data-person-invitation="Sally Jones"]').fill('2');await page.locator('[data-person-invitation="Sally Jones"]').dispatchEvent('change');
  assert.equal(await page.locator('[data-person-invitation="John Smith"]').inputValue(),'1');
  assert.equal(await page.evaluate(()=>GuestPlanning.invitationCount(appState.accounts[0],'wedding')),2);
  assert.equal(await page.evaluate(()=>loadState().accounts[0].invitationPeople.wedding['Sally Jones']),2);
  await page.setViewportSize({width:390,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'account assignments fit mobile');
  assert.ok(await page.locator('[data-person-invitation="Michael Jones"]').evaluate(select=>select.getBoundingClientRect().left>=select.previousElementSibling.getBoundingClientRect().right),'invitation selector stays beside the name');
  await page.setViewportSize({width:1280,height:900});
  await page.locator('#accountsDialog .modal-close').click();
  async function login(first,last,event='wedding') {
    await page.evaluate(()=>{hostAuthenticated=false;hostWeddingPartyViewName='';guestName='';signedInPersonName='';showSignInPage();});
    await page.locator('#accountFirstName').fill(first);await page.locator('#signInSubmit').click();await page.locator('#accountLastName').fill(last);await page.locator('#signInSubmit').click();await page.locator('#accountSuffix').fill('');await page.locator('#signInSubmit').click();
    await page.locator(`[data-enter-event="${event}"]`).click();
  }
  async function attendAll(meal) {
    for(const select of await page.locator('[data-person-attending]').all())await select.selectOption('yes');
    for(const select of await page.locator('[data-person-guest]').all())await select.selectOption('no-guest');
    for(const input of await page.locator(`[data-rsvp-meal][value="${meal}"]`).all())await input.check();
  }
  await login('John','Smith');assert.equal(await page.locator('#signedInAccountName').textContent(),'Smith');
  assert.ok(!(await page.locator('#signedInAccount').textContent()).includes('Signed in as:'));
  await page.locator('#rsvpButton').click();assert.deepEqual(await page.locator('[data-rsvp-person]').evaluateAll(rows=>rows.map(row=>row.dataset.rsvpPerson)),['John Smith','Jane Smith','Joe Smith']);
  await attendAll('Beef');await page.locator('[data-target="children"][data-step="1"]').click();await page.locator('[data-rsvp-child-name="0"]').fill('Tyson');assert.equal(await page.locator('[data-guest-type="child"] legend').textContent(),'Child 1 - Tyson');await page.locator('[data-guest-type="child"] [data-rsvp-meal][value="Beef"]').check();await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();
  await login('Sally','Jones');assert.equal(await page.locator('#signedInAccountName').textContent(),'Jones');
  await page.locator('#rsvpButton').click();assert.deepEqual(await page.locator('[data-rsvp-person]').evaluateAll(rows=>rows.map(row=>row.dataset.rsvpPerson)),['Michael Jones','Sally Jones']);assert.equal(await page.locator('#children').textContent(),'0');
  await attendAll('Chicken');await page.locator('[data-rsvp-person="Michael Jones"] [data-person-guest]').selectOption('guest');await page.locator('[data-person-guest-name]').fill('Alex Friend');
  await page.locator('[data-target="children"][data-step="1"]').click();await page.locator('[data-target="children"][data-step="1"]').click();
  await page.locator('[data-rsvp-child-name="0"]').fill('Avery');await page.locator('[data-rsvp-child-name="1"]').fill('Sam');
  for(const input of await page.locator('[data-rsvp-meal][value="Chicken"]').all())await input.check();
  await page.locator('[data-rsvp-dietary]').first().fill('No dairy');await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();
  assert.deepEqual(await page.evaluate(()=>[state.rsvps[0].adults,state.rsvps[0].children,state.rsvps[0].menuSelections.length]),[6,3,9]);
  const groupTwo=await page.evaluate(()=>InvitationGroups.response(appState.accounts[0],'wedding',accountSignInNames(guestName),2,state.rsvps[0]));
  await login('Jane','Smith');await page.locator('#rsvpButton').click();assert.equal(await page.locator('#children').textContent(),'1');assert.equal(await page.locator('[data-rsvp-child-name="0"]').inputValue(),'Tyson');
  await page.locator('[data-rsvp-person="Joe Smith"] [data-person-attending]').selectOption('no');await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();
  assert.deepEqual(await page.evaluate(()=>InvitationGroups.response(appState.accounts[0],'wedding',accountSignInNames(guestName),2,state.rsvps[0])),groupTwo);
  assert.deepEqual(await page.evaluate(()=>[state.rsvps[0].adults,state.rsvps[0].children]),[5,3]);
  await login('Mike','Jones');await page.locator('#rsvpButton').click();assert.equal(await page.locator('[data-rsvp-person]').count(),2);await page.locator('#rsvpDialog .modal-close').click();
  await page.locator('[data-switch-event="christmas"]').click();await page.locator('#rsvpButton').click();assert.equal(await page.locator('[data-rsvp-person]').count(),5);await page.locator('#rsvpDialog .modal-close').click();
  await login('Sally','Jones');await page.evaluate(()=>{state.rsvpDate='2000-01-01';});await page.locator('#rsvpButton').click();assert.equal(await page.locator('[data-rsvp-meal]').first().isDisabled(),true);
  await page.locator('[data-rsvp-person="Sally Jones"] [data-person-attending]').selectOption('no');await page.locator('#rsvpForm .modal-dialog-footer>.primary-button').click();
  assert.deepEqual(await page.evaluate(()=>[state.rsvps[0].adults,state.rsvps[0].children]),[4,3]);
  assert.equal(await page.evaluate(()=>state.rsvps[0].people.find(p=>p.name==='Michael Jones').guestName),'Alex Friend');
  assert.equal(await page.evaluate(()=>state.rsvps[0].menuSelections.find(m=>m.name==='John Smith').meal),'Beef');
  // A stale identity cannot submit a different invitation's open form.
  await page.locator('#rsvpButton').click();await page.evaluate(()=>{signedInPersonName='Jane Smith';document.querySelector('#rsvpForm').requestSubmit();});assert.equal(await page.locator('#rsvpDialog').isVisible(),false);
  assert.deepEqual(errors,[]);console.log('Per-person invitation assignment, real sign-ins, surname banner, scoped meals/guests/children, preservation, gathering isolation, deadlines and stale-form checks passed.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});

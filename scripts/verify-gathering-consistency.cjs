// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
await page.evaluate(()=>{appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;showSignedInDestination();state=appState.events.wedding;viewedEventId='wedding';state.brideGroomPages=[{id:'main',title:'Bride & Groom',content:'A paragraph of page text.'}];render();});

await page.evaluate(()=>{
 appState.events['gathering-test']={...makeEvent([], '2027-08-01'),gatheringName:'Test Gathering'};
 for(const id of ['thanksgiving','christmas','gathering-test']){appState.events[id].items=structuredClone(defaultItems.slice(0,1));appState.events[id].hostNotes='The same shared notes.';}
});
for(const width of [1280,390]){
 await page.setViewportSize({width,height:900});
 for(const tab of ['notes','menu']){
  let expected;
  for(const id of ['thanksgiving','christmas','gathering-test']){
   await page.evaluate(([id,tab])=>{viewedEventId=id;state=appState.events[id];guestName=HOST_DISPLAY_NAME;signedInPersonName='';selectedGatheringTab=tab;render();},[id,tab]);
   const geometry=await page.evaluate(tab=>{
    const section=document.querySelector(tab==='notes'?'#hostNotesSection':'#gatheringMenuSection');
    const heading=section.querySelector('h2'),button=document.querySelector('#gatheringTabs button[aria-selected="true"]');
    const snapshot=element=>{const s=getComputedStyle(element);return Object.fromEntries(['padding','borderRadius','borderTopWidth','fontFamily','fontSize','fontWeight','lineHeight'].map(key=>[key,s[key]]));};
    return {page:snapshot(section),heading:snapshot(heading),tab:snapshot(button)};
   },tab);
   if(expected)assert.deepEqual(geometry,expected);else expected=geometry;
   assert.ok(await page.locator(tab==='notes'?'#hostNotesSection':'#gatheringMenuSection').isVisible());
   assert.equal(await page.locator('#weddingPartyTabs').isVisible(),false);
  }
 }
 let sharedPage;
 for(const id of ['thanksgiving','christmas','gathering-test','wedding']){
  await page.evaluate(id=>{viewedEventId=id;state=appState.events[id];selectedGatheringTab='notes';selectedWeddingTab='couple';render();},id);
  const styles=await page.evaluate(id=>{
   const section=document.querySelector(id==='wedding'?'#brideGroomSection':'#hostNotesSection'),h=section.querySelector('h2');
   return {padding:getComputedStyle(section).padding,radius:getComputedStyle(section).borderRadius,border:getComputedStyle(section).borderTopWidth,headingFont:getComputedStyle(h).fontFamily,headingSize:getComputedStyle(h).fontSize,headingLine:getComputedStyle(h).lineHeight};
  },id);
  if(sharedPage)assert.deepEqual(styles,sharedPage);else sharedPage=styles;
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 console.log('Shared standard layouts and common Wedding page styling passed',width);
}
// Shared rendering must not override intentional formatting in saved editable copy.
for(const id of ['thanksgiving','christmas','gathering-test','wedding']){
 const edited=id==='wedding'?'Introduction without emphasis':'*Introduction with emphasis*';
 await page.evaluate(([id,edited])=>{viewedEventId=id;state=appState.events[id];state.siteText={...state.siteText,'#welcomeNote':edited};render();},[id,edited]);
 assert.equal(await page.locator('#welcomeNote em').count(),id==='wedding'?0:1);
 assert.equal(await page.evaluate(()=>state.siteText['#welcomeNote']),edited);
}
// A custom gathering uses the same RSVP path, with counts and no Wedding inputs.
await page.evaluate(()=>{const id='gathering-test';appState.accounts=[{name:'Jane Smith',selectedEvents:{[id]:true}}];guestName='Jane Smith';signedInPersonName='Jane Smith';viewedEventId=id;state=appState.events[id];state.rsvpDate='2028-01-01';render();});
await page.locator('#rsvpButton').click();await page.locator('[data-person-attending]').selectOption('yes');await page.locator('#rsvpNext').click();await page.locator('[data-target="children"][data-step="1"]').click();await page.locator('#rsvpNext').click();await page.locator('[data-target="extraGuests"][data-step="1"]').click();await page.locator('#rsvpNext').click();await page.locator('[data-rsvp-dish-answer="no"]').click();
assert.equal(await page.locator('[data-rsvp-child-name]').count(),0);assert.equal(await page.locator('[data-rsvp-meal]').count(),0);
assert.deepEqual(await page.evaluate(()=>[state.rsvps[0].adults,state.rsvps[0].children]),[2,1]);
assert.deepEqual(errors,[]);await browser.close();console.log('Custom gatherings share standard RSVP behavior');})().catch(e=>{console.error(e);process.exit(1)});

// Compare page geometry and typography before, during, and after edit mode.
const {chromium}=require('playwright');const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',async route=>{if(!route.request().url().startsWith(base))return route.abort();if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}return route.continue();});await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function'&&!document.querySelector('#signInPage').hidden);
async function seed(eventId,locked=false){
 await page.evaluate(([eventId,locked])=>{
  document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
  appState=initialAppState();if(eventId==='gathering-test')appState.events[eventId]={...makeEvent([], '2027-08-01'),gatheringName:'Test Gathering'};appState.accounts=[{name:'Jane Smith,John Smith,Michael Jones',selectedEvents:{[eventId]:true},invitedEvents:{[eventId]:true},invitationPeople:{[eventId]:{'Michael Jones':2}},plusOnePeople:{wedding:['Jane Smith']}}];
  hostAuthenticated=false;guestName=appState.accounts[0].name;signedInPersonName='Jane Smith';viewedEventId=eventId;state=appState.events[eventId];state.rsvpDate=locked?'2000-01-01':'2099-01-01';
  state.weddingMealChoices=[{id:'beef',name:'Beef',audience:'Adults only'},{id:'chicken',name:'Chicken',audience:'Adults and children'}];showSignedInDestination();render();
 },[eventId,locked]);await page.locator('#rsvpButton').click();
}
const next=()=>page.locator('#rsvpNext').click();
const back=()=>page.locator('#rsvpBack').click();
async function on(selector){assert.equal(await page.locator(selector).isVisible(),true,selector+' should be the current question');}
async function assertFullscreen(width){const rect=await page.locator('#rsvpDialog').boundingBox();assert.equal(rect.x,0);assert.equal(rect.y,0);assert.equal(rect.width,width);assert.equal(rect.height,800);assert.ok(await page.locator('#rsvpDialog').evaluate(el=>el.scrollWidth<=el.clientWidth));}
for(const width of [1280,390]){
 await page.setViewportSize({width,height:800});
 for(const eventId of ['thanksgiving','christmas','gathering-test']){
  await seed(eventId);assert.equal(await page.locator('#rsvpButton').textContent(),'RSVP');await assertFullscreen(width);assert.equal(await page.locator('#rsvpHeading').textContent(),"Is Jane Smith joining us?");assert.equal(await page.locator('#rsvpIntro,#rsvpProgress').count(),0);assert.equal(await page.locator('#gatheringMenuSection').isVisible(),false);
  assert.equal(await page.locator('[data-rsvp-person="Michael Jones"]').count(),0);
  await next();await on('[data-rsvp-person="Jane Smith"] [data-person-attending]');assert.equal(await page.evaluate(()=>state.rsvps.length),0);
  await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes');await next();
  await on('[data-rsvp-person="John Smith"] [data-person-attending]');assert.equal(await page.locator('#rsvpHeading').textContent(),'Is John Smith joining us?');assert.equal(await page.locator('[data-rsvp-person="John Smith"] legend').isVisible(),false);await page.locator('[data-rsvp-person="John Smith"] [data-person-attending]').selectOption('no');
  await back();assert.equal(await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').inputValue(),'yes');await next();await next();
  await on('#rsvpChildrenCounter');assert.equal(await page.locator('#rsvpHeading').textContent(),'Are you bringing children?');assert.equal(await page.locator('#rsvpChildAge').isVisible(),true);assert.ok(await page.locator('#rsvpChildAge').evaluate(el=>el.previousElementSibling.id==='rsvpHeading'));assert.equal(await page.locator('#rsvpForm>.section-kicker').isVisible(),false);await page.locator('[data-target="children"][data-step="1"]').click();await next();
  await on('#rsvpGuestsCounter');assert.equal(await page.locator('[data-rsvp-child-name]').count(),0);await page.locator('[data-target="extraGuests"][data-step="1"]').click();await next();
  await on('#rsvpDishQuestion');assert.equal(await page.locator('#rsvpHeading').textContent(),'Will you be bringing a dish?');assert.equal(await page.evaluate(()=>state.rsvps.length),0);assert.equal(await page.locator('#rsvpNext').isVisible(),false);await page.locator('[data-rsvp-dish-answer="no"]').click();
  assert.equal(await page.locator('#rsvpDialog').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>{const r=state.rsvps[0];return [r.adults,r.children,r.extraGuests,r.people.map(p=>p.attending)]}),[2,1,1,[true,false]]);
  assert.equal(await page.locator('#rsvpButton').textContent(),'Change RSVP & Dishes');
  await page.evaluate(()=>{signedInPersonName='Michael Jones';render()});assert.equal(await page.locator('#rsvpButton').textContent(),'RSVP');
  await page.evaluate(()=>{signedInPersonName='Jane Smith';render()});assert.equal(await page.locator('#rsvpButton').textContent(),'Change RSVP & Dishes');

  await page.locator('#rsvpButton').click();assert.equal(await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').inputValue(),'yes');await page.locator('#rsvpDialog .modal-close').click();
 }
 // Dish choices and RSVP save together; closing the journey never claims a dish.
 await seed('thanksgiving');
 await page.evaluate(()=>{document.querySelector('#rsvpDialog').close();state.items=[{id:'side',name:'Potatoes',category:'Drinks',needed:3,claims:['Other Family']},{id:'full',name:'Turkey',category:'Main Table',needed:1,claims:['Other Family']},{id:'bread',name:'Bread',category:'Drinks',needed:1,claims:[]},{id:'fruit',name:'Fruit',category:'Desserts',needed:2,claims:[]}];});
 await page.locator('#rsvpButton').click();
 await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes');await next();
 await page.locator('[data-rsvp-person="John Smith"] [data-person-attending]').selectOption('no');await next();await next();await next();
 await on('#rsvpDishQuestion');assert.equal(await page.locator('#rsvpHeading').textContent(),'Will you be bringing a dish?');assert.equal(await page.locator('#rsvpNext').isVisible(),false);await page.locator('[data-rsvp-dish-answer="yes"]').click();await on('#rsvpDishOptions');
 assert.equal(await page.locator('[data-rsvp-dish="full"]').count(),0);assert.equal(await page.locator('[data-rsvp-dish="side"]').getAttribute('type'),'checkbox');
 assert.equal(await page.locator('#rsvpAnythingElse h4').textContent(),'Anything else?');assert.equal(await page.locator('#rsvpAnythingElse').evaluate(el=>el.previousElementSibling.dataset.rsvpDishCategory),'Drinks');
 const side=page.locator('.rsvp-dish-option').filter({has:page.locator('[data-rsvp-dish="side"]')});
 const bread=page.locator('.rsvp-dish-option').filter({has:page.locator('[data-rsvp-dish="bread"]')});
 assert.equal(await side.locator('.rsvp-dish-quantity').isVisible(),false);
 assert.equal(await bread.locator('.rsvp-dish-quantity').count(),0);
 const layout=await page.locator('#rsvpDishChoices').evaluate(root=>{
  const choices=[...root.querySelectorAll('.rsvp-dish-category:first-child .rsvp-dish-option')].map(e=>e.getBoundingClientRect());
  const categories=[...root.querySelectorAll('.rsvp-dish-category')].map(e=>e.getBoundingClientRect());
  return {sameRow:Math.abs(choices[0].top-choices[1].top)<2,separateColumns:choices[1].left>choices[0].left,categoryRows:categories[1].top>=categories[0].bottom,titleSize:getComputedStyle(root.querySelector('h4')).fontSize,itemSize:getComputedStyle(root.querySelector('.rsvp-dish-choice>span')).fontSize,itemWeight:getComputedStyle(root.querySelector('.rsvp-dish-choice>span')).fontWeight};
 });assert.equal(layout.sameRow,width>600);assert.equal(layout.separateColumns,width>600);assert.ok(layout.categoryRows);assert.equal(layout.titleSize,'22px');assert.equal(await page.locator('.rsvp-dish-category h4').first().isVisible(),false);assert.equal(await page.locator('.rsvp-dish-category').nth(1).evaluate(el=>getComputedStyle(el).marginTop),'64px');assert.equal(layout.itemSize,'20px');assert.equal(layout.itemWeight,'400');

 await next();await on('#rsvpDishOptions');await page.locator('[data-rsvp-dish="side"]').check();assert.equal(await side.locator('.rsvp-dish-quantity').isVisible(),true);await next();await on('#rsvpDishOptions');await side.locator('[data-rsvp-dish-quantity]').selectOption('2');await page.locator('[data-rsvp-dish="side"]').uncheck();assert.equal(await side.locator('.rsvp-dish-quantity').isVisible(),false);await page.locator('[data-rsvp-dish="side"]').check();await side.locator('[data-rsvp-dish-quantity]').selectOption('1');await page.locator('#rsvpCustomDish').check();await next();
 await on('#rsvpCustomDishName');await next();await on('#rsvpCustomDishName');await page.locator('#rsvpCustomDishName').fill('Cookies');await next();
 await on('#rsvpCustomDishQuantity');await page.locator('#rsvpCustomDishQuantity').fill('2');await page.locator('#rsvpCustomDishUnit').selectOption('dozen');await next();
 await on('#rsvpCustomDishCategory');await page.locator('#rsvpCustomDishCategory').selectOption('Desserts');await next();await on('#rsvpReview');
 assert.deepEqual(await page.evaluate(()=>state.items[0].claims),['Other Family']);await page.locator('#rsvpDialog .modal-close').click();
 assert.equal(await page.evaluate(()=>state.items.length),4);assert.equal(await page.evaluate(()=>state.rsvps.length),0);
 // Resume with an existing commitment and select No to release only this account's dishes.
 await page.evaluate(()=>{state.items[0].claims.push(guestName)});await page.locator('#rsvpButton').click();
 await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes');await next();await page.locator('[data-rsvp-person="John Smith"] [data-person-attending]').selectOption('no');await next();await next();await next();
 assert.equal(await page.locator('#rsvpBringingDish').inputValue(),'yes');await page.locator('[data-rsvp-dish-answer="yes"]').click();assert.equal(await page.locator('[data-rsvp-dish="side"]').isChecked(),true);assert.equal(await side.locator('[data-rsvp-dish-quantity]').inputValue(),'1');
 await page.locator('#rsvpCustomDish').check();await next();await page.locator('#rsvpCustomDishName').fill('Cookies');await next();await page.locator('#rsvpCustomDishQuantity').fill('2');await page.locator('#rsvpCustomDishUnit').selectOption('dozen');await next();await page.locator('#rsvpCustomDishCategory').selectOption('Desserts');await next();await next();
 assert.equal(await page.locator('#rsvpDialog').isVisible(),false);assert.deepEqual(await page.evaluate(()=>state.items[0].claims),['Other Family','Jane Smith,John Smith,Michael Jones']);assert.equal(await page.evaluate(()=>state.items[4].claims.length),2);
 await page.locator('#rsvpButton').click();await next();await next();await next();await next();assert.equal(await page.locator('#rsvpNext').isVisible(),false);await page.locator('[data-rsvp-dish-answer="no"]').click();
 assert.equal(await page.locator('#rsvpDialog').isVisible(),false);assert.deepEqual(await page.evaluate(()=>state.items.map(item=>item.claims)),[['Other Family'],['Other Family'],[],[],[]]);
 await page.evaluate(()=>{state.items[0].claims.push(guestName);state.rsvpDate='2000-01-01';render()});await page.locator('#rsvpButton').click();await next();await next();await next();await next();await on('#rsvpReview');await next();assert.equal(await page.evaluate(()=>state.items[0].claims.length),2);
 await seed('wedding');await assertFullscreen(width);
 await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('yes');await next();await on('[data-person-guest]');
 await next();await on('[data-person-guest]');await page.locator('[data-person-guest]').selectOption('guest');await next();await on('[data-person-guest-name]');
 await next();await on('[data-person-guest-name]');await page.locator('[data-person-guest-name]').fill('Alex Doe');await page.locator('[data-person-guest-name]').press('Enter');
 await on('[data-rsvp-person="John Smith"] [data-person-attending]');assert.equal(await page.locator('#rsvpHeading').textContent(),'Is John Smith joining us?');assert.equal(await page.locator('[data-rsvp-person="John Smith"] legend').isVisible(),false);await page.locator('[data-rsvp-person="John Smith"] [data-person-attending]').selectOption('no');await next();
 await on('#rsvpChildrenCounter');assert.equal(await page.locator('#rsvpHeading').textContent(),'Are you bringing children?');assert.equal(await page.locator('#rsvpChildAge').isVisible(),true);assert.ok(await page.locator('#rsvpChildAge').evaluate(el=>el.previousElementSibling.id==='rsvpHeading'));assert.equal(await page.locator('#rsvpForm>.section-kicker').isVisible(),false);await page.locator('[data-target="children"][data-step="1"]').click();await next();await on('[data-rsvp-child-name="0"]');
 await next();await on('[data-rsvp-child-name="0"]');await page.locator('[data-rsvp-child-name="0"]').fill('Tyson');await next();
 for(const [type,index,meal] of [['adult',0,'Beef'],['adult',1,'Chicken'],['child',0,'none']]){
  const card=page.locator(`.wedding-rsvp-guest[data-guest-type="${type}"][data-guest-index="${index}"]`);
  await on(`.wedding-rsvp-guest[data-guest-type="${type}"][data-guest-index="${index}"] .wedding-meal-options`);
  assert.equal(await card.locator('[data-rsvp-dietary]').isVisible(),false);assert.equal(await page.locator('#rsvpHeading').textContent(),`Choose ${await card.locator('[data-rsvp-guest-name]').inputValue()}'s meal`);assert.equal(await card.locator('legend').isVisible(),false);
  await card.locator(`[data-rsvp-meal][value="${meal}"]`).check();await next();assert.equal(await card.locator('[data-rsvp-dietary]').isVisible(),true);assert.equal(await page.locator('#rsvpHeading').textContent(),`${await card.locator('[data-rsvp-guest-name]').inputValue()}'s dietary needs`);assert.equal(await card.locator('legend').isVisible(),false);
  if(type==='adult'&&index===0)await card.locator('[data-rsvp-dietary]').fill('Gluten free');await next();
 }
 await on('#rsvpReview');assert.ok((await page.locator('#rsvpReview').textContent()).includes('Tyson'));assert.ok((await page.locator('#rsvpReview').textContent()).includes('Alex Doe'));
 await back();await back();assert.equal(await page.locator('[data-guest-type="child"] [data-rsvp-meal][value="none"]').isChecked(),true);await next();await next();await next();
 assert.equal(await page.locator('#rsvpDialog').isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>{const r=state.rsvps[0];return [r.adults,r.children,r.childNames,r.menuSelections.map(m=>m.meal)]}),[2,1,['Tyson'],['Beef','Chicken','none']]);assert.equal(await page.locator('#rsvpButton').textContent(),'RSVP');
 await page.evaluate(()=>{state.rsvpDate='2000-01-01';render()});await page.locator('#rsvpButton').click();
 await page.locator('[data-rsvp-person="Jane Smith"] [data-person-attending]').selectOption('no');await next();await on('[data-rsvp-person="John Smith"] [data-person-attending]');assert.equal(await page.locator('#rsvpHeading').textContent(),'Is John Smith joining us?');assert.equal(await page.locator('[data-rsvp-person="John Smith"] legend').isVisible(),false);await next();await on('#rsvpChildrenCounter');await next();await on('[data-rsvp-child-name="0"]');await next();await on('#rsvpReview');await next();
 assert.deepEqual(await page.evaluate(()=>state.rsvps[0].menuSelections.map(m=>m.meal)),['none']);
 await page.locator('#rsvpButton').click();await page.evaluate(()=>{viewedEventId='christmas';state=appState.events.christmas});await next();assert.equal(await page.locator('#rsvpDialog').isVisible(),false);
 console.log('Full-page RSVP journey, validation, Back, invitation scope, saved responses and deadlines passed',width);
}
assert.deepEqual(errors,[]);await browser.close();})().catch(e=>{console.error(e);process.exit(1)});

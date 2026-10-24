// Optional Chromium integration check. External requests and live state writes are blocked.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=(process.env.BROWSER_TEST_URL || 'http://127.0.0.1:8041').replace(/\/$/,'')+'/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(12000);
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  if(!route.request().url().startsWith(base))return route.abort();
  if(new URL(route.request().url()).pathname==='/'){const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});}
  return route.continue();
 });
 await page.goto(base);await page.waitForFunction(()=>typeof startApp==='function');
 await page.evaluate(()=>{localStateRevision+=1;appState=normalizeState(initialAppState());hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';state=appState.events.thanksgiving;viewedEventId='thanksgiving';state.headerText='First line\nSecond line';showSignedInDestination();render();});
 await page.locator('#editItemsButton').click();
 const appearanceFor=id=>page.locator(`.inline-appearance-tools[data-inline-anchor="${id}"]`);
 assert.equal(await appearanceFor('eventHeaderText').count(),0);assert.equal(await appearanceFor('rsvpButton').count(),0);assert.equal(await appearanceFor('guestListButton').count(),0);assert.equal(await appearanceFor('guestCount').count(),0);
 assert.equal(await page.locator('[data-inline-field-key="thanksgiving:eventHeaderText"]').count(),1);
 assert.equal(await page.locator('[data-inline-field-key="thanksgiving:text-style:#rsvpButton"]').count(),1);
 assert.equal(await page.locator('[data-inline-field-key="thanksgiving:text-style:#guestListButton"]').count(),1);
 async function edit(key){await page.locator(`[data-inline-field-key="${key}"] button`).click();return page.locator('.inline-direct-input');}
 async function color(input,start,end,hex){await input.evaluate((element,range)=>{element.focus();element.setSelectionRange(...range);},[start,end]);const wrapper=input.locator('..');await wrapper.locator('.inline-text-appearance summary').click();await wrapper.getByLabel('Text color hex',{exact:true}).fill(hex);await wrapper.getByLabel('Text color hex',{exact:true}).press('Tab');}
 let input=await edit('thanksgiving:text-style:#rsvpButton');await color(input,0,4,'#0055aa');await page.locator('#welcome-title').click();
 assert.equal(await page.locator('#rsvpButton').textContent(),'RSVP');assert.equal(await page.locator('#rsvpButton .text-selection-color').evaluate(element=>getComputedStyle(element).color),'rgb(0, 85, 170)');
 input=await edit('thanksgiving:text-style:#rsvpButton');await input.locator('..').locator('.inline-text-appearance summary').click();await input.locator('..').getByRole('button',{name:'Element appearance',exact:true}).click();
 await page.locator('.appearance-editor').getByLabel('Background hex code',{exact:true}).fill('#aabbcc');await page.locator('.appearance-editor').getByLabel('Background opacity',{exact:true}).fill('100');await page.locator('.appearance-editor').getByRole('button',{name:'Save appearance',exact:true}).click();
 assert.equal(await page.locator('#rsvpButton').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(170, 187, 204)');assert.equal(await appearanceFor('rsvpButton').count(),0);
 input=await edit('thanksgiving:text-style:#rsvpButton');await input.fill('Please RSVP');await page.locator('#welcome-title').click();assert.equal(await page.locator('#rsvpButton').textContent(),'Please RSVP');
 input=await edit('thanksgiving:text-style:#guestListButton');const count=(await input.inputValue()).split('\n')[0];await color(input,0,count.length,'#bb2200');await page.locator('#welcome-title').click();
 await page.evaluate(()=>{document.querySelector('#guestCount').textContent='42/8';ElementAppearance.applyText();});assert.equal(await page.locator('#guestCount').textContent(),'42/8');assert.equal(await page.locator('#guestCount .text-selection-color').evaluate(element=>getComputedStyle(element).color),'rgb(187, 34, 0)');
 assert.equal(await appearanceFor('guestCount').count(),0);console.log('Text boxes, buttons and count cards each have one Edit control; selected colors and button surfaces save without replacing live count values.');
 await page.evaluate(()=>{state.textAppearance['#guestListButton'].parts[1]={source:'Attending',markup:TextStyles.mark('Attending',{color:'#bb2200'})};ElementAppearance.applyText();enterEvent('wedding');});assert.equal(await page.locator('#guestListButton>span .text-selection-color').count(),0);await page.locator('#rsvpButton').click();
 input=await edit('wedding:text-style:#uploadPhotosButton');assert.match(await input.inputValue(),/^Upload\nPhotos & Videos$/);await color(input,0,6,'#335577');await page.locator('#rsvpFirstPageDate').click();assert.equal(await page.locator('#uploadPhotosButton>span>br').count(),1);
 assert.equal(await appearanceFor('registryAttireHeading').count(),0);
 const attireTools=page.locator('.inline-tab-tools[data-inline-tab-group="weddingPartyTabs"]').nth(1);assert.equal(await attireTools.locator('button').count(),1);await attireTools.getByRole('button',{name:'Edit title',exact:true}).click();
 input=page.getByRole('textbox',{name:'Page title',exact:true});await color(input,0,6,'#117733');await page.locator('#rsvpFirstPageDate').click();assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="attire"]>span').textContent(),'Attire');
 assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="attire"] .text-selection-color').evaluate(element=>getComputedStyle(element).color),'rgb(17, 119, 51)');assert.equal(await page.locator('#weddingPartyTabs [data-wedding-tab="attire"] svg').count(),1);
 await page.reload();await page.waitForFunction(()=>typeof startApp==='function');await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;enterEvent('thanksgiving');});assert.equal(await page.locator('#rsvpButton').textContent(),'Please RSVP');assert.equal(await page.locator('#rsvpButton').evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(170, 187, 204)');
 assert.deepEqual(errors,[]);console.log('Tab text uses the same selected-text color controls inside its single Edit option; toolbar icons remain intact.');await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});

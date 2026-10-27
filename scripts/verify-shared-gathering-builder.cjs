// Local-only regression: the same builder edits existing and newly created gatherings.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   if(!route.request().url().startsWith('http://127.0.0.1:8041/'))return route.abort();
   if(new URL(route.request().url()).pathname==='/'){
    const response=await route.fetch();return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});
   }
   return route.continue();
  });
  await page.goto('http://127.0.0.1:8041/');await page.waitForFunction(()=>typeof startApp==='function');
  await page.evaluate(()=>{
   localStateRevision+=1;appState=normalizeState(initialAppState());
   appState.accounts=[{name:'Casey Example',source:'website',selectedEvents:{wedding:true,thanksgiving:true,christmas:true},invitedEvents:{wedding:true,thanksgiving:true,christmas:true}}];
   for(const [id,event] of Object.entries(appState.events)){
    event.eventDate='2028-08-10';event.rsvpIntroText=`Existing ${id} RSVP introduction`;event.rsvpDetailsText=`Existing ${id} address`;
    event.siteText={'#weddingMediaHeading':`Existing ${id} title`,'#weddingMediaIntro':`Existing ${id} introduction`};
   }
   appState.events.wedding.weddingMealChoices=[{id:'meal',name:'Wedding meal',audience:'Adults and children'}];
   hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';showEventSelection();render();
  });
  // Use the normal creation path; new gatherings get no special editor setup.
  await page.locator('#newGatheringButton').click();
  await page.locator('#newGatheringName').fill('Summer Celebration');await page.locator('#newGatheringDate').fill('2028-08-10');
  await page.locator('#newGatheringForm button[value="create"]').click();
  await page.waitForFunction(()=>viewedEventId.startsWith('gathering-') && document.querySelector('#rsvpDialog').open);
  const newId=await page.evaluate(()=>viewedEventId),ids=['thanksgiving','christmas','wedding',newId];
  const useMedia=async id=>{
   await page.evaluate(id=>enterEvent(id),id);
   await page.evaluate(()=>{const button=document.querySelector('#rsvp-nav-media');if(SiteEditing.enabled)ElementEditor.activate(button);else button.click();});
   await page.locator('#weddingMediaHeading').waitFor({state:'visible'});
  };
  const editText=async(selector,value)=>{
   const field=page.locator(selector);await field.dblclick();await field.press('Control+a');await field.pressSequentially(value);
  };
  const snapshot=()=>page.evaluate(()=>structuredClone(appState.events));
  const expected=new Map();
  for(const [index,id] of ids.entries()){
   await useMedia(id);const before=await snapshot();
   if(index<3){assert.equal(await page.locator('#weddingMediaHeading').textContent(),`Existing ${id} title`);assert.equal(await page.locator('#weddingMediaIntro').textContent(),`Existing ${id} introduction`);}
   if(!await page.evaluate(()=>SiteEditing.enabled))await page.locator('#editItemsButton').click();
   await page.locator('#rsvp-nav-media').click();await page.getByLabel('Page title',{exact:true}).fill(`Photos ${index+1}`);
   await page.evaluate(()=>SiteEditing.flush());
   const title=`Gathering ${index+1} title`,intro=`Gathering ${index+1} welcome`,rsvp=`Gathering ${index+1} RSVP welcome`;
   await editText('#weddingMediaHeading',title);
   await page.getByLabel('Alignment',{exact:true}).selectOption(index%2?'left':'center');
   await page.getByLabel('Font',{exact:true}).selectOption(index%2?'Arial':'Georgia');
   await page.getByLabel('Size',{exact:true}).selectOption('24');
   await page.getByRole('button',{name:index%2?'Italic':'Bold',exact:true}).click();
   await page.getByLabel('Text color hex',{exact:true}).fill(index%2?'#123456':'#654321');
   await editText('#weddingMediaIntro',intro);
   await page.getByLabel('Alignment',{exact:true}).selectOption('right');
   await page.getByLabel('Text color hex',{exact:true}).fill('#234567');
   await page.waitForFunction(({id,intro})=>appState.events[id].siteText['#weddingMediaIntro']===intro,{id,intro});
   // Add and edit a page through the same toolbar container in every gathering.
   await page.locator('#rsvp-nav-media').click();await page.getByRole('button',{name:'Container',exact:true}).click();
   await page.getByLabel('New page title',{exact:true}).fill(`Extra page ${index+1}`);await page.getByRole('button',{name:'Add page',exact:true}).click();
   await editText('.inline-custom-page .section-kicker',`Extra introduction ${index+1}`);
   await editText('.inline-custom-page h2',`Extra title ${index+1}`);
   await editText('.inline-custom-page .bride-groom-content',`Extra content ${index+1}`);
   await page.evaluate(()=>{SiteEditing.flush();RsvpFlow.first();ElementAppearance.refreshControls();});
   // Includes the new gathering's empty RSVP slot; it must be selectable too.
   await editText('#rsvpFirstPageText',rsvp);
   // Switch immediately, without waiting for autosave or clicking Done.
   const next=ids[(index+1)%ids.length];await useMedia(next);
   const after=await snapshot();assert.equal(after[id].rsvpIntroText,rsvp);
   for(const other of ids.filter(other=>other!==id))assert.deepEqual(after[other],before[other],`Editing ${id} changed ${other}`);
   expected.set(id,{title,intro,rsvp,styles:after[id].elementAppearance});
  }
  await page.locator('#editItemsButton').click();
  const saved=await snapshot();assert.deepEqual(saved.wedding.weddingMealChoices,[{id:'meal',name:'Wedding meal',audience:'Adults and children'}]);
  await page.reload();await page.waitForFunction(()=>typeof startApp==='function');
  await page.evaluate(()=>{hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';});
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:900});
   for(const id of ids){
    await useMedia(id);const value=expected.get(id);
    assert.equal(await page.locator('#rsvp-nav-media').getAttribute('aria-label'),`Photos ${ids.indexOf(id)+1}`);
    assert.equal(await page.locator('#weddingMediaHeading').textContent(),value.title);
    assert.equal(await page.locator('#weddingMediaIntro').textContent(),value.intro);
    assert.equal(await page.locator('#weddingMediaIntro').evaluate(e=>getComputedStyle(e).textAlign),'right');
    const actual=await page.evaluate(()=>({intro:state.rsvpIntroText,styles:state.elementAppearance}));
    assert.equal(actual.intro,value.rsvp);assert.deepEqual(actual.styles,value.styles);
    await page.locator('#rsvpPageNavigation').getByRole('button',{name:`Extra title ${ids.indexOf(id)+1}`,exact:true}).click();
    assert.equal(await page.locator('.inline-custom-page .section-kicker').textContent(),`Extra introduction ${ids.indexOf(id)+1}`);
    assert.equal(await page.locator('.inline-custom-page .bride-groom-content').textContent(),`Extra content ${ids.indexOf(id)+1}`);
    await useMedia(id);
    await page.locator('#editItemsButton').click();await page.locator('#weddingMediaHeading').click();
    assert.equal(await page.getByLabel('Size',{exact:true}).inputValue(),'24');
    await page.locator('#weddingMediaIntro').click();assert.equal(await page.getByLabel('Alignment',{exact:true}).inputValue(),'right');
    await page.locator('#editItemsButton').click();
   }
  }
  assert.deepEqual(errors,[]);
  console.log('One shared builder preserves independent titles, introductions, rich-text styles and RSVP text across autosave, immediate switches, reloads and desktop/mobile for existing and newly created gatherings.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

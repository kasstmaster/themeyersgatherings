// Run against a local static server: BASE_URL=http://127.0.0.1:8765 node scripts/verify-page-actions.cjs
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=(process.env.BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/,'')+'/';
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{window.print=()=>{window.testPrintInvoked=true;};});
      await page.route('**/*',async route=>{
        if(!route.request().url().startsWith(base))return route.abort();
        if(new URL(route.request().url()).pathname==='/'){
          const response=await route.fetch();
          return route.fulfill({response,body:(await response.text()).replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1')});
        }
        return route.continue();
      });
      await page.goto(base);
      await page.waitForFunction(()=>!document.documentElement.classList.contains('meyers-loading'));
      await page.evaluate(()=>{
        appState=initialAppState();hostAuthenticated=true;guestName=HOST_DISPLAY_NAME;signedInPersonName='';
        appState.accounts=[{name:'Jane Smith',selectedEvents:{wedding:true}}];
        const wedding=appState.events.wedding;
        wedding.brideGroomPages=[{id:'main',title:'Our Story',content:'ONLY-STORY'},{id:'venue',title:'Venue',content:'ONLY-VENUE'}];
        wedding.perfectExperienceContent='ONLY-EXPERIENCE';wedding.whatToExpectContent='ONLY-EXPECT';
        wedding.timelineAboveContent='ONLY-TIMELINE';
        wedding.registryUrl='https://example.com/registry';
        wedding.weddingPartyMembers=[{id:'jane',name:'Jane Smith',title:'Bridesmaid',responsibilities:'ONLY-JANE-DUTIES',pages:[{id:'trip',title:'Trip Plans',content:'ONLY-TRIP'}]},{id:'peter',name:'Peter Jones',title:'Groomsman',responsibilities:'PRIVATE-PETER-DUTIES',pages:[]}];
        window.realPagePrint=PageActions.printPage;
        PageActions.printPage=page=>{window.lastPrintedPage=page;};
        document.addEventListener('click',event=>{if(event.target.closest('[data-page-email]'))event.preventDefault();});
        enterEvent('wedding');
      });
      async function selected(tab,sub){
        await page.evaluate(({tab,sub})=>{
          selectedWeddingTab=tab;
          if(tab==='couple')selectedBrideGroomPage=sub||'main';
          if(tab==='party')selectedMatronTab=sub||'experience';
          if(tab==='guest')selectedGuestTab=sub||'attire';
          render();
        },{tab,sub});
      }
      async function check(selector,marker,forbidden){
        const surface=page.locator(selector);await surface.scrollIntoViewIfNeeded();
        assert.equal(await surface.locator(':scope > [data-page-actions]').count(),1,selector);
        const metrics=await surface.evaluate(el=>{
          const heading=el.querySelector('h1,h2,h3'),actions=el.querySelector(':scope > [data-page-actions]');
          const snapshot=()=>{const box=heading.getBoundingClientRect(),css=getComputedStyle(heading);return [box.x,box.y,box.width,box.height,css.fontFamily,css.fontSize,css.lineHeight,css.marginBottom];};
          const before=snapshot();actions.style.display='none';const after=snapshot();actions.style.removeProperty('display');
          const box=el.getBoundingClientRect(),tools=actions.getBoundingClientRect();
          return {before,after,top:tools.top-box.top,right:box.right-tools.right,width:tools.width};
        });
        assert.deepEqual(metrics.before,metrics.after,'Actions must not move or reformat a heading');
        assert.ok(metrics.top>=0&&metrics.top<=5);assert.ok(metrics.right>=7&&metrics.right<=49);
        assert.ok(metrics.width<(await surface.boundingBox()).width);
        await surface.locator(':scope > [data-page-actions] [data-page-print]').click();
        const printed=await page.evaluate(()=>lastPrintedPage);
        assert.ok(printed.text.toLowerCase().includes(marker.toLowerCase()),`${selector} must export selected content: ${marker}: ${JSON.stringify(printed)}`);
        if(forbidden)assert.ok(!printed.text.toLowerCase().includes(forbidden.toLowerCase()),`Must not export ${forbidden}`);
        assert.ok(!printed.html.includes('data-page-actions'));
        await surface.locator(':scope > [data-page-actions] [data-page-email]').click();
        const mail=new URL(await surface.locator(':scope > [data-page-actions] [data-page-email]').getAttribute('href'));
        assert.equal(mail.protocol,'mailto:');assert.ok(mail.searchParams.get('body').toLowerCase().includes(marker.toLowerCase()));
        return printed;
      }
      await check('#brideGroomSection','ONLY-STORY','ONLY-VENUE');
      await selected('couple','venue');await check('#brideGroomSection','ONLY-VENUE','ONLY-STORY');
      await selected('timeline');await check('#weddingTimelineSection','ONLY-TIMELINE','ONLY-STORY');
      await selected('registry');await check('#registrySection','https://example.com/registry','ONLY-TIMELINE');
      await selected('party','experience');await check('#weddingPartySection','ONLY-EXPERIENCE','ONLY-JANE-DUTIES');
      await selected('party','duties');await check('#weddingPartySection','ONLY-JANE-DUTIES','ONLY-EXPERIENCE');
      const personal=await page.evaluate(()=>WeddingParty.visiblePages(state.weddingPartyMembers,true)[0].key);
      await selected('party',personal);await check('#weddingPartySection','ONLY-TRIP','ONLY-EXPERIENCE');
      await selected('guest','attire');await check('#guestSection','For the Ladies','ONLY-EXPECT');
      await selected('guest','details');await check('#guestSection','ONLY-EXPECT','For the Ladies');
      // New top-level pages and subpages gain controls through the same renderer.
      await page.evaluate(()=>{
        state.sitePages=[{id:'top',nav:'weddingPartyTabs',title:'Travel',intro:'Travel introduction',content:'ONLY-CUSTOM-TOP'},{id:'sub',nav:'brideGroomTabs',title:'Custom Subpage',intro:'Subpage introduction',content:'ONLY-CUSTOM-SUB'}];
        render();
      });
      await page.locator('#weddingPartyTabs [aria-controls="custom-page-top"]').click();
      await check('#custom-page-top','ONLY-CUSTOM-TOP','ONLY-CUSTOM-SUB');
      await page.evaluate(()=>{SiteEditing.toggle(render);});
      await page.waitForTimeout(50);
      const collision=await page.evaluate(()=>{
        const actions=document.querySelector('#custom-page-top > [data-page-actions]').getBoundingClientRect();
        const edit=[...document.querySelectorAll('.inline-page-tools')].find(el=>el.dataset.inlineAnchor==='custom-page-top');
        if(!edit)throw new Error('Custom page Edit control missing');
        return edit.getBoundingClientRect().top<actions.bottom;
      });
      assert.equal(collision,false,'Page Edit must not overlap print/email controls');
      await page.evaluate(()=>SiteEditing.toggle(render));
      await page.locator('[data-wedding-tab="couple"]').click();
      await page.locator('#brideGroomTabs [aria-controls="custom-page-sub"]').click();
      await check('#brideGroomSection','ONLY-CUSTOM-SUB','ONLY-CUSTOM-TOP');
      // Upload/gallery tabs use the shared component; private session URLs never leave the page.
      await page.evaluate(()=>{
        document.querySelector('#weddingMediaDialog').showModal();
        document.querySelectorAll('#weddingMediaTabs [role="tab"]').forEach(tab=>tab.setAttribute('aria-selected',String(tab.dataset.mediaTab==='view')));
        document.querySelector('#weddingMediaUpload').hidden=true;document.querySelector('#weddingMediaView').hidden=false;
        document.querySelector('#weddingMediaGallery').innerHTML='<article><p>ONLY-GALLERY</p><img alt="Private photo" src="https://files.example/wedding-media/media/file?session=FAKE_SECRET"><a href="https://files.example/wedding-media/media/file?session=FAKE_SECRET">Original</a><video controls><source src="https://example.com/video.mp4"></video><p style="display:none">HIDDEN-PRIVATE-TEXT</p></article>';
        PageActions.sync();
      });
      const gallery=await check('#weddingMediaSection','ONLY-GALLERY','ONLY-CUSTOM-TOP');
      assert.ok(!JSON.stringify(gallery).includes('FAKE_SECRET'));assert.ok(gallery.text.includes('sign in to view'));assert.ok(gallery.text.includes('https://example.com/video.mp4'));assert.ok(!gallery.text.includes('HIDDEN-PRIVATE-TEXT'));
      await page.evaluate(()=>new Promise(resolve=>{const dialog=document.querySelector('#weddingMediaDialog');dialog.addEventListener('close',resolve,{once:true});dialog.close();}));
      // Standard and newly created gatherings share Notes/Menu and custom page controls.
      for(const event of ['thanksgiving','christmas','birthday-test']){
        await page.evaluate(event=>{
          if(!appState.events[event])appState.events[event]={...makeEvent([], '2027-08-10'),gatheringName:'Birthday'};
          syncGatheringDefinitions(appState.events);enterEvent(event);state.hostNotes='ONLY-NOTES';selectedGatheringTab='notes';render();
        },event);
        await check('#hostNotesSection','ONLY-NOTES','ONLY-STORY');
        await page.evaluate(()=>{selectedGatheringTab='menu';render();});
        await check('#gatheringMenuSection',await page.evaluate(()=>state.items[0]?.name || ''),'ONLY-NOTES');
        await page.evaluate(()=>{PageActions.sync();PageActions.sync();});
        assert.equal(await page.locator('#gatheringMenuSection > [data-page-actions]').count(),1);
        await page.evaluate(event=>{state.sitePages=[{id:event+'-custom',nav:'gatheringTabs',title:'Custom Page',intro:'Custom introduction',content:'ONLY-GATHERING-CUSTOM'}];render();},event);
        await page.locator(`#gatheringTabs [aria-controls="custom-page-${event}-custom"]`).click();
        await check(`#custom-page-${event}-custom`,'ONLY-GATHERING-CUSTOM','ONLY-NOTES');
      }
      await page.evaluate(()=>{PageActions.printPage=window.realPagePrint;});
      await page.locator('#custom-page-birthday-test-custom > [data-page-actions] [data-page-print]').click();
      await page.waitForFunction(()=>document.querySelector('#pagePrintFrame')?.contentWindow.testPrintInvoked===true);
      assert.equal(await page.frameLocator('#pagePrintFrame').locator('h1').textContent(),'Custom Page');
      await page.evaluate(()=>{document.querySelector('#pagePrintFrame').remove();PageActions.printPage=page=>{window.lastPrintedPage=page;};});
      await page.evaluate(()=>{hostAuthenticated=false;guestName='Jane Smith';signedInPersonName='Jane Smith';enterEvent('wedding');selectedWeddingTab='party';selectedMatronTab='duties';render();});
      await check('#weddingPartySection','ONLY-JANE-DUTIES','PRIVATE-PETER-DUTIES');
      assert.equal(await page.evaluate(()=>PageActions.exportPage(document.querySelector('#brideGroomSection'))),null);
      await page.evaluate(()=>{enterEvent('thanksgiving');});
      assert.equal(await page.evaluate(()=>PageActions.exportPage(document.querySelector('#hostNotesSection'))),null);
      assert.deepEqual(errors,[]);
      await page.close();console.log('Shared page actions, positioning, custom pages, selected-content export and access boundaries passed',width);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});

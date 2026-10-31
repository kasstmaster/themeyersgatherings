// Local-only browser verification of the production Cloudflare route handler and staged assets.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const os=require('node:os');
const http=require('node:http');
(async()=>{
  const {buildDomainSite}=await import(pathToFileURL(path.resolve('scripts/build-domain-site.js')));
  const {handleGatheringSite}=await import(pathToFileURL(path.resolve('domain-site-worker/gathering-site.js')));
  const output=await fs.mkdtemp(path.join(os.tmpdir(),'meyers-domain-browser-'));
  await buildDomainSite(output);
  const state=JSON.parse(await fs.readFile(path.join(output,'themeyers/data/app-state.json'),'utf8'));
  const token='A'.repeat(43);
  let stateReady = Promise.resolve();
  state.accounts=[{name:'Jane Smith',qrToken:token,selectedEvents:{wedding:true},invitedEvents:{wedding:true}}];
  const GATHERING_SITE={async fetch(request){
    const url=new URL(request.url),filename=path.join(output,'themeyers',decodeURIComponent(url.pathname));
    try {
      let body=await fs.readFile(filename);
      const extension=path.extname(filename),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml'}[extension]||'application/octet-stream';
      if(extension==='.html')body=body.toString().replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1');
      // Exercise production-only installation against this secure localhost fixture.
      if(url.pathname==='/app-install.js')body=body.toString().replace('https://meyer.ilymmd.com',base);
      if(url.pathname.endsWith('/data/app-state.json')){await stateReady;body=JSON.stringify(state);}
      return new Response(body,{headers:{'Content-Type':type}});
    }catch{return new Response('Not found',{status:404});}
  }};
  let base;
  const server=http.createServer(async(req,res)=>{
    try {
      const legacyPath=/^\/themeyers(?:gatherings)?(?:\/|$)/.test(req.url);
      const previousHost=req.url.startsWith('/_previous-host/');
      const requestPath=previousHost?req.url.slice('/_previous-host'.length):req.url;
      const response=await handleGatheringSite(new Request((previousHost?'https://themeyers.ilymmd.com':legacyPath?'https://ilymmd.com':'https://meyer.ilymmd.com')+requestPath),{GATHERING_SITE});
      if(!response){res.writeHead(404);res.end();return;}
      const headers=Object.fromEntries(response.headers);
      // Keep browser requests local while exercising a real HTTP redirect, not an intercepted one.
      if(headers.location){assert.ok(headers.location.startsWith('https://meyer.ilymmd.com/'));headers.location=headers.location.replace('https://meyer.ilymmd.com',base);}
      res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){res.writeHead(500);res.end(error.message);}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
      let releaseState;
      stateReady=new Promise(resolve=>{releaseState=resolve;});
      await page.goto(base+(width===1280?'/_previous-host/':'/themeyersgatherings/')+'?invitation=existing&next=%2F#/signin/account/'+token,{waitUntil:'domcontentloaded'});
      try {
        assert.equal(await page.locator('#meyersLoadingScreen').isVisible(),true);
        assert.equal(await page.locator('#meyersLoadingScreen h1').textContent(),'The Meyers');
        assert.equal(await page.title(),'The Meyers');
        assert.equal(await page.locator('#accountFirstName').isVisible(),false);
      } finally { releaseState(); }
      await page.waitForFunction(()=>typeof qrScopedAccount!=='undefined'&&qrScopedAccount?.name==='Jane Smith');
      assert.equal(page.url(),base+'/?invitation=existing&next=%2F#/signin/account/'+token);
      assert.equal(await page.locator('#accountLinkError').isVisible(),false);
      assert.equal(await page.evaluate(()=>accountQrUrl(qrScopedAccount)),base+'/#/signin/account/'+token);
      assert.equal(await page.evaluate(()=>generalLoginUrl()),base+'/');
      assert.equal(await page.locator('#accountFirstName').isVisible(),true);
      assert.equal(await page.locator('#meyersLoadingScreen').isVisible(),false);
      assert.equal(await page.title(),'The Meyers');
      assert.equal(await page.locator('#meyersLoadingScreen img').evaluate(image=>image.complete && image.naturalWidth>0),true);
      const manifest=await page.evaluate(async()=>fetch(document.querySelector('link[rel=manifest]').href).then(response=>response.json()));
      assert.equal(manifest.name,'The Meyers');
      assert.equal(manifest.scope,'/');
      for(const icon of manifest.icons)assert.equal((await page.request.get(base+'/'+icon.src)).status(),200);
      await page.evaluate(()=>navigator.serviceWorker.ready);
      assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).scope),base+'/');
      await page.locator('#installAppButton').click();
      assert.equal(await page.locator('#installAppHelp').isVisible(),true);
      await page.evaluate(()=>{
        const event=new Event('beforeinstallprompt',{cancelable:true});
        event.prompt=async()=>{window.installPromptShown=true;};
        event.userChoice=Promise.resolve({outcome:'accepted'});
        window.dispatchEvent(event);
      });
      await page.locator('#installAppButton').click();
      assert.equal(await page.evaluate(()=>window.installPromptShown),true);
      await page.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));
      assert.equal(await page.locator('#installAppPrompt').isVisible(),false);
      await page.evaluate(()=>{
        for(const eventId of Object.keys(appState.events)){
          viewedEventId=eventId;state=appState.events[eventId];render();
          if(document.title!=='The Meyers')throw new Error('Gathering changed the browser title');
        }
      });
      assert.equal(await page.evaluate(()=>appState.accounts[0].qrToken),token);
      await page.context().setOffline(true);
      await page.reload();
      assert.match(await page.locator('body').textContent(),/Please reconnect to the internet/);
      await page.context().setOffline(false);
      await page.reload();
      await page.waitForFunction(()=>typeof qrScopedAccount!=='undefined'&&qrScopedAccount?.name==='Jane Smith');
      const cachedUrls=await page.evaluate(async()=>{
        const cache=await caches.open('meyers-offline-v1');
        return (await cache.keys()).map(request=>new URL(request.url).pathname);
      });
      assert.deepEqual(cachedUrls,['/offline.html']);
      assert.deepEqual(errors,[]);
      await page.close();console.log('Meyers startup, rose icons, app installation, offline fallback and legacy QR sign-in passed',width);
    }
    const failedPage=await browser.newPage();
    await failedPage.clock.install();
    await failedPage.route('**/*',route=>route.request().url().startsWith(base+'/')&&new URL(route.request().url()).pathname!=='/app.js'?route.continue():route.abort());
    await failedPage.goto(base+'/');
    assert.equal(await failedPage.locator('#meyersLoadingScreen').isVisible(),true);
    await failedPage.clock.fastForward(20001);
    assert.equal(await failedPage.locator('#meyersLoadingScreen').isVisible(),false);
    await failedPage.close();
    console.log('Missing startup script cannot leave a permanent loading screen');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(output,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1);});

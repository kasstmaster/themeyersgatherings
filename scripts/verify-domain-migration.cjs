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
      const extension=path.extname(filename),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extension]||'application/octet-stream';
      if(extension==='.html')body=body.toString().replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1');
      if(url.pathname.endsWith('/data/app-state.json')){await stateReady;body=JSON.stringify(state);}
      return new Response(body,{headers:{'Content-Type':type}});
    }catch{return new Response('Not found',{status:404});}
  }};
  let base;
  const server=http.createServer(async(req,res)=>{
    try {
      const response=await handleGatheringSite(new Request('https://ilymmd.com'+req.url),{GATHERING_SITE});
      if(!response){res.writeHead(404);res.end();return;}
      const headers=Object.fromEntries(response.headers);
      // Keep browser requests local while exercising a real HTTP redirect, not an intercepted one.
      if(headers.location){assert.ok(headers.location.startsWith('https://ilymmd.com/themeyers/'));headers.location=headers.location.replace('https://ilymmd.com',base);}
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
      await page.goto(base+'/themeyersgatherings/?invitation=existing#/signin/account/'+token,{waitUntil:'domcontentloaded'});
      try {
        assert.equal(await page.locator('#meyersLoadingScreen').isVisible(),true);
        assert.equal(await page.locator('#meyersLoadingScreen h1').textContent(),'The Meyers');
        assert.equal(await page.title(),'The Meyers');
        assert.equal(await page.locator('#accountFirstName').isVisible(),false);
      } finally { releaseState(); }
      await page.waitForFunction(()=>typeof qrScopedAccount!=='undefined'&&qrScopedAccount?.name==='Jane Smith');
      assert.equal(page.url(),base+'/themeyers/?invitation=existing#/signin/account/'+token);
      assert.equal(await page.locator('#accountLinkError').isVisible(),false);
      assert.equal(await page.evaluate(()=>accountQrUrl(qrScopedAccount)),base+'/themeyers/#/signin/account/'+token);
      assert.equal(await page.evaluate(()=>generalLoginUrl()),base+'/themeyers/');
      assert.equal(await page.locator('#accountFirstName').isVisible(),true);
      assert.equal(await page.locator('#meyersLoadingScreen').isVisible(),false);
      assert.equal(await page.title(),'The Meyers');
      await page.evaluate(()=>{
        for(const eventId of Object.keys(appState.events)){
          viewedEventId=eventId;state=appState.events[eventId];render();
          if(document.title!=='The Meyers')throw new Error('Gathering changed the browser title');
        }
      });
      assert.equal(await page.evaluate(()=>appState.accounts[0].qrToken),token);
      assert.deepEqual(errors,[]);
      await page.close();console.log('Meyers loading screen, startup, legacy HTTP redirect and account token passed',width);
    }
    const failedPage=await browser.newPage();
    await failedPage.clock.install();
    await failedPage.route('**/*',route=>route.request().url().startsWith(base+'/')&&!route.request().url().endsWith('/app.js')?route.continue():route.abort());
    await failedPage.goto(base+'/themeyers/');
    assert.equal(await failedPage.locator('#meyersLoadingScreen').isVisible(),true);
    await failedPage.clock.fastForward(20001);
    assert.equal(await failedPage.locator('#meyersLoadingScreen').isVisible(),false);
    await failedPage.close();
    console.log('Missing startup script cannot leave a permanent loading screen');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(output,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1);});

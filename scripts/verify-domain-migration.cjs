// Offline browser verification: fulfill every request from a staged bundle, never the live sites.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const os=require('node:os');
(async()=>{
  const {buildDomainSite}=await import(pathToFileURL(path.resolve('scripts/build-domain-site.js')));
  const output=await fs.mkdtemp(path.join(os.tmpdir(),'meyers-domain-browser-'));
  await buildDomainSite(output);
  const state=JSON.parse(await fs.readFile(path.join(output,'themeyers/data/app-state.json'),'utf8'));
  const token='A'.repeat(43);
  state.accounts=[{name:'Jane Smith',qrToken:token,selectedEvents:{wedding:true},invitedEvents:{wedding:true}}];
  const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for(const width of [1280,390]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',async route=>{
        const url=new URL(route.request().url());
        if(url.origin!=='https://ilymmd.com')return route.abort();
        let filename=path.join(output,decodeURIComponent(url.pathname));
        if(url.pathname.endsWith('/'))filename=path.join(filename,'index.html');
        try {
          let body=await fs.readFile(filename);
          const extension=path.extname(filename),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'}[extension]||'application/octet-stream';
          if(extension==='.html')body=body.toString().replace(/(<meta name="shared-state-url" content=")[^"]*/,'$1');
          if(url.pathname.endsWith('/data/app-state.json'))body=JSON.stringify(state);
          return route.fulfill({status:200,body,contentType:type});
        }catch{return route.fulfill({status:404,body:'Not found'});}
      });
      await page.goto('https://ilymmd.com/themeyersgatherings/?invitation=existing#/signin/account/'+token);
      await page.waitForFunction(()=>typeof qrScopedAccount!=='undefined'&&qrScopedAccount?.name==='Jane Smith');
      assert.equal(page.url(),'https://ilymmd.com/themeyers/?invitation=existing#/signin/account/'+token);
      assert.equal(await page.locator('#accountLinkError').isVisible(),false);
      assert.equal(await page.evaluate(()=>accountQrUrl(qrScopedAccount)),'https://ilymmd.com/themeyers/#/signin/account/'+token);
      assert.equal(await page.evaluate(()=>generalLoginUrl()),'https://ilymmd.com/themeyers/');
      assert.equal(await page.locator('#accountFirstName').isVisible(),true);
      assert.equal(await page.evaluate(()=>appState.accounts[0].qrToken),token);
      assert.deepEqual(errors,[]);
      await page.close();console.log('Staged /themeyers assets, legacy QR redirect and account token passed',width);
    }
  }finally{await browser.close();await fs.rm(output,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exit(1);});

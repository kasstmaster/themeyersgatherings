import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';
function fixture(t) {
  const objects = new Map();
  const accounts = [
    { name:'Benjamin Hall IV,Sherri Hall', anyListCategoryId:'hall', selectedEvents:{wedding:true}, signInAliases:[{name:'Benjamin Hall IV',alias:'Ben Hall IV'}] },
    { name:'Julie Smith', anyListCategoryId:'smith', selectedEvents:{wedding:true} },
    { name:'No Access', selectedEvents:{wedding:false} }
  ];
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({sha:'sha',content:Buffer.from(JSON.stringify({accounts})).toString('base64')}));
  t.after(()=>{globalThis.fetch=original;});
  const env={HOST_PASSWORD:'host-secret',GITHUB_REPOSITORY:'owner/data',GITHUB_TOKEN:'test',INVITATION_BACKGROUNDS:{
    async put(key,value,options={}) { const bytes=typeof value==='string'?new TextEncoder().encode(value):new Uint8Array(value);objects.set(key,{bytes,...options}); },
    async get(key,options) {
      const value=objects.get(key);if(!value)return null;
      let body=value.bytes,range;
      if(options?.range){range=options.range;body=body.slice(range.offset,range.offset+range.length);}
      return {...value,body,size:value.bytes.length,range,async text(){return new TextDecoder().decode(value.bytes);}};
    },
    async head(key){const value=objects.get(key);return value?{size:value.bytes.length}:null;},
    async delete(key){objects.delete(key);},
    async list({prefix}){return {objects:[...objects].filter(([key])=>key.startsWith(prefix)).map(([key,value])=>({key,size:value.bytes.length,customMetadata:value.customMetadata})),truncated:false};}
  }};
  const request=(path,token,options={})=>worker.fetch(new Request(`https://worker.example/wedding-media${path}`,{...options,headers:{...options.headers,...(token?{Authorization:`Bearer ${token}`}:{})}}),env);
  const session=async(name,host=false)=>{const r=await request('/session',null,{method:'POST',headers:{'Content-Type':'application/json',...(host?{'X-Host-Password':'host-secret'}:{})},body:JSON.stringify({name})});return {status:r.status,...await r.json()};};
  const upload=(token,name='photo.jpg')=>request(`/upload?name=${name}`,token,{method:'POST',headers:{'Content-Type':'image/jpeg','X-Account-Name':'Spoofed Account'},body:new Uint8Array([1,2,3,4])});
  return {request,session,upload,objects,env};
}
test('private lists and media enforce account ownership; household members share uploads; host sees names and all records',async t=>{
  const f=fixture(t);const ben=await f.session('Ben Hall IV'),sherri=await f.session('Sherri Hall'),julie=await f.session('Julie Smith'),host=await f.session('',true);
  assert.equal(ben.status,200);await f.upload(ben.token);await f.upload(julie.token,'other.jpg');
  const get=async token=>(await (await f.request('/',token)).json()).items;
  const hall=await get(sherri.token);assert.equal(hall.length,1);assert.equal(hall[0].uploadedBy,'Benjamin Hall IV');assert.equal(hall[0].accountName,'Benjamin Hall IV,Sherri Hall');
  assert.equal((await get(julie.token)).length,1);assert.equal((await get(host.token)).length,2);
  assert.equal((await f.request(`/${hall[0].path}`,julie.token)).status,404);
  assert.equal((await f.request(`/${hall[0].path}`,ben.token)).status,200);
  assert.equal((await f.request(`/${hall[0].path}`,host.token)).status,200);
  assert.equal((await f.request(`/${hall[0].path}`,null)).status,401);
  const range=await f.request(`/${hall[0].path}`,ben.token,{headers:{Range:'bytes=1-2'}});assert.equal(range.status,206);assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3]);assert.equal(range.headers.get('Cache-Control'),'private, no-store');
  assert.equal((await f.request(`/${hall[0].path}`,ben.token,{headers:{Range:'bytes=20-30'}})).status,416);
});
test('sharing links are private and validate URL schemes; forged access and expired sessions are rejected',async t=>{
  const f=fixture(t);assert.equal((await f.session('No Access')).status,401);assert.equal((await f.session('Ben Hall V')).status,401);
  const a=await f.session('Julie Smith'),b=await f.session('Sherri Hall');
  const link=url=>f.request('/links',a.token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
  assert.equal((await link('javascript:alert(1)')).status,400);assert.equal((await link('https://dropbox.com/example')).status,201);
  assert.equal((await (await f.request('/',a.token)).json()).items[0].kind,'link');assert.equal((await (await f.request('/',b.token)).json()).items.length,0);
  assert.equal((await f.request('/', 'forged')).status,401);
  const sessionKey=[...f.objects.keys()].find(key=>key.endsWith(a.token));const stored=f.objects.get(sessionKey);stored.bytes=new TextEncoder().encode(JSON.stringify({...JSON.parse(new TextDecoder().decode(stored.bytes)),expires:0}));
  assert.equal((await f.request('/',a.token)).status,401);
});
test('uploads reject unsupported, empty, and oversized files; no storage produces a clear service error',async t=>{
  const f=fixture(t);const s=await f.session('Julie Smith');
  assert.equal((await f.request('/upload',s.token,{method:'POST',headers:{'Content-Type':'text/html'},body:'bad'})).status,415);
  assert.equal((await f.request('/upload',s.token,{method:'POST',headers:{'Content-Type':'image/jpeg'},body:new Uint8Array()})).status,413);
  assert.equal((await f.request('/upload',s.token,{method:'POST',headers:{'Content-Type':'video/mp4','Content-Length':'50000001'},body:'x'})).status,413);
  delete f.env.INVITATION_BACKGROUNDS;
  assert.equal((await f.request('/',s.token)).status,503);
});

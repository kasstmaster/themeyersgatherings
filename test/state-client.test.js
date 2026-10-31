import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const protocol=await readFile(new URL('../shared-state-protocol.js',import.meta.url),'utf8'),client=await readFile(new URL('../state-client.js',import.meta.url),'utf8');
function fixture(fetch){const context=vm.createContext({fetch,structuredClone});vm.runInContext(protocol+client,context);return context.StateClient;}
const initial={events:{one:{items:[],rsvps:[],title:'Old'}},accounts:[]};
test('first-name guest continuation creates no authentication and hidden Host credentials go only in POST bodies',async()=>{
 const requests=[];const api=fixture(async(url,options)=>{requests.push({url,options});const input=JSON.parse(options.body);return input.password==='synthetic-hidden-password-long'?Response.json({role:'host',token:'opaque',revision:'one'}):Response.json({next:'guest'});});
 const guest=await api.signIn('https://test',{role:'first-name',password:'Long guest given name goes here'});assert.equal(guest.next,'guest');assert.equal(api.authenticated,false);assert.equal(api.role,'');
 await api.signIn('https://test',{role:'first-name',password:'synthetic-hidden-password-long'});assert.equal(api.role,'host');assert.equal(api.authenticated,true);
 assert.ok(requests.every(value=>value.url==='https://test/auth/login'&&value.options.method==='POST'));
 assert.ok(!JSON.stringify(api.headers()).includes('synthetic-hidden-password-long'));
});
test('a conflict blocks automatic retries and keeps the original revision until explicit adoption',async()=>{
 const calls=[];const api=fixture(async(url,options)=>{calls.push({url,options});return url.endsWith('/auth/login')?Response.json({token:'runtime-only',role:'host',state:initial,revision:'old'}):Response.json({error:'Conflict'},{status:409});});
 await api.signIn('https://test',{role:'host',password:'not-stored'});api.remember(initial,'old');
 const changed=structuredClone(initial);changed.events.one.title='Local';
 await assert.rejects(()=>api.save('https://test',changed),error=>error.status===409);await assert.rejects(()=>api.save('https://test',changed),error=>error.status===409);
 assert.equal(calls.length,2);assert.equal(calls[1].options.headers['If-Match'],'old');assert.equal(api.conflicted,true);assert.ok(!JSON.stringify(calls[1].options).includes('not-stored'));
});
test('a background read that is not adopted never advances a stale draft’s revision',async()=>{
 let sent;const api=fixture(async(url,options)=>url.endsWith('/auth/login')?Response.json({token:'session',role:'host',revision:'old'}):options.method==='PATCH'?(sent=options,Response.json({revision:'saved'})):Response.json({state:initial,revision:'new'}));
 await api.signIn('https://test',{role:'host',password:'test'});api.remember(initial,'old');await api.read('https://test');
 const changed=structuredClone(initial);changed.events.one.title='Edit';await api.save('https://test',changed);assert.equal(sent.headers['If-Match'],'old');
});
test('guest requests contain only permitted changes and opaque runtime authorization, not full snapshots',async()=>{
 let sent;const api=fixture(async(url,options)=>url.endsWith('/auth/login')?Response.json({token:'opaque',role:'guest',revision:'one'}):(sent=options,Response.json({revision:'two'})));
 await api.signIn('https://test',{role:'guest',name:'Casey Example'});api.remember(initial,'one');
 const changed=structuredClone(initial);changed.events.one.title='Forbidden';changed.events.one.rsvps=[{name:'Casey Example'}];changed.accounts=[{name:'Forged'}];await api.save('https://test',changed);
 const payload=JSON.parse(sent.body);assert.equal(payload.changes.length,1);assert.deepEqual(payload.changes[0].path,['events','one','rsvps']);assert.equal(sent.headers.Authorization,'Bearer opaque');assert.ok(!sent.body.includes('Forbidden'));assert.ok(!sent.body.includes('Forged'));
});
test('an in-flight save preserves subsequent edits for a separate revision-checked request',async()=>{
 let release;const requests=[];const api=fixture(async(url,options)=>{
  if(url.endsWith('/auth/login'))return Response.json({token:'session',role:'host',revision:'first'});
  requests.push(options);if(requests.length===1)await new Promise(resolve=>release=resolve);return Response.json({revision:requests.length===1?'second':'third'});
 });
 await api.signIn('https://test',{role:'host',password:'test'});api.remember(initial,'first');const draft=structuredClone(initial);draft.events.one.title='First edit';const pending=api.save('https://test',draft);draft.events.one.title='Second edit';release();await pending;await api.save('https://test',draft);
 assert.equal(requests[1].headers['If-Match'],'second');assert.equal(JSON.parse(requests[1].body).changes[0].value,'Second edit');
});

test('persistent login uses the first-party bridge without storing tokens, and offline logout blocks restoration',async()=>{
 const stored=new Map(),requests=[];let offline=false;
 const context=vm.createContext({structuredClone,location:{origin:'https://meyer.ilymmd.com'},localStorage:{getItem:key=>stored.get(key),setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)},fetch:async(url,options)=>{requests.push({url,options});if(offline)throw new TypeError('Offline');return Response.json({token:'opaque-runtime-session',role:'guest',person:'Casey Example',state:initial,revision:'one'});}});
 vm.runInContext(protocol+client,context);const api=context.StateClient;
 await api.signIn('https://service',{role:'guest',name:'Casey Example'});assert.equal(requests[0].url,'https://service/auth/login');assert.equal(requests[1].url,'/session/auth/session');assert.equal(stored.size,0);
 await api.resume('https://service','printed-qr');assert.equal(requests[2].url,'/session/auth/session');assert.equal(JSON.parse(requests[2].options.body).qrToken,'printed-qr');
 offline=true;await api.signOut('https://service');assert.equal(api.authenticated,false);assert.equal(stored.size,1);assert.ok(!JSON.stringify([...stored]).includes('opaque-runtime-session'));
 const count=requests.length;assert.equal(await api.resume('https://service'),null);assert.equal(requests.length,count);
});
test('logout supersedes a pending persistent restore',async()=>{
 let release;
 const context=vm.createContext({structuredClone,location:{origin:'https://meyer.ilymmd.com'},fetch:async url=>url.endsWith('/auth/session')?await new Promise(resolve=>release=()=>resolve(Response.json({token:'late-token',role:'host',revision:'one'}))):Response.json({})});
 vm.runInContext(protocol+client,context);const api=context.StateClient,pending=api.resume('https://service');await api.signOut('https://service');release();assert.equal(await pending,null);assert.equal(api.authenticated,false);
});

test('replacing a login persists the new session, never an older runtime authorization',async()=>{
 let count=0;const persisted=[];
 const context=vm.createContext({structuredClone,location:{origin:'https://meyer.ilymmd.com'},fetch:async(url,options)=>{
  if(url.endsWith('/auth/login')){count++;return Response.json({token:'session-'+count,role:count===1?'host':'guest',revision:'one'});}
  persisted.push(options.headers.Authorization);return Response.json({token:options.headers.Authorization.slice(7),role:count===1?'host':'guest',revision:'one'});
 }});vm.runInContext(protocol+client,context);const api=context.StateClient;
 await api.signIn('https://service',{role:'host'});await api.signIn('https://service',{role:'guest'});
 assert.deepEqual(persisted,['Bearer session-1','Bearer session-2']);assert.equal(api.headers().Authorization,'Bearer session-2');assert.equal(api.role,'guest');
});


test('suffix continuation never creates client authentication or cookie persistence',async()=>{
 const calls=[],api=fixture(async(url,options)=>{calls.push({url,options});return Response.json({next:'suffix'});});
 const result=await api.signIn('https://service',{role:'guest',name:'Jamie Example',checkSuffix:true});assert.equal(result.next,'suffix');assert.equal(api.authenticated,false);assert.equal(api.role,'');assert.equal(calls.length,1);
});

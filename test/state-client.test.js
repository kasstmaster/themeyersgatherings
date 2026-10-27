import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const protocol=await readFile(new URL('../shared-state-protocol.js',import.meta.url),'utf8'),client=await readFile(new URL('../state-client.js',import.meta.url),'utf8');
function fixture(fetch){const context=vm.createContext({fetch,structuredClone});vm.runInContext(protocol+client,context);return context.StateClient;}
const initial={events:{one:{items:[],rsvps:[],title:'Old'}},accounts:[]};
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function fixture(fetch){
  const timers=[],storage=new Map([['pending','true']]);
  const status={hidden:true,children:[],append(item){this.children.push(item);},set innerHTML(value){this.html=value;this.children=[];}};
  const context=vm.createContext({fetch,AbortController,TypeError,console:{error(){}},SHARED_STATE_URL:'https://state.test',SHARED_SAVE_PENDING_KEY:'pending',NETWORK_TIMEOUT_MS:10000,SHARED_SAVE_RETRY_DELAYS:[1000,3000],appState:{events:{},accounts:[]},localStorage:{getItem:key=>storage.get(key),removeItem:key=>storage.delete(key)},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},showToast(){},document:{querySelector:()=>status,createElement:()=>({addEventListener(type,fn){this.click=fn;}})},loadSharedState(){}});
  vm.runInContext(source.slice(source.indexOf('let sharedSaveTimer;'),source.indexOf('function stateContentSignature')),context);
  vm.runInContext(source.slice(source.indexOf('function resumeSharedSync()'),source.indexOf("window.addEventListener('focus', resumeSharedSync)")),context);
  return {context,status,timers,storage,run:code=>vm.runInContext(code,context)};
}
test('failed shared save keeps pending state, exposes server detail, and retries successfully',async()=>{
  let calls=0;const f=fixture(async()=>++calls===1?{ok:false,status:409,text:async()=>'The state changed at the same time. Please try again.'}:{ok:true});
  await f.run('saveSharedState()');assert.equal(f.status.hidden,false);assert.match(f.status.children[0].textContent,/HTTP 409.*state changed/);assert.equal(f.storage.get('pending'),'true');assert.equal(f.timers.at(-1).ms,1000);assert.equal(f.timers[0].ms,30000);
  f.status.children[1].click();await f.run('Promise.resolve()');await f.run('Promise.resolve()');assert.equal(calls,2);assert.equal(f.status.hidden,true);assert.equal(f.storage.has('pending'),false);
});
test('returning to a page immediately resumes a pending save',async()=>{
 const f=fixture(async()=>({ok:true}));await f.run('resumeSharedSync()');assert.equal(f.storage.has('pending'),false);
});
test('network failure retains pending data and gives a connection-specific explanation',async()=>{
 const f=fixture(async()=>{throw new TypeError('Failed to fetch');});await f.run('saveSharedState()');assert.match(f.status.children[0].textContent,/could not be reached/);assert.equal(f.storage.has('pending'),true);
});

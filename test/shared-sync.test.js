import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function fixture(save){
 const timers=[],storage=new Map([['pending','true']]),status={hidden:true,children:[],classList:{add(){}},append(value){this.children.push(value);},set innerHTML(value){this.html=value;this.children=[];}};
 const StateClient={authenticated:true,conflicted:false,expired:false,save};
 const context=vm.createContext({StateClient,AbortController,TypeError,console:{error(){}},SHARED_STATE_URL:'https://state.test',SHARED_SAVE_PENDING_KEY:'pending',NETWORK_TIMEOUT_MS:10000,SHARED_SAVE_RETRY_DELAYS:[1000,3000],appState:{events:{},accounts:[]},localStorage:{getItem:key=>storage.get(key),removeItem:key=>storage.delete(key)},setTimeout(fn,ms){timers.push({fn,ms});return timers.length;},clearTimeout(){},showToast(){},activeHostDialog:()=>null,document:{body:{append(){}},querySelector:()=>status,createElement:()=>({addEventListener(type,fn){this.click=fn;}})},loadSharedState(){}});
 vm.runInContext(source.slice(source.indexOf('let sharedSaveTimer;'),source.indexOf('function stateContentSignature')),context);
 vm.runInContext(source.slice(source.indexOf('function resumeSharedSync()'),source.indexOf("window.addEventListener('focus', resumeSharedSync)")),context);
 return {context,status,timers,storage,StateClient,run:code=>vm.runInContext(code,context)};
}
test('a transient save failure retains pending data and retries without losing edits',async()=>{
 let calls=0;const f=fixture(async()=>{if(++calls===1)throw new Error('Service unavailable');});await f.run('saveSharedState()');
 assert.equal(f.storage.get('pending'),'true');assert.equal(f.timers.at(-1).ms,1000);assert.match(f.status.children[0].textContent,/Service unavailable/);
 await f.run('saveSharedState()');assert.equal(calls,2);assert.equal(f.storage.has('pending'),false);
});
test('a conflict retains the draft and does not schedule blind retries',async()=>{
 const f=fixture(async()=>{f.StateClient.conflicted=true;throw new Error('Newer information is available.');});await f.run('saveSharedState()');
 assert.equal(f.storage.get('pending'),'true');assert.equal(f.timers.length,0);assert.match(f.status.html,/local draft/);assert.equal(f.status.children[2].textContent,'Load latest information');
});
test('authentication expiry pauses saves while preserving pending changes',async()=>{
 const f=fixture(async()=>{f.StateClient.expired=true;throw new Error('Sign in again.');});await f.run('saveSharedState()');assert.equal(f.storage.get('pending'),'true');assert.equal(f.timers.length,0);assert.equal(f.status.children[2].textContent,'Sign in again');
});
test('returning to a page resumes a pending transient save',async()=>{const f=fixture(async()=>{});await f.run('resumeSharedSync()');assert.equal(f.storage.has('pending'),false);});

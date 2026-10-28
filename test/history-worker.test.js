import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../github-state-worker/worker.js';
import {hostEnvironment} from './security-fixture.js';
const env={GITHUB_REPOSITORY:'owner/state',GITHUB_TOKEN:'test',GITHUB_BRANCH:'main'};
const initial=()=>({accounts:[{name:'Jane Smith',address:'Old address',invitedEvents:{christmas:true}}],events:{christmas:{eventDate:'2020-12-25',rsvps:[{name:'Jane Smith',adults:1,children:0}],items:[{name:'Ham',claims:['Jane Smith']}]}}});
async function withRepo(run) {
 const original=globalThis.fetch;let state=initial(),writes=0,sha=1;
 globalThis.fetch=async (_url,options={})=>{
  if(options.method==='PUT'){
   const body=JSON.parse(options.body);assert.equal(body.sha,String(sha));state=JSON.parse(Buffer.from(body.content,'base64').toString());sha++;writes++;return Response.json({content:{sha:String(sha)}});
  }
  return Response.json({sha:String(sha),content:Buffer.from(JSON.stringify(state,null,2)+'\n').toString('base64')});
 };
 const authorized=await hostEnvironment({...env});
 const request=(options={})=>worker.fetch(new Request('https://state.example/',{...options,headers:{Authorization:authorized.authorization,...options.headers}}),authorized.env);
 try{await run({env:authorized.env,request,get state(){return state;},get writes(){return writes;}});}finally{globalThis.fetch=original;}
}
test('scheduled archiving works without a browser and never rewrites an existing snapshot',async()=>withRepo(async repo=>{
 await worker.scheduled({},repo.env);assert.equal(repo.writes,1);const snapshot=structuredClone(repo.state.gatheringHistory.christmas['2020-12-25']);
 assert.equal(snapshot.accounts[0].address,'Old address');assert.equal(snapshot.event.items[0].claims[0],'Jane Smith');
 await worker.scheduled({},repo.env);assert.equal(repo.writes,1);assert.deepEqual(repo.state.gatheringHistory.christmas['2020-12-25'],snapshot);
}));
test('a save captures the stored event before incoming deletions and protects history from stale clients',async()=>withRepo(async repo=>{
 const incoming=structuredClone(repo.state);incoming.accounts=[];incoming.events.christmas.eventDate='2030-12-25';incoming.events.christmas.rsvps=[];incoming.events.christmas.items=[];
 const put=async value=>{const current=await (await repo.request()).json();return repo.request({method:'PATCH',headers:{'If-Match':current.revision,'Content-Type':'application/json'},body:JSON.stringify({changes:SharedStateProtocol.changes(current.state,value)})});};
 assert.equal((await put(incoming)).status,200);const snapshot=structuredClone(repo.state.gatheringHistory.christmas['2020-12-25']);assert.equal(snapshot.accounts[0].name,'Jane Smith');
 const stale=structuredClone(repo.state);stale.gatheringHistory.christmas['2020-12-25'].accounts=[];
 assert.equal((await put(stale)).status,200);assert.deepEqual(repo.state.gatheringHistory.christmas['2020-12-25'],snapshot);
 delete stale.gatheringHistory;assert.equal((await put(stale)).status,200);assert.deepEqual(repo.state.gatheringHistory.christmas['2020-12-25'],snapshot);
}));
test('reading a completed event saves and returns its locked history',async()=>withRepo(async repo=>{
 const response=await repo.request();assert.equal(response.status,200);
 const {state}=await response.json();assert.equal(state.gatheringHistory.christmas['2020-12-25'].accounts[0].name,'Jane Smith');assert.equal(repo.writes,1);
}));

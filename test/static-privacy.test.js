import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validatePublicFallback} from '../scripts/build-domain-site.js';
test('shipped application code contains no compiled host password or embedded guest account roster',async()=>{
 const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
 assert.equal(/^const HOST_PASSWORD\b/m.test(source),false,'Host password must be server-only');
 assert.equal(/const GUEST_ACCOUNTS\s*=\s*\[\s*\]/.test(source),true,'No guest names may be compiled into the application');
 const fallback=JSON.parse(await readFile(new URL('../data/app-state.json',import.meta.url),'utf8'));validatePublicFallback(fallback);
});
test('public fallback rejects account, response, claim, QR and archived guest data instead of sanitizing/deleting it',()=>{
 const base={accounts:[],events:{one:{items:[],rsvps:[]}}};validatePublicFallback(base);
 for(const change of [value=>value.accounts.push({name:'Private'}),value=>value.events.one.rsvps.push({name:'Private'}),value=>value.events.one.items.push({claims:['Private']}),value=>value.gatheringHistory={one:{snapshot:{accounts:[{name:'Private'}]}}},value=>value.token={qrToken:'synthetic'}]){const value=structuredClone(base);change(value);assert.throws(()=>validatePublicFallback(value),/Refusing to publish/);}
});

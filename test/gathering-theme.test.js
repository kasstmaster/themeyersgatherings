import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const sync=source.slice(source.indexOf('const DEFAULT_EVENT_DETAILS='),source.indexOf('const GATHERING_COLORS'));
test('neutral custom themes survive metadata refresh without recoloring existing gatherings',()=>{
 const context=vm.createContext({structuredClone,EVENT_DETAILS:{wedding:{theme:'wedding'},thanksgiving:{theme:'thanksgiving'},christmas:{theme:'christmas'},removed:{}}});
 vm.runInContext(sync+`;syncGatheringDefinitions({old:{gatheringName:'Old'},fresh:{gatheringName:'Fresh',gatheringTheme:'neutral'}})`,context);
 assert.equal(context.EVENT_DETAILS.old.theme,'thanksgiving');
 assert.equal(context.EVENT_DETAILS.fresh.theme,'neutral');
 assert.equal(context.EVENT_DETAILS.wedding.theme,'wedding');
 assert.equal(context.EVENT_DETAILS.removed,undefined);
});
test('built-in and new gathering labels follow saved names and reset safely between sessions',()=>{
 const originals={thanksgiving:{name:'Thanksgiving',theme:'thanksgiving',header:'art'},christmas:{name:'Christmas',theme:'christmas'},wedding:{name:'Wedding',theme:'wedding'}};
 const context=vm.createContext({EVENT_DETAILS:structuredClone(originals),structuredClone});vm.runInContext(sync,context);
 context.syncGatheringDefinitions({thanksgiving:{gatheringName:'Family Dinner'},christmas:{gatheringName:'Holiday Dinner'},wedding:{gatheringName:'Our Wedding'},custom:{gatheringName:'Birthday'}});
 assert.equal(context.EVENT_DETAILS.thanksgiving.name,'Family Dinner');assert.equal(context.EVENT_DETAILS.christmas.name,'Holiday Dinner');assert.equal(context.EVENT_DETAILS.wedding.name,'Our Wedding');assert.equal(context.EVENT_DETAILS.custom.name,'Birthday');assert.equal(context.EVENT_DETAILS.thanksgiving.header,'art');
 context.syncGatheringDefinitions({});assert.deepEqual(context.EVENT_DETAILS,originals);
});

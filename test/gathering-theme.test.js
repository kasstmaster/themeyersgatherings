import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const sync=source.slice(source.indexOf('function syncGatheringDefinitions('),source.indexOf('const GATHERING_COLORS'));
test('neutral custom themes survive metadata refresh without recoloring existing gatherings',()=>{
 const context=vm.createContext({EVENT_DETAILS:{wedding:{theme:'wedding'},thanksgiving:{theme:'thanksgiving'},christmas:{theme:'christmas'},removed:{}}});
 vm.runInContext(sync+`;syncGatheringDefinitions({old:{gatheringName:'Old'},fresh:{gatheringName:'Fresh',gatheringTheme:'neutral'}})`,context);
 assert.equal(context.EVENT_DETAILS.old.theme,'thanksgiving');
 assert.equal(context.EVENT_DETAILS.fresh.theme,'neutral');
 assert.equal(context.EVENT_DETAILS.wedding.theme,'wedding');
 assert.equal(context.EVENT_DETAILS.removed,undefined);
});

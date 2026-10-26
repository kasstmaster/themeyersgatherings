import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const context=vm.createContext({URL});
vm.runInContext(source.slice(source.indexOf('function gatheringGalleryUrl('),source.indexOf('// Every gathering uses')),context);
test('shared gallery links remain empty until supplied and reject unsafe destinations',()=>{
 for(const value of [undefined,'','javascript:alert(1)','data:text/html,test','https://user:pass@dropbox.com/folder'])assert.equal(context.gatheringGalleryUrl(value),'');
 assert.equal(context.gatheringGalleryUrl('https://www.dropbox.com/scl/fo/example?dl=0'),'https://www.dropbox.com/scl/fo/example?dl=0');
});

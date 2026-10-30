import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const popupCode=await readFile(new URL('../text-popups.js',import.meta.url),'utf8');
const editorCode=await readFile(new URL('../element-editor.js',import.meta.url),'utf8');
const context=vm.createContext({});vm.runInContext(popupCode,context);
vm.runInContext(editorCode.slice(editorCode.indexOf('  function markup('),editorCode.indexOf('  function boundedTextRange(')),context);
const anchor=(href,payload)=>({nodeType:1,childNodes:[{nodeType:3,textContent:'Read more'}],dataset:{textPopup:payload},getAttribute:()=>href,matches:value=>value.split(',').includes('a')});
test('native and rendered popup links serialize with their own body; normal URLs ignore stale popup attributes',()=>{
 const first=context.TextPopups.encode('First body (and punctuation)'),second=context.TextPopups.encode('Second body');
 assert.equal(context.markup({childNodes:[anchor(first)]}),`[Read more](${first})`);
 assert.equal(context.markup({childNodes:[anchor('#popup-text',first)]}),`[Read more](${first})`);
 assert.equal(context.TextPopups.href(anchor(second,first)),second);
 assert.equal(context.TextPopups.href(anchor('https://example.test',first)),'');
 assert.equal(context.TextPopups.href(null),'');assert.equal(context.TextPopups.decode('#popup-text:%ZZ'),null);
});

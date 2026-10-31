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
test('editing one popup reuses its source field save path without changing another identical link',()=>{
 const body=context.TextPopups.encode('Original body');
 const editableAnchor=()=>({...anchor(body),setAttribute(name,value){this.getAttribute=()=>value;},removeAttribute(){}});
 const first=editableAnchor(),second=editableAnchor(),source={childNodes:[first,{nodeType:3,textContent:' and '},second]};let saved,appearanceWrites=0;
 const record={title:'text',fields:[{type:'textarea',value:''}],commit:values=>{saved=values[0];}};
 const ctx=vm.createContext({TextPopups:context.TextPopups,SiteEditing:{textOwner:()=>source,editorFor:()=>record,persist:action=>action?.()},ElementAppearance:{textParts:()=>[source],storeText:()=>appearanceWrites++}});
 vm.runInContext(editorCode.slice(editorCode.indexOf('  function markup('),editorCode.indexOf('  function boundedTextRange(')),ctx);
 vm.runInContext(editorCode.slice(editorCode.indexOf('  function commitText('),editorCode.indexOf('  function closeSettings(')),ctx);
 ctx.replacePopupText(source,second,'**Updated body**');
 assert.equal(saved,`[Read more](${body}) and [Read more](${context.TextPopups.encode('**Updated body**')})`);
 assert.equal(first.getAttribute('href'),body);assert.equal(record.fields[0].value,saved);assert.equal(appearanceWrites,0);
});
test('popup line spacing accepts only bounded numeric text styles',async()=>{
 const ctx=vm.createContext({});vm.runInContext(await readFile(new URL('../text-styles.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.TextStyles.properties({lineHeight:1.25}),'line-height:1.25');
 for(const value of ['1;color:red',0,6,NaN])assert.equal(ctx.TextStyles.properties({lineHeight:value}),null);
});

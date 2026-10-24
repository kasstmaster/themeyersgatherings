import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../date-text.js',import.meta.url),'utf8');
function fixture(){
 let width=220;const callbacks={};
 const element={textContent:'Wednesday September 30 2026',style:{removeProperty(){delete this.fontSize;}}};
 Object.defineProperties(element,{clientWidth:{get:()=>width},scrollWidth:{get:()=>Math.ceil(element.textContent.length*(parseFloat(element.style.fontSize)||13.12)*.75)}});
 class ResizeObserver{constructor(fn){callbacks.resize=fn;}observe(target){assert.equal(target,element);}}
 class MutationObserver{constructor(fn){callbacks.change=fn;}observe(){}}
 const c=vm.createContext({ResizeObserver,MutationObserver,getComputedStyle:e=>({fontSize:e.style.fontSize||'13.12px'}),document:{body:{},querySelectorAll:selector=>{assert.equal(selector,'#rsvpFirstPageDate');return [element];}},window:{addEventListener:(name,fn)=>{callbacks[name]=fn;}}});
 vm.runInContext(code,c);return {element,callbacks,setWidth:value=>{width=value;},fit:()=>c.DateText.fit(element)};
}
test('shared first-page date fits narrow containers without changing its text',()=>{
 const f=fixture(),text=f.element.textContent;
 assert.ok(f.element.scrollWidth<=f.element.clientWidth);assert.equal(f.element.textContent,text);
 f.setWidth(160);f.callbacks.resize([{target:f.element}]);assert.ok(f.element.scrollWidth<=160);
 f.setWidth(600);f.callbacks.resize([{target:f.element}]);assert.equal(f.element.style.fontSize,undefined);
});
test('hidden dates and changed gathering dates refit when visible or updated',()=>{
 const f=fixture();f.setWidth(0);f.fit();assert.equal(f.element.style.fontSize,undefined);
 f.setWidth(180);f.element.textContent='Wednesday September 30 2037';f.callbacks.change();assert.ok(f.element.scrollWidth<=180);
});

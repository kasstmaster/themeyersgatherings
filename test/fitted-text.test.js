import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../fitted-text.js',import.meta.url),'utf8');
function fixture(){
 let width=220,attached=true;const callbacks={};
 const element={textContent:'Wednesday September 30 2026',style:{removeProperty(name){if(name==='font-size')delete this.fontSize;else delete this[name];},setProperty(name,value){this[name]=value;}}};
 Object.defineProperties(element,{clientWidth:{get:()=>width},scrollWidth:{get:()=>Math.ceil(element.textContent.length*(element.fixedFontSize?element.fixedFontSize*Number(element.style['--fitted-text-scale']||1):(parseFloat(element.style.fontSize)||13.12))*.75)}});
 class ResizeObserver{constructor(fn){callbacks.resize=fn;}observe(target){assert.equal(target,element);}unobserve(target){assert.equal(target,element);callbacks.removed=(callbacks.removed||0)+1;}}
 class MutationObserver{constructor(fn){callbacks.change=fn;}observe(){}}
 const c=vm.createContext({ResizeObserver,MutationObserver,getComputedStyle:e=>({fontSize:e.style.fontSize||'13.12px'}),document:{body:{},querySelectorAll:selector=>{assert.ok(selector.includes('#rsvpFirstPageDate'));assert.ok(selector.includes('#rsvpDialog h2'));assert.ok(selector.includes('#rsvpDialog legend'));return attached?[element]:[];}},window:{addEventListener:(name,fn)=>{callbacks[name]=fn;}}});
 vm.runInContext(code,c);return {element,callbacks,setWidth:value=>{width=value;},fit:()=>c.FittedText.fit(element),remove:()=>{attached=false;element.isConnected=false;}};
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

test('date uses the largest fitting size and changes smoothly as the container narrows',()=>{
 const f=fixture();let previous=Infinity;
 for(const width of [420,400,380,360,340,320,300,280,260,240,220,200,180,160]){
  f.setWidth(width);f.fit();const size=parseFloat(f.element.style.fontSize)||13.12;
  assert.ok(f.element.scrollWidth<=width);
  assert.ok(size<=previous+.05);assert.ok(previous===Infinity||previous-size<1.1);
  if(size<13.12){f.element.style.fontSize=`${size+.1}px`;assert.ok(f.element.scrollWidth>width,'a larger size must overflow');}
  previous=size;
 }
});

test('the shared fitter also keeps long RSVP headings and legends at the largest fitting size',()=>{
 for(const tagName of ['H1','H2','H3','H4','H5','H6','LEGEND']){
  const f=fixture();f.element.tagName=tagName;f.element.textContent='Will you be bringing a dish to share?';f.setWidth(210);f.fit();
  const fitted=parseFloat(f.element.style.fontSize);assert.ok(f.element.scrollWidth<=210,tagName);
  f.element.style.fontSize=`${fitted+.1}px`;assert.ok(f.element.scrollWidth>210,tagName);
  f.setWidth(900);f.fit();assert.equal(f.element.style.fontSize,undefined);
 }
});

test('removed dynamic headings stop being observed across repeated redraws',()=>{
 const f=fixture();f.remove();f.callbacks.change();f.callbacks.change();assert.equal(f.callbacks.removed,1);
});

test('explicitly styled title text scales with the shared largest-fit calculation',()=>{
 const f=fixture();f.element.fixedFontSize=40;f.setWidth(220);f.fit();assert.ok(f.element.scrollWidth<=220);assert.ok(Number(f.element.style['--fitted-text-scale'])<1);
 f.setWidth(1000);f.fit();assert.equal(f.element.style['--fitted-text-scale'],undefined);
});

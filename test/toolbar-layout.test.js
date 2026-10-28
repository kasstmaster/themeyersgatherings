import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../toolbar-layout.js',import.meta.url),'utf8');
test('bottom clearance follows visible fixed toolbar height and mobile safe-area changes',()=>{
 let queued,resize,mutation,viewport;const values=new Map();
 const bar={height:64,visible:true,isConnected:true,getBoundingClientRect(){return {height:this.height};},getClientRects(){return this.visible?[{}]:[];}};
 const context=vm.createContext({document:{body:{style:{getPropertyValue:key=>values.get(key),setProperty:(key,value)=>values.set(key,value)}},querySelectorAll:()=>[bar]},getComputedStyle:()=>({position:'fixed'}),requestAnimationFrame:fn=>{queued=fn;return 1;},ResizeObserver:class{constructor(fn){resize=fn;}observe(){}unobserve(){}},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}},window:{addEventListener(){},visualViewport:{addEventListener:(name,fn)=>{viewport=fn;}}}});
 vm.runInContext(code,context);queued();assert.equal(values.get('--toolbar-clearance'),'80px');
 bar.height=112;resize();queued();assert.equal(values.get('--toolbar-clearance'),'128px');
 bar.visible=false;mutation();queued();assert.equal(values.get('--toolbar-clearance'),'0px');
 bar.visible=true;bar.height=90;viewport();queued();assert.equal(values.get('--toolbar-clearance'),'106px');
});

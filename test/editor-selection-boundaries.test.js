import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../element-editor.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('  function boundedTextRange('),source.indexOf('  function rememberSelection('));
function fixture(){
 const inside={},outside={},owner={isConnected:true,contains:node=>node===inside||node===owner},target={isConnected:true,contains:node=>node===owner};
 const context=vm.createContext({target,editables:[owner],document:{createRange:()=>({startContainer:owner,startOffset:0,endContainer:owner,endOffset:3,selectNodeContents(){}})}});vm.runInContext(code,context);
 const range=(start,end)=>({startContainer:start,startOffset:1,endContainer:end,endOffset:2,cloneRange(){return {...this,setStart(node,offset){this.startContainer=node;this.startOffset=offset;},setEnd(node,offset){this.endContainer=node;this.endOffset=offset;}};}});
 return {inside,outside,owner,target,bound:range=>context.boundedTextRange(range),range};
}
test('formatting clamps either edge of a selection to its selected text box',()=>{
 const f=fixture(),original=f.range(f.inside,f.outside),end=f.bound(original);assert.equal(end.endContainer,f.owner);assert.equal(end.endOffset,3);assert.equal(original.endContainer,f.outside);
 const start=f.bound(f.range(f.outside,f.inside));assert.equal(start.startContainer,f.owner);assert.equal(start.startOffset,0);assert.equal(start.endContainer,f.inside);
});
test('formatting rejects unrelated or detached text ranges after page switches',()=>{
 const f=fixture();assert.equal(f.bound(f.range(f.outside,f.outside)),null);f.owner.isConnected=false;assert.equal(f.bound(f.range(f.inside,f.inside)),null);f.owner.isConnected=true;f.target.isConnected=false;assert.equal(f.bound(f.range(f.inside,f.inside)),null);
});

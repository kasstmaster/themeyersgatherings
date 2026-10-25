import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../gathering-palette.js',import.meta.url),'utf8');
const isColor=value=>/^(?:#[\da-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|red|white|black|transparent)$/i.test(value);
function declaration(values,important=[]){const keys=Object.keys(values);return {length:keys.length,item:index=>keys[index],getPropertyValue:key=>values[key],getPropertyPriority:key=>important.includes(key)?'important':''};}
function rule(selector,values,important=[]){return {selectorText:selector,style:declaration(values,important),cssRules:[],cssText:selector+'{}'};}
function fixture(rules=[]){
 const makeStyle=()=>({values:new Map(),[Symbol.iterator](){return this.values.keys();},setProperty(key,value){this.values.set(key,key==='color'?value.replace(/,\s*/g,', '):value);},getPropertyValue(key){return this.values.get(key)||'';},getPropertyPriority(){return '';},removeProperty(key){this.values.delete(key);}});
 const html={style:makeStyle()},body={style:makeStyle()},created=[],observers=[];
 const document={documentElement:html,body,styleSheets:[{href:'styles.css',cssRules:rules}],head:{append:node=>created.push(node)},createElement:tag=>({tagName:tag,style:makeStyle(),textContent:''}),querySelectorAll:()=>[]};
 const context=vm.createContext({CSS:{supports:(property,value)=>isColor(value)},document,MutationObserver:class {constructor(callback){observers.push(callback);}observe(){}}});
 vm.runInContext(code,context);return {api:context.GatheringPalette,html,body,created,observers,makeStyle};
}
test('all literal colors are exposed, including gradient stops, shadows, transparency and fallbacks',()=>{
 const {api}=fixture();const seen=[];
 const value='linear-gradient(white,rgba(10,20,30,.4)),url("data:image/svg+xml,%3Csvg fill=\"red\"%3E") 0 0 / cover var(--base,#abc)';
 const output=api.replaceColors(value,(color,slot)=>{seen.push([color,slot]);return `var(--test-${slot},${color})`;},isColor);
 assert.deepEqual(seen,[['white',0],['rgba(10,20,30,.4)',1],['#abc',2]]);
 assert.match(output,/var\(--test-1,rgba\(10,20,30,.4\)\)/);
 assert.ok(output.includes('url("data:image/svg+xml,%3Csvg fill=\"red\"%3E")'));
 const shadows=[];api.replaceColors('0 2px 4px #0008,0 0 3px black',color=>{shadows.push(color);return color;},isColor);
 assert.deepEqual(shadows,['#0008','black']);
});
test('nested theme, hover and disabled rules retain selectors, conditions and priorities',()=>{
 const {api}=fixture();
 const sheets=[{href:'styles.css',cssRules:[
  rule(':root',{'--base':'#123456'}),
  {cssText:'@media (max-width: 600px) {}',cssRules:[rule('.theme-wedding .tabs:hover',{background:'rgba(1,2,3,.7)',color:'white'},['color'])]},
  rule('button:disabled',{opacity:'0.4',border:'1px solid #abc'})
 ]}];
 const compiled=api.compileSheets(sheets,isColor);
 assert.equal(compiled.entries.size,5);
 assert.match(compiled.css,/@media \(max-width: 600px\)\{.theme-wedding .tabs:hover/);
 assert.match(compiled.css,/color:var\([^;]+white\)!important/);
 assert.match(compiled.css,/opacity:var\([^;]+,0.4\)/);
 assert.deepEqual(Array.from(compiled.entries.keys()),Array.from(api.compileSheets(sheets,isColor).entries.keys()));
});
test('aliased and inherited element colors have independent editable controls',()=>{
 const {api}=fixture();
 const compiled=api.compileSheets([{cssRules:[rule('.tab',{background:'var(--tab-surface)',color:'inherit',border:'1px solid var(--border)'})]}],isColor);
 assert.equal(compiled.entries.size,3);
 assert.deepEqual(Array.from(compiled.entries.values(),entry=>entry.property),['background-color','color','border-color']);
 assert.equal(compiled.css.trim(),''); // Untouched aliases stay entirely unchanged.
});
test('per-gathering color and opacity changes clear on switching gatherings, including root variables',()=>{
 const rules=[rule(':root',{'--base':'#123456'}),rule('.tab',{opacity:'0.5',background:'var(--tab-surface)'})];
 const f=fixture(rules),entries=Array.from(f.api.compileSheets([{href:'styles.css',cssRules:rules}],isColor).entries.values());
 const literal=entries.find(entry=>entry.property==='--base'),opacity=entries.find(entry=>entry.kind==='opacity'),reference=entries.find(entry=>entry.kind==='reference');
 f.api.apply({[literal.key]:'#abcdef',[opacity.key]:'0.25',[reference.key]:'rgba(1,2,3,0.6)'});
 assert.equal(f.html.style.values.get(literal.variable),'#abcdef');
 assert.equal(f.body.style.values.get(opacity.variable),'0.25');
 assert.match(f.created.find(node=>node.id==='gatheringPaletteOverrides').textContent,/.tab\{background-color:rgba\(1,2,3,0.6\)\}/);
 f.api.apply({});assert.equal(f.html.style.values.size,0);assert.equal(f.body.style.values.size,0);
 assert.equal(f.created.find(node=>node.id==='gatheringPaletteOverrides').textContent,'');
});
test('animation overrides preserve the complete keyframes including transforms',()=>{
 const {api}=fixture();
 const frame=(keyText,values)=>({keyText,style:declaration(values),cssText:keyText+'{}'});
 const compiled=api.compileSheets([{cssRules:[{cssText:'@keyframes sparkle {}',cssRules:[frame('0%',{opacity:'0',transform:'translateX(0)'}),frame('100%',{opacity:'1',transform:'translateX(100px)'})]}]}],isColor);
 assert.match(compiled.css,/@keyframes sparkle/);
 assert.match(compiled.css,/transform:translateX\(0\)/);
 assert.match(compiled.css,/transform:translateX\(100px\)/);
});

test('inline colors are discovered once even when CSS serialization adds whitespace',()=>{
 const f=fixture();f.api.apply({});
 const element={id:'dynamic-content',isConnected:true,style:f.makeStyle(),closest:()=>null};
 element.style.setProperty('color','rgb(12,34,56)');
 const record=[{type:'attributes',target:element,addedNodes:[]}];
 f.observers[0](record);
 const converted=element.style.getPropertyValue('color');
 assert.match(converted,/var\(--gathering-detail-/);
 f.observers[0](record);
 assert.equal(element.style.getPropertyValue('color'),converted);
});

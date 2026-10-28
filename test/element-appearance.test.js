import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const textStyles=await readFile(new URL('../text-styles.js',import.meta.url),'utf8');
const source=await readFile(new URL('../element-appearance.js',import.meta.url),'utf8');
function fixture(observed=false){
 let notify;const frames=[];
 const values=new Map([['color',{value:'#112233',priority:''}]]);
 const element={style:{getPropertyValue:key=>values.get(key)?.value || '',getPropertyPriority:key=>values.get(key)?.priority || '',setProperty:(key,value,priority)=>values.set(key,{value,priority}),removeProperty:key=>values.delete(key)}};
 const body={classList:{toggle(){}}};
 const document={body,baseURI:'https://example.test/',addEventListener(){},querySelectorAll:path=>path==='#panel'?[element]:[]};
 const context=vm.createContext({ElementEditor:{render(){}},...(observed?{MutationObserver:class{constructor(fn){notify=fn;}observe(){}disconnect(){}},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;}}:{}),document,URL,Element:class{},CSS:{escape:value=>value}});vm.runInContext(textStyles,context);vm.runInContext(source,context);
 return {api:context.ElementAppearance,element,values,notify:records=>notify(records),frames};
}
test('element colors, alpha and borders apply to guests and restore between gatherings',()=>{
 const f=fixture();f.api.render({state:{elementAppearance:{'#panel':{backgroundColor:'#123456',backgroundAlpha:40,textColor:'#abcdef',borderColor:'#aabbcc',borderWidth:2}}},host:false,enabled:false,eventId:'one'});
 assert.equal(f.values.get('background-color').value,'rgba(18,52,86,0.4)');assert.equal(f.values.get('color').value,'rgba(171,205,239,1)');assert.equal(f.values.get('border-width').value,'2px');assert.equal(f.values.get('background-image').value,'none');
 f.api.render({state:{},host:false,enabled:false,eventId:'new-gathering'});assert.equal(f.values.get('color').value,'#112233');assert.equal(f.values.has('background-color'),false);assert.equal(f.values.has('border-width'),false);
});
test('background images use only safe web URLs and preserve image fitting',()=>{
 const f=fixture();assert.equal(f.api.imageUrl('javascript:alert(1)'),null);assert.equal(f.api.imageUrl('data:text/html,example'),null);assert.equal(f.api.imageUrl('/image.png'),'https://example.test/image.png');
 f.api.render({state:{elementAppearance:{'#panel':{backgroundImage:'https://example.test/image.png',imageFit:'contain'}}},host:false});assert.match(f.values.get('background-image').value,/https:\/\/example.test\/image.png/);assert.equal(f.values.get('background-size').value,'contain');
 f.api.render({state:{elementAppearance:{'#panel':{backgroundImage:'javascript:alert(1)'}}},host:false});assert.equal(f.values.has('background-image'),false);
});
test('hex and computed colors preserve transparency',()=>{
 const {api}=fixture();assert.equal(api.colorParts('#123').hex,'#112233');assert.equal(api.colorParts('#12345680').alpha,50);assert.equal(api.colorParts('rgba(255, 128, 0, 0.25)').hex,'#ff8000');assert.equal(api.colorParts('rgba(255, 128, 0, 0.25)').alpha,25);assert.equal(api.colorParts('transparent').alpha,0);
});
test('guests cannot change appearance through the shared editor API',()=>{const f=fixture();const state={};f.api.render({state,host:false,enabled:false});f.api.update(f.element,{backgroundColor:'#abcdef'});assert.deepEqual(state,{});});
test('page content keys separate heading text without splitting gathering-wide title/intro formatting groups',()=>{
 const {api}=fixture(),heading=key=>({id:'weddingPartyHeading',tagName:'H2',dataset:{contentKey:key},closest:()=>null,matches:selector=>selector.split(',').includes('h2')});
 const one=heading('one'),two=heading('two');assert.notEqual(api.textSelector(one),api.textSelector(two));assert.equal(api.selector(one),api.selector(two));assert.equal(api.group(one),'titles');assert.equal(api.group(two),'titles');
 const state={};api.render({state,host:true,enabled:true,save(){}});api.update(one,{fontSize:28});assert.equal(state.elementAppearance['@group:titles'].fontSize,28);
});
test('menu action styles are shared by claim status independently of other buttons',()=>{
 const {api}=fixture();
 const button=status=>({dataset:{dishStatus:status},matches:selector=>selector==='button[data-claim]' || selector==='button',closest:()=>null});
 assert.equal(api.group(button('available')),'dish-available');
 assert.equal(api.group(button('claimed')),'dish-claimed');
 assert.equal(api.group(button('bringing')),'dish-bringing');
 assert.equal(api.group({matches:selector=>selector.split(',').includes('button'),closest:()=>null}),'buttons');
});


test('safe text effects apply and restore without changing another gathering',()=>{
 const f=fixture();f.api.render({state:{elementAppearance:{'#panel':{textShadowEnabled:true,textShadowColor:'#123456',textShadowAlpha:50,textShadowX:-2,textShadowY:3,textShadowBlur:4,textOutlineColor:'#abcdef',textOutlineWidth:1.5}}},host:false});
 assert.equal(f.values.get('text-shadow').value,'-2px 3px 4px #12345680');assert.equal(f.values.get('-webkit-text-stroke-width').value,'1.5px');
 f.api.render({state:{},host:false});assert.equal(f.values.has('text-shadow'),false);assert.equal(f.values.has('-webkit-text-stroke-width'),false);
});


test('keystrokes and editor control mutations never repaint the gathering',()=>{
 const f=fixture(true);f.api.render({state:{elementAppearance:{'#panel':{backgroundColor:'#123456'}}},host:false});
 const ignored={closest:()=>true};
 for(let i=0;i<100;i++)f.notify([{type:'childList',target:ignored,addedNodes:[{nodeType:3}],removedNodes:[]}]);
 assert.equal(f.frames.length,0);
 const addedGap={nodeType:1,matches:()=>true};f.notify([{type:'childList',target:{closest:()=>false},addedNodes:[addedGap],removedNodes:[]}]);assert.equal(f.frames.length,0);
});
test('real page mutations are batched and saved styles still reach new content',()=>{
 const f=fixture(true);f.api.render({state:{elementAppearance:{'#panel':{backgroundColor:'#123456'}}},host:false});
 const record={type:'childList',target:{closest:()=>false},addedNodes:[{nodeType:1,matches:()=>false}],removedNodes:[]};
 f.values.delete('background-color');for(let i=0;i<100;i++)f.notify([record]);
 assert.equal(f.frames.length,1);f.frames.shift()();assert.equal(f.values.get('background-color').value,'rgba(18,52,86,1)');
 const target={closest:()=>false,getAttribute:()=> 'false'};f.notify([{type:'attributes',target,attributeName:'aria-pressed',oldValue:'false'}]);assert.equal(f.frames.length,0);
 f.notify([{type:'attributes',target,attributeName:'aria-pressed',oldValue:'true'}]);assert.equal(f.frames.length,1);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../element-appearance.js',import.meta.url),'utf8');
function fixture(){
 const values=new Map([['color',{value:'#112233',priority:''}]]);
 const element={style:{getPropertyValue:key=>values.get(key)?.value || '',getPropertyPriority:key=>values.get(key)?.priority || '',setProperty:(key,value,priority)=>values.set(key,{value,priority}),removeProperty:key=>values.delete(key)}};
 const body={classList:{toggle(){}}};
 const document={body,baseURI:'https://example.test/',addEventListener(){},querySelectorAll:path=>path==='#panel'?[element]:[]};
 const context=vm.createContext({ElementEditor:{render(){}},document,URL,Element:class{},CSS:{escape:value=>value}});vm.runInContext(source,context);
 return {api:context.ElementAppearance,element,values};
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

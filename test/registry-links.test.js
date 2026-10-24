import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const start=source.indexOf("  const registryButton = document.querySelector('#registryButton');");
const code=source.slice(start,source.indexOf('\n}\n\n// Standard gatherings',start));
function fixture(){
 const link=()=>{const attributes={};return {attributes,set href(value){attributes.href=value;},get href(){return attributes.href;},setAttribute:(key,value)=>{attributes[key]=value;},removeAttribute:key=>{delete attributes[key];},classList:{toggle(){}}};};
 const registry=link(),gift=link();const c=vm.createContext({document:{querySelector:selector=>selector==='#registryButton'?registry:gift}});
 vm.runInContext('function renderLinks(state,hostView){'+code+'}',c);return {registry,gift,render:state=>c.renderLinks(state,false)};
}
test('unavailable Registry actions have no keyboard-activatable placeholder link',()=>{
 const f=fixture();f.render({registryUrl:'',monetaryGiftUrl:''});
 for(const link of [f.registry,f.gift]){assert.equal(link.href,undefined);assert.equal(link.attributes.tabindex,'-1');assert.equal(link.attributes['aria-disabled'],'true');}
});
test('Registry actions reenable correctly when URLs are added and clear old URLs when removed',()=>{
 const f=fixture();const urls={registryUrl:'https://example.com/registry',monetaryGiftUrl:'https://example.com/gift'};f.render(urls);
 assert.equal(f.registry.href,urls.registryUrl);assert.equal(f.gift.href,urls.monetaryGiftUrl);
 for(const link of [f.registry,f.gift]){assert.equal(link.attributes.tabindex,'0');assert.equal(link.attributes['aria-disabled'],'false');}
 f.render({registryUrl:'',monetaryGiftUrl:''});assert.equal(f.registry.href,undefined);assert.equal(f.gift.href,undefined);
 f.render(urls);assert.equal(f.registry.href,urls.registryUrl);
});

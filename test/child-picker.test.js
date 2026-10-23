import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
await import('../child-picker.js');
await import('../gathering-features.js');
test('known children and repeatable custom names determine the child count',()=>{
 const picker=ChildPicker.create(['Johnny','Jason']);
 assert.deepEqual(ChildPicker.names(picker),[]);
 ChildPicker.toggle(picker,0,true);ChildPicker.toggle(picker,1,true);ChildPicker.add(picker);
 assert.deepEqual(ChildPicker.names(picker),['Johnny','Jason','']);
 picker.custom[0]='Cousin';ChildPicker.add(picker);picker.custom[1]='Another Cousin';
 ChildPicker.remove(picker,0);
 assert.deepEqual(ChildPicker.names(picker),['Johnny','Jason','Another Cousin']);
 ChildPicker.toggle(picker,0,false);
 assert.deepEqual(ChildPicker.names(picker),['Jason','Another Cousin']);
 ChildPicker.clear(picker);assert.deepEqual(ChildPicker.names(picker),[]);
});
test('saved names preselect account children and retain additional children',()=>{
 const picker=ChildPicker.create([' Johnny ','Jason','johnny'],['Jason','Cousin']);
 assert.equal(picker.known.length,2);assert.deepEqual(picker.selected,['Jason']);
 assert.deepEqual(ChildPicker.names(picker),['Jason','Cousin']);
});
test('child and guest add/remove operations keep names within the existing limit',()=>{
 const picker=ChildPicker.create([]);
 for(let i=0;i<25;i++)ChildPicker.add(picker);
 assert.equal(ChildPicker.names(picker).length,20);
 ChildPicker.remove(picker,0);assert.equal(ChildPicker.names(picker).length,19);
 ChildPicker.clear(picker);assert.equal(ChildPicker.names(picker).length,0);
});
test('wedding meal selections follow children when checkbox selection changes their order',()=>{
 const meals=[{type:'adult',name:'Parent',meal:'A'},{type:'child',index:0,meal:'B'},{type:'child',index:1,meal:'C'}];
 assert.deepEqual(ChildPicker.remapMeals(['Johnny','Jason'],['Jason','Cousin'],meals),[meals[0],{type:'child',index:0,meal:'C'}]);
 assert.deepEqual(ChildPicker.remapMeals([],[''],[{type:'child',index:0,meal:'Legacy'}]),[{type:'child',index:0,meal:'Legacy'}]);
});
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function fixture(eventId='thanksgiving'){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{innerHTML:'',value:0,handlers:{},addEventListener(type,handler){this.handlers[type]=handler;},focus(){}});return nodes.get(id);}
 const context=vm.createContext({ChildPicker,document:{querySelector:node},escapeHtml:value=>value,escapeAttribute:value=>value,media:[],captureRsvpMeals:()=>[],renderWeddingRsvpMenu:()=>{},GatheringFeatures,viewedEventId:eventId,RsvpFlow:{refresh(){}}});
 vm.runInContext(source.slice(source.indexOf('let rsvpChildPicker='),source.indexOf('let rsvpMealDraft = [];'))+'let rsvpMealDraft=[];rsvpChildPicker=ChildPicker.create(["Johnny","Jason"]);renderRsvpChildNames();renderRsvpGuests();',context);
 const change=(id,attribute,dataset={},checked=true)=>node(id).handlers.change({target:{dataset,checked,matches:selector=>selector.includes(`[${attribute}]`)}});
 return {context,node,change};
}
test('child choices show No Children and a repeatable Another child, without a counter',()=>{
 const {context,node,change}=fixture();const container=node('#rsvpChildNames');
 assert.match(container.innerHTML,/No Children/);assert.match(container.innerHTML,/Another child/);
 assert.doesNotMatch(container.innerHTML,/data-rsvp-child-name=/);
 change('#rsvpChildNames','data-rsvp-known-child',{rsvpKnownChild:'0'});
 change('#rsvpChildNames','data-rsvp-known-child',{rsvpKnownChild:'1'});
 change('#rsvpChildNames','data-rsvp-add-child');
 assert.equal(node('#children').value,3);
 assert.equal((container.innerHTML.match(/data-rsvp-child-name=/g)||[]).length,1);
 assert.equal((container.innerHTML.match(/data-rsvp-add-child/g)||[]).length,1);
 assert.match(container.innerHTML,/Additional Child’s Name/);
 change('#rsvpChildNames','data-rsvp-add-child');assert.equal(node('#children').value,4);
 assert.match(container.innerHTML,/type="checkbox" data-remove-rsvp-child="0" checked/);
 assert.doesNotMatch(container.innerHTML,/×|<button/);
 change('#rsvpChildNames','data-remove-rsvp-child',{removeRsvpChild:'0'},false);
 assert.equal(node('#children').value,3);
 change('#rsvpChildNames','data-rsvp-no-children');
 assert.equal(node('#children').value,0);assert.deepEqual(Array.from(context.readRsvpChildNames()),[]);
});
test('guest choice becomes a name field and leaves another-guest option',()=>{
 const {context,node,change}=fixture();const container=node('#rsvpGuestNames');
 assert.match(container.innerHTML,/We aren’t bringing a guest/);assert.match(container.innerHTML,/Yes we’re bringing a guest/);
 change('#rsvpGuestNames','data-rsvp-add-guest');
 assert.match(container.innerHTML,/Guest’s Name/);assert.match(container.innerHTML,/We’re bringing another guest/);
 assert.equal(node('#extraGuests').value,1);
 node('#rsvpGuestNames').handlers.input({target:{dataset:{rsvpGuestName:'0'},value:'Guest One',matches:()=>true}});
 change('#rsvpGuestNames','data-rsvp-add-guest');
 assert.equal(node('#extraGuests').value,2);assert.deepEqual(Array.from(context.readRsvpGuestNames()),['Guest One','']);
 assert.match(container.innerHTML,/type="checkbox" data-remove-rsvp-guest="1" checked/);
 assert.doesNotMatch(container.innerHTML,/×|<button/);
 change('#rsvpGuestNames','data-remove-rsvp-guest',{removeRsvpGuest:'1'},false);
 assert.equal(node('#extraGuests').value,1);assert.deepEqual(Array.from(context.readRsvpGuestNames()),['Guest One']);
 change('#rsvpGuestNames','data-rsvp-no-guests');
 assert.equal(node('#extraGuests').value,0);assert.deepEqual(Array.from(context.readRsvpGuestNames()),[]);
});

test('all existing and new standard gatherings use the same child and guest renderers',()=>{
 for(const eventId of ['thanksgiving','christmas','new-custom-gathering']){
  const {node,change}=fixture(eventId);
  change('#rsvpChildNames','data-rsvp-add-child');
  change('#rsvpGuestNames','data-rsvp-add-guest');
  assert.equal(node('#children').value,1);
  assert.equal(node('#extraGuests').value,1);
  assert.match(node('#rsvpChildNames').innerHTML,/Additional Child’s Name/);
  assert.match(node('#rsvpGuestNames').innerHTML,/We’re bringing another guest/);
 }
 const wedding=fixture('wedding');
 wedding.change('#rsvpChildNames','data-rsvp-known-child',{rsvpKnownChild:'0'});
 assert.equal(wedding.node('#children').value,1);
 assert.equal(wedding.node('#rsvpGuestsCounter').hidden,true);
});
test('child and guest choices replace numeric steppers in the shared RSVP markup',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.doesNotMatch(html,/data-target="(?:children|extraGuests)"/);
 assert.match(html,/<output id="children" hidden>/);
 assert.match(html,/<div id="rsvpGuestNames"><\/div>/);
 const saved=ChildPicker.create([],['Guest One','Guest Two']);
 assert.deepEqual(ChildPicker.names(saved),['Guest One','Guest Two']);
});

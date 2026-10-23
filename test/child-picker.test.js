import test from 'node:test';
import assert from 'node:assert/strict';
await import('../child-picker.js');
test('account checkboxes replace custom slots within the chosen child count',()=>{
 const picker=ChildPicker.create(['Tommy','Johnny']);
 assert.deepEqual(ChildPicker.names(picker,3),['','','']);
 ChildPicker.toggle(picker,0,true,3);
 assert.deepEqual(ChildPicker.names(picker,3),['Tommy','','']);
 ChildPicker.toggle(picker,1,true,3);
 assert.deepEqual(ChildPicker.names(picker,3),['Tommy','Johnny','']);
 picker.custom[0]='Cousin';
 assert.deepEqual(ChildPicker.names(picker,3),['Tommy','Johnny','Cousin']);
 ChildPicker.toggle(picker,0,false,3);
 assert.deepEqual(ChildPicker.names(picker,3),['Johnny','Cousin','']);
});
test('saved names preselect account children and retain additional children',()=>{
 const picker=ChildPicker.create([' Tommy ','Johnny','tommy'],['Johnny','Cousin']);
 assert.equal(picker.known.length,2);
 assert.deepEqual(picker.selected,['Johnny']);
 assert.deepEqual(ChildPicker.names(picker,2),['Johnny','Cousin']);
});
test('count reductions prevent over-selection and preserve custom drafts when expanded',()=>{
 const picker=ChildPicker.create(['Tommy','Johnny'],['Tommy','Johnny','Cousin']);
 ChildPicker.resize(picker,1);
 assert.deepEqual(ChildPicker.names(picker,1),['Tommy']);
 ChildPicker.toggle(picker,1,true,1);
 assert.deepEqual(ChildPicker.names(picker,1),['Tommy']);
 ChildPicker.resize(picker,0);
 assert.deepEqual(ChildPicker.names(picker,0),[]);
 assert.deepEqual(ChildPicker.names(picker,1),['Cousin']);
});
test('wedding meal selections follow children when checkbox selection changes their order',()=>{
 const meals=[{type:'adult',name:'Parent',meal:'A'},{type:'child',index:0,meal:'B'},{type:'child',index:1,meal:'C'}];
 assert.deepEqual(ChildPicker.remapMeals(['Tommy','Johnny'],['Johnny','Cousin'],meals),[
  meals[0],{type:'child',index:0,meal:'C'}
 ]);
 assert.deepEqual(ChildPicker.remapMeals([],[''],[{type:'child',index:0,meal:'Legacy'}]),[{type:'child',index:0,meal:'Legacy'}]);
});

test('RSVP rendering replaces one input per checked account child on the count screen',async()=>{
 const {readFile}=await import('node:fs/promises');
 const {default:vm}=await import('node:vm');
 const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
 const container={innerHTML:'',hidden:true},count={value:3};
 const context=vm.createContext({ChildPicker,document:{querySelector:selector=>selector==='#children'?count:container},escapeHtml:value=>value,escapeAttribute:value=>value});
 const start=source.indexOf('let rsvpChildPicker=');
 const end=source.indexOf('function refreshRsvpChildMeals(',start);
 vm.runInContext(source.slice(start,end)+"rsvpChildPicker=ChildPicker.create(['Tommy','Johnny']);renderRsvpChildNames();",context);
 const inputs=()=>[...container.innerHTML.matchAll(/data-rsvp-child-name=/g)].length;
 assert.equal(inputs(),3);
 vm.runInContext('ChildPicker.toggle(rsvpChildPicker,0,true,3);renderRsvpChildNames();',context);
 assert.equal(inputs(),2);
 vm.runInContext('ChildPicker.toggle(rsvpChildPicker,1,true,3);renderRsvpChildNames();',context);
 assert.equal(inputs(),1);
 assert.equal([...container.innerHTML.matchAll(/checked/g)].length,2);
 vm.runInContext("rsvpChildPicker.custom[0]='Cousin';",context);
 assert.deepEqual(Array.from(context.readRsvpChildNames()),['Tommy','Johnny','Cousin']);
});

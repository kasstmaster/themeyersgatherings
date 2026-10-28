import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
test('covered dishes never become new claims even if another UI operation enables the checkbox',()=>{
 const inputs=[{dataset:{rsvpDish:'covered'},checked:true,disabled:false,hasAttribute:()=>true,closest(){throw new Error('Covered quantity must not be read');}},{dataset:{rsvpDish:'own'},checked:true,disabled:false,hasAttribute:()=>false,closest:()=>({querySelector:()=>({value:'2'})})}];
 const context=vm.createContext({rsvpDishesEnabled:()=>true,document:{querySelector:selector=>selector==='#rsvpBringingDish'?{value:'yes'}:{checked:false},querySelectorAll:()=>inputs}});
 vm.runInContext(source.slice(source.indexOf('function rsvpDishDraft(){'),source.indexOf('function validateRsvpQuestion(')),context);
 const draft=context.rsvpDishDraft();assert.equal(draft.quantities.get('covered'),0);assert.equal(draft.quantities.get('own'),2);
});

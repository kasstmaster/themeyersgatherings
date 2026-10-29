import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function renderYourDishes()'),source.indexOf('function renderRsvpPageNavigation()'));
test('Your Dishes renders names and amounts only, without claim status or quantity types',()=>{
 const list={},section={},nodes={'#yourDishesButton':{setAttribute(){}},'#yourDishesSection':section,'#yourDishesList':list,'#rsvpWeddingPages':{}},other={};
 const dishes=[{item:{name:'Ham',unit:'item',needed:1},quantity:1},{item:{name:'Rolls',unit:'dozen',needed:3},quantity:2},{item:{name:'Juice',unit:'case',needed:3},quantity:1.5}];
 const context=vm.createContext({invitationDishes:()=>dishes,selectedGatheringTab:'your-dishes',render(){},escapeHtml:String,document:{querySelector:s=>nodes[s],querySelectorAll:()=>[section,other]}});vm.runInContext(code,context);context.renderYourDishes();
 assert.equal(list.innerHTML,'<p><strong>Ham</strong> <span>1</span></p><p><strong>Rolls</strong> <span>2</span></p><p><strong>Juice</strong> <span>1.5</span></p>');assert.doesNotMatch(list.innerHTML,/CLAIMED|✓|dozen|case|item/);assert.equal(section.hidden,false);assert.equal(other.hidden,true);
});

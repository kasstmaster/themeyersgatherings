import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const quantityCode=source.slice(source.indexOf('function formatQuantity('),source.indexOf("document.querySelector('#adminNewAmount')"));
const code=source.slice(source.indexOf('function renderYourDishes()'),source.indexOf('function changeYourDishes()'));
test('Your Dishes renders single items by name, multiple items by amount and other units by amount plus type',()=>{
 const list={},section={},nodes={'#yourDishesButton':{setAttribute(){}},'#yourDishesChange':{},'#yourDishesSection':section,'#yourDishesList':list,'#rsvpWeddingPages':{}},other={};
 const dishes=[{item:{name:'Ham',unit:'item',needed:1},quantity:1},{item:{name:'Rolls',unit:'dozen',needed:3},quantity:2},{item:{name:'Juice',unit:'case',needed:3},quantity:1.5},{item:{name:'Pies',unit:'item',needed:3},quantity:2},{item:{name:'Cookies',unit:'dozen',needed:1},quantity:1},{item:{name:'Custom',unit:'basket-id'},quantity:1},{item:{name:'Legacy'},quantity:1}];
 const context=vm.createContext({syncRsvpDishReference(){},rsvpDishesEnabled:()=>true,state:{quantityUnits:[{id:'dozen',label:'Dozen'},{id:'case',label:'Case'},{id:'basket-id',label:'Basket'}]},invitationDishes:()=>dishes,selectedGatheringTab:'your-dishes',render(){},escapeHtml:String,document:{querySelector:s=>nodes[s],querySelectorAll:()=>[section,other]}});vm.runInContext(quantityCode+code,context);context.renderYourDishes();
 assert.equal(list.innerHTML,'<p><strong>Ham</strong></p><p><strong>Rolls</strong> <span>2 dozen</span></p><p><strong>Juice</strong> <span>1.5 cases</span></p><p><strong>Pies</strong> <span>2</span></p><p><strong>Cookies</strong> <span>1 dozen</span></p><p><strong>Custom</strong> <span>1 basket</span></p><p><strong>Legacy</strong></p>');assert.doesNotMatch(list.innerHTML,/CLAIMED|✓| of |items?/);assert.equal(section.hidden,false);assert.equal(other.hidden,true);
});

test('Make Changes respects RSVP locks and opens the existing dish step without saving',()=>{
 const changes=source.slice(source.indexOf('function changeYourDishes()'),source.indexOf('function renderRsvpPageNavigation()'));
 for(const allowed of [false,true]){const choice={value:'no'},opened=[];const c=vm.createContext({rsvpDishesEnabled:()=>allowed,invitationDishes:()=>[{}],selectedGatheringTab:'your-dishes',render(){},openRsvp:()=>opened.push('rsvp'),RsvpFlow:{go:step=>opened.push(step)},document:{querySelector:()=>choice}});vm.runInContext(changes,c);c.changeYourDishes();assert.deepEqual(opened,allowed?['rsvp','dishes']:[]);assert.equal(choice.value,allowed?'yes':'no');assert.equal(c.selectedGatheringTab,allowed?null:'your-dishes');}
});

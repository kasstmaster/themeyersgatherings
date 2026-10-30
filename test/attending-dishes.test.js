import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
await import('../guest-planning.js');
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function fixture(event='thanksgiving'){
 const state={items:[{id:'ham',name:'Ham',needed:3,claims:['Family A','Person A']},{id:'pie',name:'Pie',needed:1,claims:['Family B']},{id:'salad',name:'Salad',needed:1,claims:[]}]};
 const context=vm.createContext({GuestPlanning,state,viewedEventId:event,HOST_DISPLAY_NAME:'Host',normalizeAccountName:value=>value.toLowerCase(),findAccount:name=>name==='Person A'?{name:'Family A'}:null,accountSignInNames:name=>[name],firstAccountLastName:name=>name,escapeHtml:value=>value,escapeAttribute:value=>value,GatheringFeatures:{forGathering:id=>({menu:id!=='wedding'})}});
 vm.runInContext('function contributionItems(){return state.items;}'+source.slice(source.indexOf('function renderDish('),source.indexOf('function claimItem('))+source.slice(source.indexOf('function dishClaimHousehold('),source.indexOf('function renderGuestAttendance(')),context);
 return {context,state};
}
test('a household shows its dishes and quantities only once across invitation groups',()=>{
 const {context:c,state}=fixture(),before=JSON.stringify(state),shown=new Set();
 assert.equal(c.householdDishClaims('Family A')[0].quantity,2);
 const first=c.attendingDishRows('Family A',shown);assert.match(first,/Ham/);assert.match(first,/\(2 of 3\)/);assert.doesNotMatch(first,/still needed|dish-claimants|Pie/);
 assert.equal(c.attendingDishRows('Family A',shown),'');const other=c.otherDishContributions(shown);assert.match(other,/Other contributions/);assert.match(other,/Pie/);assert.match(other,/Family B/);assert.doesNotMatch(other,/Ham/);assert.equal(JSON.stringify(state),before);
});
test('all standard/new gatherings share dishes while Wedding keeps its meal specialization',()=>{
 for(const id of ['thanksgiving','christmas','gathering-new'])assert.match(fixture(id).context.attendingDishRows('Family A',new Set()),/Ham/);
 const {context:c}=fixture('wedding');assert.equal(c.attendingDishRows('Family A',new Set()),'');assert.equal(c.otherDishContributions(new Set()),'');
});
test('still-needed menu is inside Attending and the separate count/dialog are removed',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');const attending=html.slice(html.indexOf('<dialog id="guestListDialog"'),html.indexOf('<dialog id="notAttendingDialog"'));
 assert.match(attending,/id="gatheringMenuSection"/);assert.match(attending,/Dishes still needed/);assert.ok(attending.indexOf('id="menuGrid"')>attending.indexOf('id="guestList"'));
 assert.doesNotMatch(html,/id="(?:remainingSummary|remainingCount|dishListDialog|closeDishListButton)"/);
});

test('family dishes stay together in menu order without category labels',()=>{
 const {context:c,state}=fixture();state.items=[{id:'water',name:'Water',category:'Drinks',needed:1,claims:['Family A']},{id:'pie',name:'Pie',category:'Desserts',needed:1,claims:['Family A']},{id:'ham',name:'Ham',category:'Main Table',needed:1,claims:['Family A']}];
 const html=c.attendingDishRows('Family A',new Set());assert.ok(html.indexOf('Ham')<html.indexOf('Pie'));assert.ok(html.indexOf('Pie')<html.indexOf('Water'));assert.doesNotMatch(html,/Drinks|Main Table|Desserts/);
});

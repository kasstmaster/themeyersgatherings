import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
await import('../guest-planning.js');
await import('../invitation-groups.js');
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
function render(account){
 const context=vm.createContext({GuestPlanning,InvitationGroups,viewedEventId:'one',EVENT_DETAILS:{one:{}},accountCanSignIn:()=>true,escapeHtml:value=>value,escapeAttribute:value=>value,accountSignInNames:GuestPlanning.accountNames});
 vm.runInContext(source.slice(source.indexOf('function accountContactGroups('),source.indexOf('// Invitation/count lists'))+source.slice(source.indexOf('function invitationHeadingHtml('),source.indexOf('function firstAccountLastName(')),context);
 return context.accountContactsHtml(account);
}
test('Accounts separates different surnames without changing person-level controls',()=>{
 const html=render({name:'Steven Meyer / Kassandra Raudman',plusOnePeople:{one:['Kassandra Raudman']},invitationPeople:{one:{'Steven Meyer':1,'Kassandra Raudman':2}}});
 assert.match(html,/<strong>Meyer<\/strong>/);assert.match(html,/<strong>Raudman<\/strong>/);assert.doesNotMatch(html,/<strong>Meyer \/ Raudman/);
 assert.equal((html.match(/account-person-headings/g)||[]).length,2);assert.match(html,/data-person-invitation="Kassandra Raudman"[^>]*value="2"/);assert.match(html,/data-plus-one-person="Kassandra Raudman"[^>]*checked/);
});
test('Accounts shares a surname heading across invitation numbers while preserving assignments',()=>{
 const html=render({name:'Scott,Danielle,Molly Hardenburgh',invitationPeople:{one:{'Scott Hardenburgh':1,'Danielle Hardenburgh':1,'Molly Hardenburgh':2}}});
 assert.equal((html.match(/<strong>Hardenburgh<\/strong>/g)||[]).length,1);
 for(const name of ['Scott','Danielle','Molly'])assert.match(html,new RegExp(`data-person-invitation="${name} Hardenburgh"`));
 assert.match(html,/data-person-invitation="Molly Hardenburgh"[^>]*value="2"/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
await import('../gathering-features.js');
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const renderer = source.slice(source.indexOf('function renderGatheringPages('), source.indexOf('function render()'));
function render({event='thanksgiving',host=false,submitted=false,claims=[],tab=null}={}) {
  const nodes=new Map();
  const document={
    querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{});return nodes.get(selector);},
    querySelectorAll(){return [];}
  };
  const context=vm.createContext({
    document,selectedGatheringTab:tab,guestName:'My household',
    hasSubmittedInvitationRsvp:()=>submitted,formatEditableText:value=>value,
    state:{items:[{claims}],hostNotes:'Private host notes'}
  });
  vm.runInContext(renderer,context);
  context.renderGatheringPages(GatheringFeatures.forGathering(event),host);
  return {menu:nodes.get('.menu-section'),notes:nodes.get('#hostNotesSection'),tabs:nodes.get('#gatheringTabs')};
}
test('menu and notes pages remain host-only regardless of guest response or claims',()=>{
  for(const event of ['thanksgiving','christmas','custom-gathering']) {
    assert.equal(render({event,submitted:true,claims:['My household']}).menu.hidden,true);
    assert.equal(render({event,submitted:false,claims:['My household']}).menu.hidden,true);
    assert.equal(render({event,submitted:true,claims:[]}).menu.hidden,true);
    assert.equal(render({event,submitted:true,claims:['Other household']}).menu.hidden,true);
    const guest=render({event,submitted:true,claims:['My household'],tab:'notes'});
    assert.equal(guest.menu.hidden,true);
    assert.equal(guest.notes.hidden,true);
    assert.equal(guest.tabs.hidden,true);
  }
});
test('standard host Notes and Menu retain their feature-based visibility',()=>{
  assert.equal(render({host:true,tab:'menu'}).menu.hidden,false);
  assert.equal(render({host:true,tab:'notes'}).menu.hidden,true);
  assert.equal(render({host:true,tab:'notes'}).notes.hidden,false);
  assert.equal(render({event:'wedding',submitted:true,claims:['My household']}).menu.hidden,true);
});

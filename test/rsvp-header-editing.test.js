import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const headerCode=source.slice(source.indexOf('function renderRsvpEventHeader()'),source.indexOf("document.querySelector('#rsvpConfirmEvent').addEventListener"));
const editorCode=source.slice(source.indexOf('function renderRsvpInlineEditing()'),source.indexOf('function renderEventDock()'));
function fixture(editing,eventId='thanksgiving'){
 const fields=[],section={hidden:true},confirm={},wrong={},image={src:'main.png',hidden:false,removeAttribute(){this.src='';},addEventListener(){}};
 const clone={removeAttribute(){},querySelector:()=>image,querySelectorAll:selector=>selector==='img[src]'&&image.src?[image]:[]};
 const container={replaceChildren(node){this.child=node;}};
 const nodes={'#rsvpEventConfirmation':section,'#rsvpConfirmEvent':confirm,'#rsvpWrongEvent':wrong,'#eventPage .header-art':{cloneNode:()=>clone},'#rsvpEventHeader':container,'#rsvpEventHeader .header-art':clone};
 const state={rsvpHeaderImage:'rsvp.png'};
 const context=vm.createContext({state,viewedEventId:eventId,EVENT_DETAILS:{[eventId]:{header:'main.png'}},GatheringFeatures:{rsvp:()=>({meals:false})},SiteEditing:{enabled:editing,field:(target,title,specs,commit,options)=>fields.push({target,title,specs,commit,options})},document:{querySelector:selector=>nodes[selector]}});
 vm.runInContext(headerCode+editorCode,context);
 return {context,fields,section,confirm,wrong,image};
}
test('first RSVP page is visible and banner is editable in every regular gathering',()=>{
 for(const eventId of ['thanksgiving','christmas','new-gathering']){
  const f=fixture(true,eventId);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
  assert.equal(f.section.hidden,false);assert.equal(f.image.src,'rsvp.png');
  assert.equal(f.confirm.disabled,true);assert.equal(f.wrong.disabled,true);
  assert.equal(f.fields[0].options.key,'rsvp-first-page-banner');
  f.fields[0].commit(['new-rsvp.png']);f.context.renderRsvpEventHeader();assert.equal(f.image.src,'new-rsvp.png');
 }
});
test('guest confirmation stays visible and interactive without editing controls',()=>{
 const f=fixture(false);f.context.renderRsvpEventHeader();f.context.renderRsvpInlineEditing();
 assert.equal(f.section.hidden,false);assert.equal(f.confirm.disabled,false);assert.equal(f.wrong.disabled,false);assert.equal(f.fields.length,0);
});

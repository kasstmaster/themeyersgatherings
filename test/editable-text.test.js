import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const [app,editing]=await Promise.all(['app.js','inline-editing.js'].map(file=>readFile(new URL('../'+file,import.meta.url),'utf8')));
const context=vm.createContext({expandEditableTextVariables:value=>value,escapeHtml:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),escapeAttribute:value=>value});
vm.runInContext(app.slice(app.indexOf('function safeEditableLink('),app.indexOf('function editableTextVariables()')),context);
vm.runInContext(editing,context);
const format=value=>context.formatWeddingPartyDescription(value);
test('shared formatting preserves single and repeated blank lines, including Markdown and lists',()=>{
 assert.equal(format('First\n\nSecond'),'<p>First</p><br><p>Second</p>');
 assert.equal(format('First\n\n\nSecond'),'<p>First</p><br><br><p>Second</p>');
 assert.equal(format('**First**\n\n_Second_'),'<p><strong>First</strong></p><br><p><em>Second</em></p>');
 assert.equal(format('- One\n\n- Two'),'<ul><li>One</li></ul><br><ul><li>Two</li></ul>');
 assert.equal(format(' \n\n'),'');
 assert.doesNotMatch(format('<script>\n\nNext'),/<script>/);
});
function root(){
 const wrapper={tagName:'DIV',id:''},header={tagName:'DIV',id:''},container={id:'rsvpEventHeader'},paragraph={tagName:'P',id:'',innerHTML:'Original'};
 const result={matches:selector=>selector==='dialog',querySelectorAll:()=>[paragraph]};
 paragraph.closest=selector=>selector==='dialog'?result:null;paragraph.querySelector=()=>null;paragraph.matches=()=>false;
 paragraph.parentElement=wrapper;wrapper.parentElement=header;header.parentElement=container;
 wrapper.querySelectorAll=()=>[paragraph];header.querySelectorAll=()=>[wrapper];container.querySelectorAll=()=>[header];
 return {result,paragraph};
}
test('saved first-page text reapplies to rebuilt RSVP headers with editing turned off',()=>{
 const key='#rsvpEventHeader>div:nth-of-type(1)>div:nth-of-type(1)>p:nth-of-type(1)';
 const state={siteText:{[key]:'Edited first page\n\nKeep this blank line'}};
 for(let reopened=0;reopened<3;reopened++){
  const {result,paragraph}=root();
  context.SiteEditing.applyStaticText(result,state,format);
  assert.equal(paragraph.innerHTML,'Edited first page<br><br>Keep this blank line');
 }
 const other=root();context.SiteEditing.applyStaticText(other.result,{siteText:{}},format);assert.equal(other.paragraph.innerHTML,'Original');
});

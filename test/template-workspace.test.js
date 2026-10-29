import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../invitation.js');
const I=globalThis.Invitation;
test('center snapping uses visible pixels consistently across zoom and preserves field formatting',()=>{
 const field={x:193,y:42,width:420,height:48,fontFamily:'Georgia',textAlign:'right'},before=structuredClone(field);
 assert.deepEqual(I.snapHorizontal(field,800,1),{x:190,snapped:true});assert.deepEqual(field,before);
 assert.deepEqual(I.snapHorizontal({...field,x:205},800,.5),{x:190,snapped:true});
 assert.deepEqual(I.snapHorizontal({...field,x:210},800,.5),{x:210,snapped:false});
 assert.deepEqual(I.snapHorizontal(field,800,1,false),{x:193,snapped:false});
 assert.equal(I.snapHorizontal({x:0,width:900},800,.1).snapped,false);
});
test('archive dropdown follows current choices and management belongs to the Host toolbar',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 const chooser=html.slice(html.indexOf('<section id="eventSelectionPage"'),html.indexOf('<section id="attirePage"'));
 assert.ok(chooser.indexOf('id="eventSelectionChoices"')<chooser.indexOf('id="pastGatheringsDropdown"'));assert.match(chooser,/<summary id="viewPastGatherings">/);assert.doesNotMatch(chooser,/id="manageGatherings"/);
 const tools=html.slice(html.indexOf('<nav id="hostToolsPanel"'),html.indexOf('</nav>',html.indexOf('<nav id="hostToolsPanel"')));assert.match(tools,/id="manageGatherings"/);
 assert.match(html,/<dialog id="manageGatheringsDialog" class="wide-dialog editor-dialog"><div class="modal-card">/);
});
test('invitation editor is a page using the common editor shell rather than a separate modal inspector',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),app=await readFile(new URL('../app.js',import.meta.url),'utf8'),editor=await readFile(new URL('../element-editor.js',import.meta.url),'utf8');
 assert.match(html,/<section id="invitationEditorDialog"/);assert.doesNotMatch(html,/<dialog id="invitationEditorDialog"/);assert.doesNotMatch(html,/id="fieldInspector"/);
 assert.match(app,/ElementEditor.openWorkspace\(/);assert.match(app,/ElementEditor.workspaceControls\(/);assert.match(editor,/toolbar=toolbarFrame\(\)/);assert.match(editor,/toolbar=toolbarFrame\(adapter.label/);
 assert.match(app,/saveState\(\{refresh:false\}\);showToast\('Invitation template saved/);
});

test('reselecting a workspace value reveals current formatting after the panel was hidden',async()=>{
 const vm=await import('node:vm'),source=await readFile(new URL('../element-editor.js',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('  function workspaceControls('),source.indexOf('  function updateWorkspaceValues('));
 const panel={hidden:true,parentElement:{scrollTop:250},children:[],setAttribute(key,value){this[key]=value;},replaceChildren(){this.children=[];}},heading={text:'',replaceChildren(value){this.text=value;}},toolbar={querySelector(selector){return selector==='[data-editor-panel]'?panel:heading;}};
 let refreshed=0;const control=(parent,label,options,value)=>{const result={label,value,dataset:{}};parent.children.push(result);return result;};
 const context=vm.createContext({toolbar,workspace:{refresh(){refreshed++;}},document:{createTextNode:value=>value},selectInput:control});vm.runInContext(code,context);
 context.workspaceControls('Event Date',[{key:'fontFamily',label:'Font',options:['Georgia','Times New Roman'],value:'Times New Roman'}],()=>{});
 assert.equal(panel.hidden,false);assert.equal(panel.parentElement.scrollTop,0);assert.equal(panel['aria-label'],'Event Date formatting');assert.equal(panel.children[0].value,'Times New Roman');
 panel.hidden=true;context.workspaceControls('Event Time',[{key:'fontFamily',label:'Font',options:['Georgia','Times New Roman'],value:'Georgia'}],()=>{});
 assert.equal(panel.hidden,false);assert.equal(panel['aria-label'],'Event Time formatting');assert.equal(panel.children.length,1);assert.equal(panel.children[0].value,'Georgia');assert.equal(refreshed,2);
});

test('template toolbar keeps always-visible compact actions above its formatting scroll region',async()=>{
 const html=await readFile(new URL('../index.html',import.meta.url),'utf8'),app=await readFile(new URL('../app.js',import.meta.url),'utf8'),editor=await readFile(new URL('../element-editor.js',import.meta.url),'utf8');
 const tools=html.slice(html.indexOf('<aside id="templateWorkspaceTools"'),html.indexOf('</aside>',html.indexOf('<aside id="templateWorkspaceTools"')));
 assert.doesNotMatch(tools,/<details|<summary|id="centerTemplateField"/);assert.ok(tools.indexOf('id="templateSnapCenter"')<tools.indexOf('id="templateFieldToolbox"'));assert.ok(tools.indexOf('id="removeTemplateField"')<tools.indexOf('id="templateFieldToolbox"'));assert.match(tools,/id="uploadTemplateBackgroundButton" type="button">Upload/);
 assert.match(html,/id="saveTemplateButton" type="button">Save</);assert.match(html,/id="previewEditedTemplateButton" type="button">Preview</);
 const workspace=app.slice(app.indexOf('function openTemplateWorkspaceToolbar()'),app.indexOf('function renderFieldInspector()'));assert.doesNotMatch(workspace,/\['Done'/);assert.match(editor,/element-editor-row element-editor-formatting/);assert.doesNotMatch(editor,/node\('strong','Formatting'\)/);
});

test('website editor places gathering management before Menu/Templates and restores its Host control',async()=>{
 const editor=await readFile(new URL('../element-editor.js',import.meta.url),'utf8');
 assert.match(editor,/top.append\(history,node\('hr'\),gatheringManagement,menuTemplates/);assert.match(editor,/querySelector\('\[data-editor-gathering-management\]'\).append\(manage\)/);assert.match(editor,/querySelector\('#hostToolsPanel .host-tool-actions'\).append\(manage\)/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../app.js',import.meta.url),'utf8');
const builderCode=source.slice(source.indexOf('function gatheringBuilderContext('),source.indexOf('function finishGatheringBuilderSession('));
const saveCode=source.slice(source.indexOf('function saveState('),source.indexOf('let sharedSaveTimer;'));
function fixture(){
 const saved=[];
 const appState={events:{one:{siteText:{title:'One'}},two:{siteText:{title:'Two'}}},gatheringHome:{}};
 const context=vm.createContext({appState,state:appState.events.one,viewedEventId:'one',SiteEditing:{enabled:true,flushing:false,recordUndo(){}},isHostView:()=>true,render(){},formatEditableText:value=>value,escapeHtml:value=>value,localStateRevision:0,captureGatheringHistory(){},storeLocalState:value=>{saved.push(structuredClone(value));return true;},queueSharedStateSave(){}});
 vm.runInContext(saveCode+builderCode,context);
 return {context,saved};
}
test('builder saves stay keyed to the gathering that owns the editing session',()=>{
 const {context,saved}=fixture(),builder=context.gatheringBuilderContext();
 context.viewedEventId='two';context.state=context.appState.events.two;
 builder.state.siteText.title='Edited One';builder.save({refresh:false});
 assert.equal(saved.at(-1).events.one.siteText.title,'Edited One');
 assert.equal(saved.at(-1).events.two.siteText.title,'Two');
 assert.equal(context.appState.events.one,builder.state);
});
test('a stale builder cannot save after shared-state reload replaces its data',()=>{
 const {context,saved}=fixture(),builder=context.gatheringBuilderContext();
 context.appState=structuredClone(context.appState);builder.state.siteText.title='Stale edit';builder.save({refresh:false});
 assert.equal(saved.length,0);assert.equal(context.appState.events.one.siteText.title,'One');
});
test('chooser settings and newly created gatherings use the same context without sharing data',()=>{
 const {context,saved}=fixture(),before=structuredClone(context.appState.events);
 const home=context.gatheringBuilderContext('gathering-home');home.state.siteText={title:'Home'};home.save({refresh:false});
 assert.deepEqual(saved.at(-1).events,before);
 context.appState.events['gathering-new']={siteText:{title:'New'}};
 const created=context.gatheringBuilderContext('gathering-new');created.state.siteText.title='Edited new';created.save({refresh:false});
 assert.equal(saved.at(-1).events['gathering-new'].siteText.title,'Edited new');
 assert.deepEqual(saved.at(-1).events.one,before.one);assert.deepEqual(saved.at(-1).events.two,before.two);
});
test('starting a next gathering occurrence saves its replacement under the same gathering ID',()=>{
 const {context,saved}=fixture(),builder=context.gatheringBuilderContext();
 context.appState.events.one={eventDate:'2029-01-01',siteText:{title:'Next occurrence'}};
 builder.save({refresh:false});assert.equal(saved.at(-1).events.one.eventDate,'2029-01-01');
 assert.equal(saved.at(-1).events.two.siteText.title,'Two');
});

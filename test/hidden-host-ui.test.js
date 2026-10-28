import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
const source=app.slice(app.indexOf('function finishHostSignIn('),app.indexOf("document.querySelector('#eventSelectionChoices').addEventListener"));
function fixture(signIn) {
 const nodes=new Map(),listeners=new Map();
 for(const id of ['accountFirstName','accountLastName','accountSuffix','signInSubmit','accountPasswordError','passwordForm'])nodes.set('#'+id,{value:'',type:'text',disabled:false,textContent:'',focus(){},addEventListener(event,callback){listeners.set(id+':'+event,callback);}});
 const fields=['#accountFirstName','#accountLastName','#accountSuffix'].map(id=>nodes.get(id));
 const ctx=vm.createContext({document:{querySelector(selector){const match=/data-sign-in-step="(\d)"/.exec(selector);return match?fields[Number(match[1])]:nodes.get(selector);},querySelectorAll(){return fields;}},StateClient:{signIn},SHARED_STATE_URL:'https://service.test',signInBusy:false,restoringSession:false,signInStep:0,HOST_DISPLAY_NAME:'Host',guestName:'',viewedEventId:'thanksgiving',pendingAccountAction:null,appState:{accounts:[{name:'Casey Example IV'}]},hostAuthenticated:false,accountQrTokenFromLocation:()=> 'printed-qr',accountPersonName:name=>name,updateHostToolsPanel(){}});
 ctx.setSignInStep=step=>ctx.signInStep=step;ctx.applyAuthorizedSession=result=>ctx.applied=result;ctx.showEventSelection=()=>ctx.destination='gatherings';
 vm.runInContext(source,ctx);
 return {ctx,fields,nodes,submit:()=>listeners.get('passwordForm:submit')({preventDefault(){}}),input:()=>listeners.get('accountFirstName:input')()};
}
test('hidden Host entry masks, clears before request completion, blocks duplicate submits and never becomes a guest name',async()=>{
 let release;const calls=[];const f=fixture((...args)=>{calls.push(args);return new Promise(resolve=>release=resolve);});
 const value='synthetic-private-host-password';f.fields[0].value=value;f.input();assert.equal(f.fields[0].type,'password');
 const pending=f.submit();assert.equal(f.fields[0].value,'');assert.equal(f.nodes.get('#signInSubmit').disabled,true);await f.submit();assert.equal(calls.length,1);
 release({role:'host',state:{accounts:[]},revision:'one'});await pending;
 assert.equal(calls[0][1].password,value);assert.equal(calls[0][1].role,'first-name');assert.equal(f.ctx.hostAuthenticated,true);assert.equal(f.ctx.guestName,'Host');assert.equal(f.ctx.destination,'gatherings');assert.ok(f.fields.every(field=>field.value===''));
});
test('failed hidden credentials remain cleared and cannot advance into guest names',async()=>{
 const f=fixture(async()=>{throw new Error('Sign-in failed.');});f.fields[0].value='incorrect-private-host-password';await f.submit();
 assert.equal(f.fields[0].value,'');assert.equal(f.ctx.signInStep,0);assert.equal(f.ctx.hostAuthenticated,false);assert.equal(f.ctx.guestName,'');assert.equal(f.nodes.get('#signInSubmit').disabled,false);
});
test('recognized suffixed guests retain suffix and original QR sign-in steps without a Host request',async()=>{
 const calls=[];const f=fixture(async(...args)=>{calls.push(args);return args[1].checkSuffix?{next:'suffix'}:{role:'guest'};});
 f.fields[0].value='Casey';f.input();assert.equal(f.fields[0].type,'text');await f.submit();assert.equal(f.ctx.signInStep,1);assert.equal(calls.length,0);
 f.fields[1].value='Example';await f.submit();assert.equal(f.ctx.signInStep,2);assert.equal(calls.length,1);assert.equal(f.ctx.applied,undefined);
 f.fields[2].value='IV';await f.submit();assert.equal(calls[1][1].role,'guest');assert.equal(calls[1][1].name,'Casey Example IV');assert.equal(calls[1][1].qrToken,'printed-qr');assert.equal(calls[1][1].checkSuffix,false);assert.equal(f.ctx.hostAuthenticated,false);assert.equal(f.ctx.destination,'gatherings');
});
test('a recognized long guest first name continues normally without a Host session',async()=>{
 const f=fixture(async()=>({next:'guest'})),name='Alexandertheverylongfirstname';f.fields[0].value=name;await f.submit();
 assert.equal(f.ctx.signInStep,1);assert.equal(f.fields[0].value,name);assert.equal(f.fields[0].type,'text');assert.equal(f.ctx.hostAuthenticated,false);assert.equal(f.ctx.guestName,'');
});


test('a suffix-free guest signs in immediately after Last Name and stale suffix input is cleared',async()=>{
 const calls=[],f=fixture(async(...args)=>{calls.push(args);return {role:'guest',person:'Casey Example'};});f.ctx.appState.accounts[0].name='Casey Example';
 f.fields[0].value='Casey';await f.submit();f.fields[1].value='Example';f.fields[2].value='IV';await f.submit();
 assert.equal(f.ctx.destination,'gatherings');assert.equal(f.ctx.signInStep,1);assert.equal(calls.length,1);assert.equal(calls[0][1].name,'Casey Example');assert.equal(calls[0][1].checkSuffix,true);assert.equal(f.fields[2].value,'');
});

test('suffix alias sign-in uses the server-confirmed canonical person for guest features',async()=>{
 const f=fixture(async(_base,input)=>input.checkSuffix?{next:'suffix'}:{role:'guest',person:'Casey Example IV'});
 f.fields[0].value='Alias';await f.submit();f.fields[1].value='Example';await f.submit();f.fields[2].value='IV';await f.submit();
 assert.equal(f.ctx.signedInPersonName,'Casey Example IV');assert.equal(f.ctx.destination,'gatherings');
});

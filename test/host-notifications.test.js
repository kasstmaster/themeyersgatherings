import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const client=await readFile(new URL('../host-notifications.js',import.meta.url),'utf8'),serviceWorker=await readFile(new URL('../service-worker.js',import.meta.url),'utf8');
function fixture(role='host',permission='granted'){
 const nodes=new Map(),actions=[],endpoint='https://fcm.googleapis.com/fcm/send/synthetic';let current=null,enrolled=false;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,textContent:'',listeners:{},addEventListener(type,fn){this.listeners[type]=fn;},showModal(){this.open=true;}});return nodes.get(id);};
 const registration={pushManager:{getSubscription:async()=>current,subscribe:async()=>{actions.push('subscribe');current={endpoint,unsubscribe:async()=>{actions.push('unsubscribe');current=null;return true;}};return current;}}};
 const context=vm.createContext({isSecureContext:true,PushManager:class{},Notification:{permission,requestPermission:async()=>{actions.push('permission');return permission;}},navigator:{serviceWorker:{getRegistration:async()=>registration,register:async()=>registration,ready:Promise.resolve(registration)}},StateClient:{role,headers:()=>({Authorization:'Bearer synthetic'})},document:{querySelector:node},crypto,TextEncoder,Uint8Array,atob,AbortSignal,fetch:async(_url,options)=>{
  if(options.method==='POST'){enrolled=true;actions.push('enroll');assert.deepEqual(Object.keys(JSON.parse(options.body)),['endpoint']);}
  if(options.method==='DELETE'){enrolled=false;actions.push('delete');}
  const id=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint))).toString('hex');
  return Response.json({configured:true,publicKey:Buffer.alloc(65,1).toString('base64url'),deviceIds:enrolled?[id]:[]});
 }});
 vm.runInContext(client,context);return {context,node,actions};
}
test('guests cannot open notification enrollment or request browser permission',async()=>{
 const f=fixture('guest');await f.context.HostNotifications.open('https://service.test');await f.node('#hostPushEnable').listeners.click();assert.deepEqual(f.actions,[]);assert.notEqual(f.node('#hostNotificationsDialog').open,true);
});
test('Host enrollment requests permission only from the click, registers endpoint, and can disable locally',async()=>{
 const f=fixture();await f.context.HostNotifications.open('https://service.test');assert.deepEqual(f.actions,[]);
 await f.node('#hostPushEnable').listeners.click();assert.deepEqual(f.actions,['permission','subscribe','enroll']);assert.equal(f.node('#hostPushEnable').disabled,true);
 await f.context.HostNotifications.disable();assert.deepEqual(f.actions.slice(-2),['unsubscribe','delete']);
});
test('denied notification permission does not create any subscription',async()=>{
 const f=fixture('host','denied');await f.context.HostNotifications.open('https://service.test');await f.node('#hostPushEnable').listeners.click();assert.deepEqual(f.actions,['permission']);
});
test('service worker ignores payload data and displays only a fixed generic notification',async()=>{
 const handlers={},shown=[],focused=[];let pending;
 const context=vm.createContext({URL,self:{location:{origin:'https://themeyers.ilymmd.com'},addEventListener:(type,fn)=>{handlers[type]=fn;},registration:{showNotification:async(...args)=>shown.push(args)},clients:{matchAll:async()=>[{url:'https://themeyers.ilymmd.com/',focus:async()=>focused.push('existing')}],openWindow:async()=>focused.push('new')}}});
 vm.runInContext(serviceWorker,context);
 handlers.push({data:{json(){throw new Error('Never read guest payloads');}},waitUntil:value=>{pending=value;}});await pending;
 assert.equal(shown[0][0],'The Meyers');assert.equal(shown[0][1].body,'Attendance or food selections were updated. Open the website to view changes.');assert.equal(shown[0][1].tag,'meyers-rsvp-update');
 handlers.notificationclick({notification:{close(){}},waitUntil:value=>{pending=value;}});await pending;assert.deepEqual(focused,['existing']);
});

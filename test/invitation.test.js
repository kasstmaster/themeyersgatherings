import test from 'node:test';
import assert from 'node:assert/strict';

await import('../invitation.js');
const Invitation = globalThis.Invitation;
const background = { url: 'https://runtime.test/invitation-backgrounds/abc', width: 720, height: 1008, contentType: 'image/png' };

test('template records contain runtime background metadata and timestamps', () => {
  const template = Invitation.createTemplate('Winter 2026', background);
  assert.match(template.id, /^template-/); assert.equal(template.name, 'Winter 2026');
  assert.deepEqual(template.background, background); assert.deepEqual(template.fields, []);
  assert.ok(Date.parse(template.createdAt)); assert.equal(template.createdAt, template.updatedAt);
});

test('field configuration and original-image coordinates persist', () => {
  const template = Invitation.createTemplate('Test', background);
  const field = Invitation.newField('addressLine1', 120.4, 410.2);
  Object.assign(field, { width: 470, height: 40, italic: true, color: '#123456', textAlign: 'center' });
  template.fields.push(field);
  const saved = JSON.parse(JSON.stringify(template));
  assert.deepEqual(saved.fields[0], field); assert.equal(saved.fields[0].x, 120); assert.equal(saved.fields[0].y, 410);
});

test('ordinal suffixes handle normal and teen exception days', () => {
  const expected = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 11: '11th', 12: '12th', 13: '13th', 21: '21st', 22: '22nd', 23: '23rd', 31: '31st' };
  for (const [day, value] of Object.entries(expected)) assert.equal(Invitation.ordinal(Number(day)), value);
});

test('date-only event formatters do not shift calendar dates', () => {
  assert.equal(Invitation.formatEventDate('2026-11-21'), 'Saturday November 21st 2026');
  assert.equal(Invitation.formatEventDate('2026-11-21', 'month-ordinal-year'), 'November 21st 2026');
  assert.equal(Invitation.formatEventDate('2026-11-21', 'month-day-comma-year'), 'November 21, 2026');
  assert.equal(Invitation.parseDate('2026-02-30'), null);
});

test('RSVP formatter produces title-case abbreviated output', () => {
  assert.equal(Invitation.formatRsvpDate('2026-11-07'), 'Kindly RSVP By Nov. 7');
  assert.equal(Invitation.formatRsvpDate('2026-05-07'), 'By May 7');
  assert.equal(Invitation.formatRsvpDate('2026-11-07', 'month-day'), 'November 7');
});

test('background replacement reports changed dimensions without changing fields', () => {
  const template = Invitation.createTemplate('Test', background); template.fields.push(Invitation.newField('eventDate', 20, 30));
  const same = Invitation.replaceBackground(template, { ...background, url: 'same' });
  assert.equal(same.dimensionsChanged, false); assert.deepEqual(same.template.fields, template.fields);
  const changed = Invitation.replaceBackground(template, { ...background, width: 1000, url: 'changed' });
  assert.equal(changed.dimensionsChanged, true); assert.deepEqual(changed.template.fields, template.fields);
});

test('event template assignment is separate from template layout', () => {
  const template = Invitation.createTemplate('Gathering template', background), event = { invitationTemplateId: template.id, eventDate: '2026-11-21' };
  assert.equal(event.invitationTemplateId, template.id); assert.equal('eventDate' in template, false);
});

test('invitation models reuse account URLs without mutating QR tokens or event data', () => {
  const template = Invitation.createTemplate('Test', background);
  template.fields.push(Invitation.newField('eventDate', 10, 20), Invitation.newField('accountQr', 500, 800));
  const event = { eventDate: '2026-11-21' }, account = { name: 'Family', qrToken: 'stable-existing-token' };
  const before = structuredClone(account), model = Invitation.invitationModel(template, event, `https://example.test/#/signin/account/${account.qrToken}`);
  assert.equal(model.qrUrl.endsWith(account.qrToken), true); assert.deepEqual(account, before); assert.equal(model.values[template.fields[0].id], 'Saturday November 21st 2026');
});

test('multiple accounts receive distinct existing QR payloads and no printed names', () => {
  const template = Invitation.createTemplate('Test', background); template.fields.push(Invitation.newField('accountQr', 500, 800));
  const a = Invitation.invitationModel(template, {}, 'https://example.test/#/signin/account/token-a');
  const b = Invitation.invitationModel(template, {}, 'https://example.test/#/signin/account/token-b');
  assert.notEqual(a.qrUrl, b.qrUrl); assert.deepEqual(a.values, {}); assert.deepEqual(b.values, {});
  assert.equal(Invitation.filenameFor('Ben Hall IV / Sherri Hall', 'Christmas'), 'Ben-Hall-IV-Sherri-Hall-Christmas-Invitation.png');
});

test('bulk invitations include only invited accounts with QR access', () => {
  const accounts = [
    { name: 'Invited Without Access', qrToken: 'invite', invitedEvents: { wedding: true }, selectedEvents: { wedding: false } },
    { name: 'Access Without Invite', qrToken: 'access', invitedEvents: { wedding: false }, selectedEvents: { wedding: true } },
    { name: 'Not Invited', qrToken: 'no', invitedEvents: { wedding: false } },
    { name: 'No QR Yet', invitedEvents: { wedding: true } }
  ];
  assert.deepEqual(Invitation.eligibleAccounts(accounts, 'wedding').map(account => account.name), ['Invited Without Access']);
});

test('renderer uses uploaded original dimensions', async () => {
  const originalImage = globalThis.Image;
  let loadedSource = '';
  globalThis.Image = class { set src(value) { loadedSource = this._src = value; queueMicrotask(() => this.onload()); } };
  const operations = [], context = { drawImage: (...args) => operations.push(['image', ...args]), save() {}, beginPath() {}, rect() {}, clip() {}, fillText() {}, restore() {}, fillRect() {}, measureText: () => ({ width: 1 }) };
  const canvas = { width: 0, height: 0, getContext: () => context };
  const template = Invitation.createTemplate('Test', background);
  await Invitation.render(canvas, Invitation.invitationModel(template, {}, 'qr'), { getModuleCount: () => 1, isDark: () => false });
  assert.equal(canvas.width, 720); assert.equal(canvas.height, 1008); assert.equal(operations[0][4], 720); assert.equal(operations[0][5], 1008);
  assert.match(loadedSource, /[?&]v=/, 'background URL is versioned to avoid a stale failed browser request');
  globalThis.Image = originalImage;
});

test('invitation QR renderer does not paint a background', async () => {
  const originalImage = globalThis.Image;
  globalThis.Image = class { set src(value) { this._src = value; queueMicrotask(() => this.onload()); } };
  const fills = [];
  const context = { drawImage() {}, save() {}, beginPath() {}, rect() {}, clip() {}, fillText() {}, restore() {}, fillRect: (...args) => fills.push([context.fillStyle, ...args]), measureText: () => ({ width: 1 }) };
  const canvas = { width: 0, height: 0, getContext: () => context };
  const template = Invitation.createTemplate('Test', background);
  template.fields.push(Invitation.newField('accountQr', 10, 10));
  await Invitation.render(canvas, Invitation.invitationModel(template, {}, 'qr'), { getModuleCount: () => 1, isDark: () => true });
  assert.equal(fills.length, 1);
  assert.equal(fills[0][0], '#000');
  globalThis.Image = originalImage;
});

test('duplicating a template copies layout but creates independent IDs', () => {
  const template = Invitation.createTemplate('Original', background); template.fields.push(Invitation.newField('addressLine2', 3, 4));
  const copy = Invitation.duplicateTemplate(template);
  assert.notEqual(copy.id, template.id); assert.notEqual(copy.fields[0].id, template.fields[0].id); assert.deepEqual({ ...copy.fields[0], id: '' }, { ...template.fields[0], id: '' });
});

test('shared text rendering preserves natural font width rather than squeezing text to fit',async()=>{
 const operations=[],context={save(){},beginPath(){},rect(){},clip(){},restore(){},fillText(...args){operations.push(args);},letterSpacing:'0px',wordSpacing:'0px'};
 const canvas={getContext:()=>context},field={...Invitation.newField('customText',20,30),fontFamily:'Times New Roman',fontSize:44,fontWeight:'700',italic:true,width:120,height:100,letterSpacing:2,wordSpacing:3,customText:'Wide text\nLine two'};
 await Invitation.renderTextField(canvas,field,field.customText);
 assert.equal(context.font,'italic 700 44px "Times New Roman", serif');assert.equal(context.letterSpacing,'2px');assert.equal(context.wordSpacing,'3px');assert.equal(operations.length,2);assert.equal(operations[0].length,3,'fillText must not receive a maxWidth that compresses the font');assert.equal(operations[0][1],0);assert.ok(Math.abs((operations[1][2]-operations[0][2])-52.8)<.001);assert.ok(Math.abs(operations[0][2]-1.6)<.001);
});
test('overflow checks actual glyph bounds, avoiding false line-height and spacing warnings',()=>{
 const context={letterSpacing:'0px',wordSpacing:'0px',measureText:()=>({width:100,actualBoundingBoxLeft:0,actualBoundingBoxRight:100,actualBoundingBoxAscent:-5,actualBoundingBoxDescent:35})};
 const field={...Invitation.newField('eventDate',0,0),width:110,height:36,fontSize:44,lineHeight:2,letterSpacing:3,wordSpacing:4};const model={template:{fields:[field]},values:{[field.id]:'Actual text'}};
 assert.deepEqual(Invitation.overflowDetails({getContext:()=>context},model),[],'visible text fits despite a taller line box');
 context.measureText=()=>({width:150,actualBoundingBoxLeft:0,actualBoundingBoxRight:150,actualBoundingBoxAscent:-5,actualBoundingBoxDescent:35});assert.deepEqual(Invitation.overflowDetails({getContext:()=>context},model),[{label:'Event Date',width:true,height:false}]);
 field.width=160;field.height=20;assert.deepEqual(Invitation.overflowDetails({getContext:()=>context},model),[{label:'Event Date',width:false,height:true}]);
});

test('image elements fit the artwork initially and resize with optional aspect locking',()=>{
 const image={url:'https://runtime.test/logo.png',width:400,height:200},field=Invitation.newImage(image,{width:800,height:1000});
 assert.equal(field.type,'image');assert.equal(field.key,'image');assert.equal(field.width,320);assert.equal(field.height,160);assert.equal(field.x,240);assert.equal(field.lockAspect,true);
 Invitation.resizeImage(field,'width',200);assert.equal(field.height,100);Invitation.resizeImage(field,'height',80);assert.equal(field.width,160);
 field.lockAspect=false;Invitation.resizeImage(field,'width',120);assert.equal(field.height,80);
 const source=Invitation.createTemplate('Images',background);source.fields=[field];const copy=Invitation.duplicateTemplate(source);copy.fields[0].image.width=999;assert.equal(source.fields[0].image.width,400);assert.notEqual(copy.fields[0].id,field.id);
 assert.equal(Invitation.validateTemplate(source,{}),true);assert.throws(()=>Invitation.validateTemplate({...source,fields:[{...field,image:{...image,url:'javascript:alert(1)'}}]},{}),/invalid dimensions or address/);
});
test('invitation exports render image elements at their saved size in field stacking order',async t=>{
 const previous=globalThis.Image;t.after(()=>globalThis.Image=previous);globalThis.Image=class{set src(value){this.url=value;queueMicrotask(()=>this.onload());}};
 const ops=[],ctx={drawImage(image,...geometry){ops.push({kind:'image',url:image.url,geometry});},save(){},beginPath(){},rect(){},clip(){},restore(){},fillText(text){ops.push({kind:'text',text});}};
 const template=Invitation.createTemplate('Layered',background),image=Invitation.newImage({url:'https://runtime.test/logo.png',width:200,height:100},{width:720,height:1008});Object.assign(image,{x:45,y:60,width:100,height:50});
 const text=Invitation.newField('customText',0,0);text.customText='Over image';template.fields=[image,text];
 await Invitation.render({getContext:()=>ctx},Invitation.invitationModel(template,{},''),null);
 assert.equal(ops[0].kind,'image');assert.equal(ops[1].url,'https://runtime.test/logo.png');assert.deepEqual(ops[1].geometry,[45,60,100,50]);assert.equal(ops[2].kind,'text');
});

test('all caps is per invitation value, reversible, and preserves source data and copies',()=>{
 const event={eventTime:'Two o’clock',custom:'Original'},field=Invitation.newField('eventTime',0,0);field.allCaps=true;
 assert.equal(Invitation.fieldValue(field,event),'TWO O’CLOCK');assert.equal(event.eventTime,'Two o’clock');
 const custom=Invitation.newField('customText',0,0);custom.customText='Hello\nWorld';custom.allCaps=true;assert.equal(Invitation.fieldValue(custom,event),'HELLO\nWORLD');assert.equal(custom.customText,'Hello\nWorld');
 const date=Invitation.newField('eventDate',0,0);date.allCaps=true;assert.equal(Invitation.fieldValue(date,{eventDate:'2027-08-10'}),Invitation.fieldValue({...date,allCaps:false},{eventDate:'2027-08-10'}).toUpperCase());
 const template=Invitation.createTemplate('Caps',background);template.fields=[field,custom];const copy=Invitation.duplicateTemplate(JSON.parse(JSON.stringify(template)));assert.equal(copy.fields[0].allCaps,true);copy.fields[0].allCaps=false;assert.equal(template.fields[0].allCaps,true);assert.equal(Invitation.fieldValue(copy.fields[0],event),'Two o’clock');
});
test('text centers actual glyph bounds vertically and follows box height for single and multiline text',async()=>{
 const ops=[],ctx={save(){},beginPath(){},rect(){},clip(){},restore(){},measureText(){return {actualBoundingBoxAscent:-5,actualBoundingBoxDescent:25};},fillText(text,x,y){ops.push(y);}},canvas={getContext:()=>ctx};
 const field={...Invitation.newField('customText',0,0),height:100,fontSize:20,lineHeight:1.5};await Invitation.renderTextField(canvas,field,'One');assert.equal(ops.pop(),35);
 field.height=140;await Invitation.renderTextField(canvas,field,'One');assert.equal(ops.pop(),55);
 await Invitation.renderTextField(canvas,field,'One\nTwo');assert.deepEqual(ops,[40,70]);
});

test('plain month day year invitation format omits ordinal suffixes and comma',()=>{
 assert.ok(Invitation.EVENT_DATE_FORMATTERS.some(([key])=>key==='month-day-year'));
 for(const day of [1,2,3,6,11,21,22,23,30])assert.equal(Invitation.formatEventDate(`2026-11-${String(day).padStart(2,'0')}`,'month-day-year'),`November ${day} 2026`);
 const field={...Invitation.newField('eventDate',0,0),formatter:'month-day-year',allCaps:true};assert.equal(Invitation.fieldValue(field,{eventDate:'2026-11-06'}),'NOVEMBER 6 2026');assert.equal(Invitation.formatEventDate('','month-day-year'),'');
});

test('date-format choices preview the current gathering and preserve formatter keys',()=>{
 const field=Invitation.newField('eventDate',0,0),a={eventDate:'2027-08-10',rsvpDate:'2027-07-01'},b={eventDate:'2026-11-21',rsvpDate:'2026-11-07'};
 const options=Invitation.dateFormatOptions(field,a);assert.equal(options.find(o=>o.value==='month-day-year').label,'August 10 2027');assert.equal(options.find(o=>o.value==='month-ordinal-year').label,'August 10th 2027');
 assert.equal(Invitation.dateFormatOptions(field,b).find(o=>o.value==='month-day-year').label,'November 21 2026');assert.deepEqual(options.map(o=>o.value),Invitation.EVENT_DATE_FORMATTERS.map(([key])=>key));
 assert.equal(Invitation.dateFormatOptions({...field,allCaps:true},a).find(o=>o.value==='month-day-year').label,'AUGUST 10 2027');
 assert.equal(Invitation.dateFormatOptions(Invitation.newField('rsvpBy',0,0),a)[0].label,'Kindly RSVP By Jul. 1');assert.ok(Invitation.dateFormatOptions(field,{}).every(o=>!o.label.includes('2026')));assert.equal(a.eventDate,'2027-08-10');
});

test('spaced weekday date supports plain day numbers and previews the real date with gaps',()=>{
 const field={...Invitation.newField('eventDate',0,0),formatter:'weekday-month-day-year-spaced'},event={eventDate:'2026-11-06'};
 assert.equal(Invitation.fieldValue(field,event),'Friday November 6 2026');
 assert.equal(Invitation.dateFormatOptions(field,event).find(o=>o.value===field.formatter).label,'Friday\u2002\u2002November\u2002\u20026\u2002\u20022026');
 assert.equal(Invitation.fieldValue({...field,allCaps:true},event),'FRIDAY NOVEMBER 6 2026');
 assert.equal(Invitation.dateFormatOptions(field,event).find(o=>o.value==='month-day-year').label,'November 6 2026');
});

test('RSVP invitation prefix is Kindly RSVP By with reversible capitalization',()=>{
 const field=Invitation.newField('rsvpBy',0,0),event={rsvpDate:'2026-11-07'};
 assert.equal(Invitation.fieldValue(field,event),'Kindly RSVP By Nov. 7');
 assert.equal(Invitation.fieldValue({...field,allCaps:true},event),'KINDLY RSVP BY NOV. 7');
 assert.equal(Invitation.formatRsvpDate(event.rsvpDate,'short-month-day'),'Nov. 7');assert.equal(Invitation.formatRsvpDate(event.rsvpDate,'month-day'),'November 7');
 assert.equal(event.rsvpDate,'2026-11-07');assert.equal(Invitation.formatRsvpDate(''),'');
});

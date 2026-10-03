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
  assert.equal(Invitation.formatRsvpDate('2026-11-07'), 'By Nov. 7');
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

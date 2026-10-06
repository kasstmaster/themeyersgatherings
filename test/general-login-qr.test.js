import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
await import('../invitation.js');
const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
function fixture() {
  const context = vm.createContext({ window: { location: { origin: 'https://example.com', pathname: '/gatherings/' }, Invitation: globalThis.Invitation }, state: {}, viewedEventId: 'wedding', appState: { accounts: [
    { name: 'Account One', qrToken: 'one', invitedEvents: { wedding: true } },
    { name: 'Account Two', invitedEvents: { wedding: true } },
    { name: 'Not Invited', qrToken: 'three', invitedEvents: { wedding: false } }
  ] } });
  vm.runInContext(source.slice(source.indexOf('function generalLoginUrl('), source.indexOf('function safeQrFilename(')) + source.slice(source.indexOf('function invitationAccounts('), source.indexOf('function canvasBlob(')), context);
  return context;
}
test('general login QR and template fallback use the real login URL; individual mode keeps scoped account URLs', () => {
  const context = fixture();
  assert.equal(context.invitationQrUrl(null), 'https://example.com/gatherings/');
  assert.equal(context.accountQrUrl({ generalLogin: true }), 'https://example.com/gatherings/');
  assert.equal(context.invitationQrUrl(context.appState.accounts[0]), 'https://example.com/gatherings/#/signin/account/one');
  context.state.invitationQrMode = 'general';
  assert.equal(context.invitationQrUrl(context.appState.accounts[0]), 'https://example.com/gatherings/');
});
test('general QR invitations include invited accounts without tokens while individual mode requires a token', () => {
  const context = fixture();
  assert.equal(context.invitationAccounts().length, 1);
  context.state.invitationQrMode = 'general';
  assert.equal(context.invitationAccounts().length, 2);
  assert.ok(context.invitationAccounts().every(account => account.invitedEvents.wedding));
});

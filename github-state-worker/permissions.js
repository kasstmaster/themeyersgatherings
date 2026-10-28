import {accountPeople,normalizedPerson} from '../scripts/anylist-accounts.js';
export const accountKey=account=>account.qrToken||account.anyListCategoryId||account.name;
export function eventAllowed(account,id){
 if(account?.selectedEvents&&typeof account.selectedEvents==='object')return account.selectedEvents[id]===true;
 return ['thanksgiving','christmas','wedding'].includes(id)&&(account?.alwaysInvite===true||account?.selected!==false);
}
export function actorAccount(state,actor){
 const account=state.accounts.find(value=>accountKey(value)===actor.accountId);
 return account&&accountPeople(account.name).some(name=>normalizedPerson(name)===normalizedPerson(actor.person))&&Object.keys(state.events).some(id=>eventAllowed(account,id))?account:null;
}

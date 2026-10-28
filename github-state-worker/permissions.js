import '../gathering-history.js';
import {accountPeople,normalizedPerson} from '../scripts/anylist-accounts.js';
export const accountKey=account=>account.qrToken||account.anyListCategoryId||account.name;
export function eventAllowed(account,id){
 if(account?.selectedEvents&&typeof account.selectedEvents==='object')return account.selectedEvents[id]===true;
 return ['thanksgiving','christmas','wedding'].includes(id)&&(account?.alwaysInvite===true||account?.selected!==false);
}
export function accountHasAccess(state,account){return Object.keys(state.events || {}).some(id=>eventAllowed(account,id))||Object.values(state.gatheringHistory || {}).some(dates=>Object.values(dates).some(snapshot=>GatheringHistory.historicalAccount(state,account,snapshot)));}
export function actorAccount(state,actor){
 const account=state.accounts.find(value=>accountKey(value)===actor.accountId);
 return account&&accountPeople(account.name).some(name=>normalizedPerson(name)===normalizedPerson(actor.person))&&accountHasAccess(state,account)?account:null;
}

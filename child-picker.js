// Shared child selection state for every gathering's RSVP.
(() => {
  const key = name => String(name || '').trim().toLocaleLowerCase();
  function create(known, saved = []) {
    const unique = [...new Map((known || []).filter(name => key(name)).map(name => [key(name),String(name).trim()])).values()];
    const selected = [], custom = [];
    for (const name of saved) {
      const match=unique.find(child=>key(child)===key(name));
      if(match && !selected.includes(match))selected.push(match);
      else custom.push(String(name || ''));
    }
    return {known:unique,selected,custom};
  }
  function names(state) {return [...state.selected,...state.custom.map(name=>String(name || '').trim())];}
  function toggle(state,index,checked) {
    const name=state.known[index];
    if(!name)return;
    state.selected=state.selected.filter(child=>child!==name);
    if(checked && names(state).length<20)state.selected.push(name);
  }
  function add(state) {if(names(state).length<20)state.custom.push('');}
  function remove(state,index) {state.custom.splice(index,1);}
  function clear(state) {state.selected=[];state.custom=[];}
  function remapMeals(before,after,selections) {
    return selections.flatMap(selection=>{
      if(selection.type!=='child')return [selection];
      const name=before[selection.index];
      const index=name?after.findIndex(candidate=>key(candidate)===key(name)):selection.index<after.length?selection.index:-1;
      return index>=0?[{...selection,index}]:[];
    });
  }
  globalThis.ChildPicker={create,names,toggle,add,remove,clear,remapMeals};
})();

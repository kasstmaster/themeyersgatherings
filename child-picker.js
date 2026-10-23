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
  function names(state,count) {
    const selected=state.selected.slice(0,count);
    return [...selected,...Array.from({length:Math.max(0,count-selected.length)},(_,index)=>String(state.custom[index] || '').trim())];
  }
  function resize(state,count) {state.selected=state.selected.slice(0,count);}
  function toggle(state,index,checked,count) {
    const name=state.known[index];
    if(!name)return;
    state.selected=state.selected.filter(child=>child!==name);
    if(checked && state.selected.length<count)state.selected.push(name);
  }
  function remapMeals(before,after,selections) {
    return selections.flatMap(selection=>{
      if(selection.type!=='child')return [selection];
      const name=before[selection.index];
      const index=name?after.findIndex(candidate=>key(candidate)===key(name)):selection.index<after.length?selection.index:-1;
      return index>=0?[{...selection,index}]:[];
    });
  }
  globalThis.ChildPicker={create,names,resize,toggle,remapMeals};
})();

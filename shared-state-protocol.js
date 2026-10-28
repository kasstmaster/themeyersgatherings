/* Shared wire protocol. Revisions are server-owned; arrays are atomic changes. */
(() => {
  const copy=value=>value===undefined?undefined:structuredClone(value);
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const object=value=>value!==null && typeof value==='object' && !Array.isArray(value);
  const safe=path=>Array.isArray(path)&&path.length>0&&path.length<40&&path.every(key=>typeof key==='string'&&key.length<300&&!['__proto__','prototype','constructor'].includes(key));
  function changes(before,after,path=[]){
    if(same(before,after))return [];
    if(object(before)&&object(after))return [...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>changes(before[key],after[key],[...path,key]));
    return [{path,...(after===undefined?{remove:true}:{value:copy(after)})}];
  }
  function apply(state,operations){
    if(!Array.isArray(operations)||operations.length>5000)throw new Error('Invalid changes');
    const next=copy(state);
    for(const operation of operations){
      if(!object(operation)||!safe(operation.path)||operation.remove!==true&&!Object.hasOwn(operation,'value'))throw new Error('Invalid change');
      let parent=next;
      for(const key of operation.path.slice(0,-1)){if(!object(parent[key]))throw new Error('Invalid change path');parent=parent[key];}
      const key=operation.path.at(-1);if(operation.remove)delete parent[key];else parent[key]=copy(operation.value);
    }
    return next;
  }
  globalThis.SharedStateProtocol={changes,apply,same};
})();

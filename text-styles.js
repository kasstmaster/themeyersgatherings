// Safe, shared inline font styling layered onto the existing Markdown renderer.
(() => {
  const fonts=['Arial','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','Garamond'];
  const sizes=[8,10,11,12,14,16,18,20,24,28,32,40,48,64,72,96];
  function properties(values) {
    const entries=Object.entries(values);
    if(!entries.length || entries.some(([key,value])=>key==='font'?!fonts.includes(value):key==='size'?!(Number.isInteger(Number(value)) && Number(value)>=8 && Number(value)<=96):key==='underline'?value!=='true':['color','highlight','border'].includes(key)?!/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value):true))return null;
    return entries.map(([key,value])=>key==='font'?`font-family:'${value}'`:key==='size'?`font-size:calc(${Number(value)}px * var(--fitted-text-scale,1))`:key==='color'?`color:${value};--selection-text-color:${value}`:key==='highlight'?`background-color:${value}`:key==='underline'?'text-decoration:underline':`border:1px solid ${value}`).join(';');
  }
  function mark(text,values) {
    if(!properties(values))return text;
    const spec=Object.entries(values).map(([key,value])=>`${key}=${value}`).join(';');
    return String(text||'Text').split('\n').map(line=>line.trim()?`{{style:${spec}}}${line}{{/style}}`:line).join('\n');
  }
  function render(value,format) {
    const fragments=[];let prefix='\uE000style';
    while(value.includes(prefix))prefix+='x';
    const token=html=>`${prefix}${fragments.push(html)-1}\uE001`;
    function prepare(text) {
      let result='',cursor=0;const stack=[];
      const pattern=/`[^`\r\n]+`|\[([^\]\r\n]+)\]\(([^)\r\n]+)\)|\{\{style:([^{}\r\n]+)\}\}|\{\{\/style\}\}/g;
      for(const match of text.matchAll(pattern)) {
        result+=text.slice(cursor,match.index);cursor=match.index+match[0].length;
        if(match[0].startsWith('`'))result+=match[0];
        else if(match[1]!==undefined)result+=`[${prepare(match[1])}](${match[2]})`;
        else if(match[3]!==undefined) {
          const pairs=match[3].split(';').map(part=>part.split('='));
          const style=pairs.every(pair=>pair.length===2)?properties(Object.fromEntries(pairs)):null;
          stack.push(Boolean(style));result+=style?token(`<span${Object.hasOwn(Object.fromEntries(pairs),'color')?' class="text-selection-color"':pairs.some(([key])=>['highlight','border'].includes(key))?' class="inline-text-appearance-style"':''} style="${style}">`):match[0];
        } else {
          const valid=stack.pop();result+=valid?token('</span>'):match[0];
        }
      }
      result+=text.slice(cursor);while(stack.length)if(stack.pop())result+=token('</span>');
      return result;
    }
    const prepared=prepare(value),pattern=new RegExp(`${prefix}(\\d+)\uE001`,'g');
    return format(prepared,{plain:text=>text.replace(pattern,'')}).replace(pattern,(_,index)=>fragments[Number(index)]);
  }
  function rebase(markup,source,current){
    if(source===current)return markup;
    const oldTokens=[...source.matchAll(/\d+|\D+/g)],newTokens=[...current.matchAll(/\d+|\D+/g)];
    const compatible=oldTokens.length===newTokens.length && oldTokens.every((token,index)=>/^\d+$/.test(token[0])?/^\d+$/.test(newTokens[index][0]):token[0]===newTokens[index][0]);
    const boundary=offset=>{
      if(!source.length)return 0;
      if(compatible){for(let index=0;index<oldTokens.length;index++){const old=oldTokens[index],next=newTokens[index];if(offset<=old.index+old[0].length)return next.index+Math.round((offset-old.index)*next[0].length/old[0].length);}}
      return Math.round(offset*current.length/source.length);
    };
    let cursor=0;
    return markup.split(/(\{\{style:[^{}]+\}\}|\{\{\/style\}\}|\*\*|\*|__|_|`)/).map(part=>{
      if(/^\{\{(?:style:|\/style)/.test(part)||/^(?:\*\*|\*|__|_|`)$/.test(part))return part;
      const start=cursor;cursor+=part.length;return current.slice(boundary(start),boundary(cursor));
    }).join('');
  }
  globalThis.TextStyles={fonts,sizes,mark,render,rebase};
})();

// Safe, shared inline font styling layered onto the existing Markdown renderer.
(() => {
  const fonts=['Arial','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','Garamond'];
  const sizes=[8,10,11,12,14,16,18,20,24,28,32,40,48,64,72,96];
  const effectBounds={shadowX:[-20,20],shadowY:[-20,20],shadowBlur:[0,40],outlineWidth:[0,8]};
  const color=value=>/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value);
  function properties(values) {
    const entries=Object.entries(values);
    if(!entries.length || entries.some(([key,value])=>{
      if(key==='font')return !fonts.includes(value);
      if(key==='size')return !(Number.isInteger(Number(value))&&Number(value)>=8&&Number(value)<=96);
      if(key==='lineHeight')return !Number.isFinite(Number(value))||Number(value)<0.5||Number(value)>5;
      if(key==='underline')return value!=='true';
      if(['color','highlight','border'].includes(key))return !color(value);
      if(['shadow','outline'].includes(key))return value!=='none'&&!color(value);
      if(effectBounds[key])return String(value).trim()===''||!Number.isFinite(Number(value))||Number(value)<effectBounds[key][0]||Number(value)>effectBounds[key][1];
      return true;
    }))return null;
    const css=entries.filter(([key])=>!['shadow','outline',...Object.keys(effectBounds)].includes(key)).map(([key,value])=>key==='font'?`font-family:'${value}'`:key==='size'?`font-size:calc(${Number(value)}px * var(--fitted-text-scale,1))`:key==='color'?`color:${value};--selection-text-color:${value}`:key==='highlight'?`background-color:${value}`:key==='lineHeight'?`line-height:${Number(value)}`:key==='underline'?'text-decoration:underline':`border:1px solid ${value}`);
    if(values.shadow)css.push(values.shadow==='none'?'text-shadow:none':`text-shadow:${Number(values.shadowX??1)}px ${Number(values.shadowY??1)}px ${Number(values.shadowBlur??2)}px ${values.shadow}`);
    if(values.outline)css.push(`-webkit-text-stroke-width:${values.outline==='none'?0:Number(values.outlineWidth??1)}px`,`-webkit-text-stroke-color:${values.outline==='none'?'transparent':values.outline}`,'paint-order:stroke fill');
    return css.join(';')||null;
  }
  function effects(style,colorParts,computedStyle){
    let resolved;
    const result={},read=(property,key)=>{
      const raw=style.getPropertyValue?.(property)||style[key]||'';
      // Older inline styles may already contain palette variables. Resolve only
      // explicit declarations, so inherited effects are never saved as overrides.
      if(raw.includes('var(')&&computedStyle){resolved??=computedStyle();return resolved.getPropertyValue?.(property)||resolved[key]||raw;}
      return raw;
    };
    const encode=value=>{const part=colorParts(value);return part.hex+(part.alpha<100?Math.round(part.alpha/100*255).toString(16).padStart(2,'0'):'');};
    const shadow=read('text-shadow','textShadow');
    if(shadow==='none')result.shadow='none';
    else if(shadow){
      const match=shadow.match(/rgba?\([^)]*\)|#[\da-f]{6,8}/i),offsets=shadow.replace(match?.[0]||'','').match(/-?[\d.]+px/g);
      if(match&&offsets?.length===3){result.shadow=encode(match[0]);[result.shadowX,result.shadowY,result.shadowBlur]=offsets.map(value=>String(parseFloat(value)));}
    }
    const width=read('-webkit-text-stroke-width','webkitTextStrokeWidth');
    if(width){result.outline=parseFloat(width)>0?encode(read('-webkit-text-stroke-color','webkitTextStrokeColor')):'none';result.outlineWidth=String(parseFloat(width)||0);}
    return result;
  }
  function mark(text,values) {
    if(!properties(values))return text;
    const spec=Object.entries(values).map(([key,value])=>`${key}=${value}`).join(';');
    function lineStyle(line){
      if(!line.trim())return line;
      const aligned=line.match(/^\{\{align:(left|center|right|justify)\}\}(.*)\{\{\/align\}\}$/);
      if(aligned)return `{{align:${aligned[1]}}}${lineStyle(aligned[2])}{{/align}}`;
      const prefix=line.match(/^((?:> ?)+)(.*)$/)||line.match(/^(\s*(?:[-+]|\d+[.)])\s+)(.*)$/);
      if(prefix)return prefix[1]+lineStyle(prefix[2]);
      return `{{style:${spec}}}${line}{{/style}}`;
    }
    return String(text??'').split('\n').map(lineStyle).join('\n');
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
          stack.push(Boolean(style));result+=style?token(`<span${Object.hasOwn(Object.fromEntries(pairs),'color')?' class="text-selection-color"':pairs.some(([key])=>['highlight','border','shadow','outline'].includes(key))?' class="inline-text-appearance-style"':''} style="${style}">`):match[0];
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
    return markup.split(/(\{\{style:[^{}]+\}\}|\{\{\/style\}\}|\{\{align:[a-z]+\}\}|\{\{\/align\}\}|\*\*|\*|__|_|`)/).map(part=>{
      if(/^\{\{(?:style:|\/style|align:|\/align)/.test(part)||/^(?:\*\*|\*|__|_|`)$/.test(part))return part;
      const start=cursor;cursor+=part.length;return current.slice(boundary(start),boundary(cursor));
    }).join('');
  }
  globalThis.TextStyles={fonts,sizes,mark,render,rebase,properties,effects};
})();

/* Discover every CSS color, including gradients, borders, shadows and states.
   Original declarations remain fallbacks, so an untouched gathering is unchanged. */
(() => {
  const namedColors=new Set('aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato transparent turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' '));
  const validColor = value => typeof CSS !== 'undefined' && CSS.supports('color',value);
  const hash = value => {let result=2166136261;for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return (result>>>0).toString(36);};
  function endFunction(value,start){
    let depth=0,quote='';
    for(let i=start;i<value.length;i++){
      const char=value[i];
      if(quote){if(char==='\\')i++;else if(char===quote)quote='';continue;}
      if(char==='"'||char==="'"){quote=char;continue;}
      if(char==='(')depth++;if(char===')'&&!--depth)return i+1;
    }
    return value.length;
  }
  function replaceColors(value,register,isColor=validColor){
    let output='',index=0,slot=0;
    while(index<value.length){
      const char=value[index];
      if(char==='"'||char==="'"){
        let end=index+1;while(end<value.length){if(value[end]==='\\'){end+=2;continue;}if(value[end++]===char)break;}
        output+=value.slice(index,end);index=end;continue;
      }
      const hex=char==='#'&&/^#[\da-f]{8}\b|^#[\da-f]{6}\b|^#[\da-f]{4}\b|^#[\da-f]{3}\b/i.exec(value.slice(index));
      const word=!hex&&/^[a-z_-][a-z\d_-]*/i.exec(value.slice(index));
      if(hex){output+=register(hex[0],slot++);index+=hex[0].length;continue;}
      if(word){
        const name=word[0],lower=name.toLowerCase(),next=index+name.length;
        if(value[next]==='('&&lower==='url'){
          const end=endFunction(value,next);output+=value.slice(index,end);index=end;continue;
        }
        if(value[next]==='('&&/^(?:rgba?|hsla?|oklch|oklab|lab|lch|color)$/.test(lower)){
          const end=endFunction(value,next),literal=value.slice(index,end);
          output+=isColor(literal)?register(literal,slot++):literal;index=end;continue;
        }
        output+=namedColors.has(lower)&&isColor(name)?register(name,slot++):name;
        index=next;continue;
      }
      output+=char;index++;
    }
    return output;
  }
  function registry(){
    const entries=new Map();
    const register=(context,selector,property,literal,slot)=>{
      const key='p'+hash(`${context}|${property}|${slot}|${literal}`),variable=`--gathering-detail-${key}`;
      if(!entries.has(key))entries.set(key,{key,variable,default:literal,selector,property});
      return `var(${variable},${literal})`;
    };
    const registerOpacity=(context,selector,literal)=>{
      const key='p'+hash(`${context}|opacity|${literal}`),variable=`--gathering-detail-${key}`;
      entries.set(key,{key,variable,default:literal,kind:'opacity',selector,property:'opacity'});
      return `var(${variable},${literal})`;
    };
    const registerReference=(context,selector,property,wrappers,priority)=>{
      const key='p'+hash(`${context}|reference|${property}`);
      const target=property==='background'?'background-color':/^border(?:-(?:top|right|bottom|left))?$/.test(property)?property+'-color':property;
      entries.set(key,{key,kind:'reference',selector,property:target,wrappers,priority});
    };
    return {entries,register,registerOpacity,registerReference};
  }
  function compileSheets(sheets,isColor=validColor){
    const result=registry();
    function walk(rules,scope,wrappers=[],keepAll=false){
      const occurrences=new Map();
      return Array.from(rules).map(rule=>{
        if(rule.cssRules && !rule.style){
          const prefix=rule.cssText.slice(0,rule.cssText.indexOf('{')).trim();
          const inner=walk(rule.cssRules,`${scope}|${prefix}`,[...wrappers,prefix],/^@(?:-webkit-)?keyframes\b/i.test(prefix));return inner?`${prefix}{${inner}}`:'';
        }
        if(!rule.style)return '';
        const selector=rule.selectorText || rule.keyText || rule.cssText.slice(0,rule.cssText.indexOf('{')).trim();
        const ordinal=occurrences.get(selector)||0;occurrences.set(selector,ordinal+1);
        const declarations=[];
        for(let i=0;i<rule.style.length;i++){
          const property=rule.style.item(i),value=rule.style.getPropertyValue(property);
          const converted=property==='opacity'&&/^(?:0?\.\d+|[01])$/.test(value.trim())
            ?result.registerOpacity(`${scope}|${selector}|${ordinal}`,selector,value.trim())
            :replaceColors(value,(literal,slot)=>result.register(`${scope}|${selector}|${ordinal}`,selector,property,literal,slot),isColor);
          if(converted===value&&(/^(?:color|background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|outline-color|fill|stroke|accent-color|caret-color|text-decoration-color)$/.test(property)))result.registerReference(`${scope}|${selector}|${ordinal}`,selector,property,wrappers,rule.style.getPropertyPriority(property));
          if(converted!==value||keepAll)declarations.push(`${property}:${converted}${rule.style.getPropertyPriority(property)?'!important':''}`);
        }
        return declarations.length?`${selector}{${declarations.join(';')}}`:'';
      }).join('\n');
    }
    result.css=sheets.map((sheet,index)=>{
      try{return walk(sheet.cssRules,sheet.href || `inline-sheet-${index}`);}catch{return '';}
    }).join('\n');
    return result;
  }
  let catalog,started=false,applied=new Set(),observer,activeStyle;
  const inlineValues=new WeakMap();
  function elementPath(element){
    const parts=[];for(let node=element;node&&node!==document.body;node=node.parentElement){
      if(node.id){parts.unshift('#'+node.id);break;}
      const siblings=Array.from(node.parentElement?.querySelectorAll(':scope > *') || []).filter(sibling=>sibling.tagName===node.tagName);
      parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node)+1})`);
    }
    return parts.join(' > ') || 'body';
  }
  function scanInline(element){
    if(!element.isConnected||!element.style||element.closest?.('.element-editor-toolbar,[contenteditable],.appearance-editor,.appearance-trigger,.text-selection-color,.inline-text-appearance-style')||globalThis.ElementAppearance?.manages(element))return;
    const previous=inlineValues.get(element)||new Map(),selector=elementPath(element);
    for(const property of Array.from(element.style)){
      if(property.startsWith('--'))continue;
      const value=element.style.getPropertyValue(property);
      if(previous.get(property)===value)continue;
      const converted=replaceColors(value,(literal,slot)=>catalog.register(`inline|${selector}`,selector,property,literal,slot));
      if(converted!==value)element.style.setProperty(property,converted,element.style.getPropertyPriority(property));
      previous.set(property,element.style.getPropertyValue(property));
    }
    inlineValues.set(element,previous);
  }
  function start(){
    if(started)return;started=true;
    catalog=compileSheets(Array.from(document.styleSheets));
    const style=document.createElement('style');style.id='gatheringPaletteRules';style.textContent=catalog.css;document.head.append(style);
    activeStyle=document.createElement('style');activeStyle.id='gatheringPaletteOverrides';document.head.append(activeStyle);
    document.querySelectorAll('[style]').forEach(scanInline);
    observer=new MutationObserver(records=>{
      const targets=new Set();
      for(const record of records){
        if(record.type==='attributes')targets.add(record.target);
        for(const node of record.addedNodes || [])if(node.nodeType===1){targets.add(node);node.querySelectorAll('[style]').forEach(element=>targets.add(element));}
      }
      targets.forEach(scanInline);
    });
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style']});
  }
  function apply(values={}){
    start();
    for(const key of applied)for(const element of [document.documentElement,document.body])element.style.removeProperty(`--gathering-detail-${key}`);
    applied=new Set();
    const rules=[];
    for(const [key,value] of Object.entries(values))if(/^p[a-z\d]+$/.test(key)&&typeof value==='string'&&(validColor(value)||/^(?:0?\.\d+|[01])$/.test(value))){
      for(const element of [document.documentElement,document.body])element.style.setProperty(`--gathering-detail-${key}`,value);
      applied.add(key);
      const entry=catalog.entries.get(key);
      if(entry?.kind==='reference'){
        let rule=`${entry.selector}{${entry.property}:${value}${entry.priority?'!important':''}}`;
        for(const wrapper of [...entry.wrappers].reverse())rule=`${wrapper}{${rule}}`;
        rules.push(rule);
      }
    }
    activeStyle.textContent=rules.join('\n');
  }
  globalThis.GatheringPalette={replaceColors,compileSheets,apply};
})();

// Popup text travels with its authored link, so page/gathering visibility stays intact.
(() => {
  const prefix='#popup-text:';
  let session;
  function encode(text){return prefix+encodeURIComponent(String(text)).replace(/[!'()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());}
  function decode(value){if(typeof value!=='string'||!value.startsWith(prefix))return null;try{return decodeURIComponent(value.slice(prefix.length));}catch{return null;}}
  function href(element){
    const value=element?.getAttribute('href')||'';
    const candidate=value.startsWith(prefix)?value:value==='#popup-text'?element.dataset.textPopup:'';
    return decode(candidate)!==null?candidate:'';
  }
  function reset(){session=null;document.getElementById('textPopupContent').replaceChildren();document.getElementById('textPopupHeading').textContent='More information';}
  function close(){if(session)globalThis.ElementEditor?.flush();const dialog=document.getElementById('textPopupDialog');if(dialog?.open)dialog.close();if(dialog)reset();}
  function open(element){
    const text=decode(href(element));if(text===null)return;
    globalThis.ElementEditor?.flush();
    const source=SiteEditing.textOwner(element)||element.parentElement;
    session={eventId:SiteEditing.editorContext?.eventId,source:ElementAppearance.selector(source),index:[...source.querySelectorAll('a')].indexOf(element),href:href(element)};
    const dialog=document.getElementById('textPopupDialog');
    document.getElementById('textPopupHeading').textContent=element.textContent.trim()||'More information';
    document.getElementById('textPopupContent').innerHTML=globalThis.formatEditableText(text);
    if(!dialog.open)globalThis.showSiteDialog(dialog);
    render();
  }
  function render(){
    const dialog=document.getElementById('textPopupDialog');
    if(!session || !dialog.open)return;
    const ctx=SiteEditing.editorContext;
    if(session.eventId!==ctx?.eventId){close();return;}
    const source=document.querySelector(session.source),link=source?.querySelectorAll('a')[session.index];
    if(!link || !href(link)){close();return;}
    session.href=href(link);
    const content=document.getElementById('textPopupContent');
    if(!content.isContentEditable && !globalThis.ElementEditor?.ownsText?.(content)){
      const html=globalThis.formatEditableText(decode(session.href));if(content.innerHTML!==html)content.innerHTML=html;
    }
    // The body uses the same textarea field/editor as ordinary page text. Its
    // commit updates the original authored link, never a global popup text key.
    const fields=[{label:'Popup text',type:'textarea',value:decode(session.href)}],options={inlineLineHeight:true};
    const commit=([value])=>{
      if(session?.eventId!==SiteEditing.editorContext?.eventId || !link.isConnected || href(link)!==session.href)return;
      ElementEditor.replacePopupText(source,link,value);session.href=href(link);
    };
    SiteEditing.field(content,'text',fields,commit,options);
    const record=SiteEditing.editorFor(content);if(record)Object.assign(record,{fields,commit,options});
  }
  globalThis.TextPopups={encode,decode,href,open,close,render};
  if(typeof document!=='undefined'){
    const activate=event=>{const link=event.target.closest?.('a');if(!href(link))return;event.preventDefault();if(!globalThis.SiteEditing?.enabled){event.stopPropagation();open(link);}};
    document.addEventListener('click',activate,true);document.addEventListener('auxclick',activate,true);
    document.addEventListener('DOMContentLoaded',()=>{
      const dialog=document.getElementById('textPopupDialog');
      dialog.querySelector('.modal-close').addEventListener('click',close);
      dialog.addEventListener('close',()=>{if(!dialog.open){globalThis.ElementEditor?.flush();reset();}});
    });
  }
})();

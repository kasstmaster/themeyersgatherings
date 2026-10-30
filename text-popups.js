// Popup text travels with its authored link, so page/gathering visibility stays intact.
(() => {
  const prefix='#popup-text:';
  function encode(text){return prefix+encodeURIComponent(String(text)).replace(/[!'()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase());}
  function decode(value){if(typeof value!=='string'||!value.startsWith(prefix))return null;try{return decodeURIComponent(value.slice(prefix.length));}catch{return null;}}
  function href(element){
    const value=element?.getAttribute('href')||'';
    const candidate=value.startsWith(prefix)?value:value==='#popup-text'?element.dataset.textPopup:'';
    return decode(candidate)!==null?candidate:'';
  }
  function reset(){document.getElementById('textPopupContent').replaceChildren();document.getElementById('textPopupHeading').textContent='More information';}
  function close(){const dialog=document.getElementById('textPopupDialog');if(dialog?.open)dialog.close();if(dialog)reset();}
  function open(element){
    const text=decode(href(element));if(text===null)return;
    const dialog=document.getElementById('textPopupDialog');
    document.getElementById('textPopupHeading').textContent=element.textContent.trim()||'More information';
    document.getElementById('textPopupContent').innerHTML=globalThis.formatEditableText(text);
    if(!dialog.open)globalThis.showSiteDialog(dialog);
  }
  globalThis.TextPopups={encode,decode,href,open,close};
  if(typeof document!=='undefined'){
    const activate=event=>{const link=event.target.closest?.('a');if(!href(link))return;event.preventDefault();if(!globalThis.SiteEditing?.enabled){event.stopPropagation();open(link);}};
    document.addEventListener('click',activate,true);document.addEventListener('auxclick',activate,true);
    document.addEventListener('DOMContentLoaded',()=>{
      const dialog=document.getElementById('textPopupDialog');
      dialog.querySelector('.modal-close').addEventListener('click',close);
      dialog.addEventListener('close',()=>{if(!dialog.open)reset();});
    });
  }
})();

// All gatherings share one first-page RSVP date sizing rule.
(() => {
  const selector='#rsvpFirstPageDate';
  const observed=new WeakSet();
  function fit(element) {
    element.style.removeProperty('font-size');
    const width=element.clientWidth;
    if(!width || !element.textContent.trim())return;
    for(let pass=0;pass<3 && element.scrollWidth>width;pass++) {
      const size=parseFloat(getComputedStyle(element).fontSize);
      if(!Number.isFinite(size))return;
      element.style.fontSize=`${Math.floor(size*(width-1)/element.scrollWidth*10)/10}px`;
    }
  }
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target))):null;
  function fitAll() {
    document.querySelectorAll(selector).forEach(element=>{
      if(!observed.has(element)){observed.add(element);resize?.observe(element);}
      fit(element);
    });
  }
  const changes=new MutationObserver(fitAll);
  changes.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',fitAll);
  document.fonts?.ready.then(fitAll);
  globalThis.DateText={fit,fitAll};
  fitAll();
})();

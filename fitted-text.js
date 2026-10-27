// All gatherings share one sizing rule for RSVP titles and the first-page date.
(() => {
  const selector='#rsvpFirstPageDate,#rsvpDialog h1,#rsvpDialog h2,#rsvpDialog h3,#rsvpDialog h4,#rsvpDialog h5,#rsvpDialog h6,#rsvpDialog legend,.site-edit-mode #rsvpConfirmEvent>span,.site-edit-mode #hostFirstPageActions button>span,.site-edit-mode #weddingRsvpUploadToolbar button>span,.site-edit-mode #rsvpDialog .primary-button:not(:has(>span))';
  const observed=new Set();
  function fit(element) {
    if(element.closest?.('.inline-editor,.inline-edit-tools'))return;
    element.style.removeProperty('--fitted-text-scale');
    // Fit from the saved size, not the theme default. Redraws must not erase
    // the gathering's authored typography while measuring available width.
    const authored=globalThis.ElementAppearance?.values?.(element)?.fontSize;
    if(Number.isFinite(authored) && authored>=8 && authored<=96)element.style.setProperty('font-size',`calc(${authored}px * var(--fitted-text-scale,1))`,'important');
    else element.style.removeProperty('font-size');
    const width=element.clientWidth;
    if(!width || !element.textContent.trim())return;
    const maximum=parseFloat(getComputedStyle(element).fontSize);
    if(!Number.isFinite(maximum) || element.scrollWidth<=width)return;
    // Find the largest fitting size rather than repeatedly scaling down.
    let low=0,high=maximum;
    for(let pass=0;pass<12 && high-low>.05;pass++) {
      const size=(low+high)/2;
      element.style.fontSize=`${size}px`;
      element.style.setProperty('--fitted-text-scale',String(size/maximum));
      if(element.scrollWidth<=width)low=size;else high=size;
    }
    element.style.fontSize=`${low}px`;
    element.style.setProperty('--fitted-text-scale',String(low/maximum));
  }
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(entries=>entries.forEach(entry=>fit(entry.target))):null;
  function fitAll() {
    // Dynamic RSVP pages are rebuilt often; don't retain removed headings.
    for(const element of observed)if(element.isConnected===false){resize?.unobserve(element);observed.delete(element);}
    document.querySelectorAll(selector).forEach(element=>{
      if(!observed.has(element)){observed.add(element);resize?.observe(element);}
      fit(element);
    });
  }
  const changes=new MutationObserver(fitAll);
  changes.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',fitAll);
  document.fonts?.ready.then(fitAll);
  globalThis.FittedText={fit,fitAll};
  fitAll();
})();

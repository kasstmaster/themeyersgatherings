// Reserve the actual fixed toolbar height, including mobile safe-area padding.
(() => {
  let frame=0;
  const observed=new Set();
  function measure(){
    frame=0;let height=0;
    for(const bar of document.querySelectorAll('.event-dock')){
      if(bar.dataset?.toolbarPosition==='top')continue;
      if(!observed.has(bar)){observed.add(bar);resize?.observe(bar);}
      const rect=bar.getBoundingClientRect();
      if(bar.getClientRects().length&&getComputedStyle(bar).position==='fixed')height=Math.max(height,rect.height);
    }
    for(const bar of observed)if(!bar.isConnected){resize?.unobserve(bar);observed.delete(bar);}
    const value=(height?Math.ceil(height)+16:0)+'px';
    if(document.body.style.getPropertyValue('--toolbar-clearance')!==value)document.body.style.setProperty('--toolbar-clearance',value);
  }
  function schedule(){if(!frame)frame=requestAnimationFrame(measure);}
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(schedule):null;
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','class']});
  window.addEventListener('resize',schedule);window.visualViewport?.addEventListener('resize',schedule);
  globalThis.ToolbarLayout={refresh:schedule};schedule();
})();

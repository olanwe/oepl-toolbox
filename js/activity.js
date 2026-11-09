/* Shared, non-blocking activity display. Original status lines remain in place. */
(function(root) {
  'use strict';
  const bar=document.getElementById('activityStatus'), text=document.getElementById('activityMessage');
  const count=document.getElementById('activityCount'), dismiss=document.getElementById('activityDismiss');
  const jobs=new Map(), messages=new Map();
  let timer=0, sequence=0, last=null;
  function position() {
    if(bar.hidden)return;
    const anchor=document.getElementById(last?.source==='led'?'ledStatus':'notice');
    const natural=anchor?.checkVisibility()?anchor.getBoundingClientRect().top:0;
    // Match the normal status line until it scrolls out of view, then pin it.
    const top=natural>12&&natural+bar.offsetHeight<innerHeight?natural:12;
    bar.style.setProperty('--activity-top',top+'px');
  }
  function paintStatus(message) {
    if(!message)return;
    last=message;bar.hidden=false;text.textContent=message.text;
    bar.classList.toggle('is-running',jobs.size>0);
    bar.classList.toggle('is-error',Boolean(message.error));
    bar.setAttribute('aria-busy',String(jobs.size>0));
    count.textContent=jobs.size ? (jobs.size===1?I18N.t('Aktion läuft'):I18N.t('{count} Aktionen laufen',{count:jobs.size})) : I18N.t(message.error?'Fehlgeschlagen':'Abgeschlossen');
    dismiss.hidden=jobs.size>0;
    position();
  }
  function latestActive() {
    let latest=null;
    for(const job of jobs.values()) {
      const message=messages.get(job.source);
      if(message&&(!latest||message.sequence>latest.sequence))latest=message;
    }
    return latest;
  }
  function update(source,value,error=false) {
    const message={source,text:value,error,sequence:++sequence};messages.set(source,message);
    if([...jobs.values()].some(job=>job.source===source))paintStatus(message);
    else if(!jobs.size&&(error||(!bar.hidden&&last?.source===source)))linger(message);
  }
  function linger(message) {
    paintStatus(message);clearTimeout(timer);
    timer=setTimeout(()=>{bar.hidden=true;},message.error?10000:6000);
  }
  function begin(source,label) {
    clearTimeout(timer);
    const token=Symbol(source);jobs.set(token,{source,label});update(source,label);
    return token;
  }
  function end(token,fallback) {
    const job=jobs.get(token);if(!job)return;
    jobs.delete(token);
    let message=messages.get(job.source);
    if(!message||message.text===job.label) {
      message={source:job.source,text:fallback||I18N.t('Aktion abgeschlossen.'),error:false,sequence:++sequence};
      messages.set(job.source,message);
    }
    if(jobs.size)paintStatus(latestActive());
    else {
      linger(message);
    }
  }
  function nextPaint() {
    // Allow the status to be painted before synchronous JPEG encoding. The
    // timer also lets work proceed when animation frames are paused in a tab.
    return new Promise(resolve=>{
      const fallback=setTimeout(resolve,80);
      requestAnimationFrame(()=>requestAnimationFrame(()=>{clearTimeout(fallback);resolve();}));
    });
  }
  dismiss.onclick=()=>{if(!jobs.size){clearTimeout(timer);bar.hidden=true;}};
  root.addEventListener('scroll',position,{passive:true});
  root.addEventListener('resize',position,{passive:true});
  document.addEventListener('languagechange',()=>{if(!bar.hidden)paintStatus(last);});
  root.Activity={begin,update,end,nextPaint,isActive:source=>[...jobs.values()].some(job=>!source||job.source===source)};
})(globalThis);

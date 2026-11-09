/* Apply the saved appearance before the page paints; no image processing changes. */
(function(root){
 'use strict';
 const key='oepl-toolbox-theme',modes=['auto','light','dark'];
 let stored;try{stored=root.localStorage?.getItem(key);}catch{}
 let mode=modes.includes(stored)?stored:'auto';
 const media=typeof root.matchMedia==='function'?root.matchMedia('(prefers-color-scheme: dark)'):null;
 function apply(){
  const theme=mode==='auto'?(media?.matches?'dark':'light'):mode;
  if(root.document){root.document.documentElement.dataset.theme=theme;const select=root.document.getElementById('theme');if(select)select.value=mode;}
  return theme;
 }
 function setMode(value){if(!modes.includes(value))return false;mode=value;try{root.localStorage?.setItem(key,value);}catch{}apply();return true;}
 function bind(){const select=root.document?.getElementById('theme');if(select){select.value=mode;select.addEventListener('change',event=>setMode(event.target.value));}}
 const onSystemChange=()=>{if(mode==='auto')apply();};
 if(media?.addEventListener)media.addEventListener('change',onSystemChange);else if(media?.addListener)media.addListener(onSystemChange);
 root.addEventListener?.('storage',event=>{if(event.key===key){mode=modes.includes(event.newValue)?event.newValue:'auto';apply();}});
 root.Theme={setMode,apply,get mode(){return mode;}};
 if(typeof module!=='undefined')module.exports=root.Theme;
 apply();if(root.document?.readyState==='loading')root.document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(globalThis);

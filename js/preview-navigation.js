/* Preview-only pan/pinch/wheel navigation; capture editing gestures only explicitly. */
(function(root){
 'use strict';
 class PreviewNavigation{
  constructor({canvases,mode,editing,nativeSize,zoom,cancel}){
   this.mode=mode;this.editing=editing;this.nativeSize=nativeSize;this.zoom=zoom;this.cancel=cancel;this.space=false;this.hover=null;
   const field=e=>{const input=e.target?.closest?.('input,textarea,[contenteditable=true]');return input&&!(input.tagName==='INPUT'&&['range','checkbox','radio','button','file'].includes(input.type));};
   document.addEventListener('keydown',e=>{if(e.code==='Space'&&!field(e)&&this.hover){this.space=true;e.preventDefault();}});
   document.addEventListener('keyup',e=>{if(e.code==='Space')this.space=false;});root.addEventListener('blur',()=>{this.space=false;});
   for(const canvas of canvases)this.attach(canvas);
  }
  attach(canvas){
   const well=canvas.parentElement,pointers=new Map();let gesture=null,claimed=false;
   const center=()=>{const p=[...pointers.values()];return {x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.max(1,Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y))};};
   const scale=()=>canvas.getBoundingClientRect().width/this.nativeSize(canvas).width;
   const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
   const capture=id=>{try{well.setPointerCapture(id);}catch{}};
   const anchorZoom=(value,point)=>{const before=canvas.getBoundingClientRect(),fx=(point.x-before.left)/Math.max(1,before.width),fy=(point.y-before.top)/Math.max(1,before.height);this.zoom(canvas,Math.max(.1,Math.min(8,value)));const after=canvas.getBoundingClientRect();well.scrollLeft+=after.left+fx*after.width-point.x;well.scrollTop+=after.top+fy*after.height-point.y;};
   well.addEventListener('pointerenter',()=>this.hover=well);well.addEventListener('pointerleave',()=>{if(this.hover===well)this.hover=null;});
   well.addEventListener('pointerdown',e=>{
    if(e.target.closest('button,input,select'))return;
    if(e.button!==0&&e.button!==1)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(e.pointerType==='touch'&&pointers.size>=2){this.cancel();claimed=true;gesture={type:'pinch',...center(),scale:scale()};for(const id of pointers.keys())capture(id);well.classList.add('is-panning');stop(e);return;}
    if(e.button===1||this.space||this.mode()==='pan'||!this.editing(canvas)){
     claimed=true;gesture={type:'pan',id:e.pointerId,x:e.clientX,y:e.clientY,left:well.scrollLeft,top:well.scrollTop};capture(e.pointerId);well.classList.add('is-panning');stop(e);
    }
   },true);
   well.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!claimed||!gesture)return;
    if(gesture.type==='pinch'&&pointers.size>=2){const c=center();anchorZoom(gesture.scale*c.d/gesture.d,{x:gesture.x,y:gesture.y});well.scrollLeft-=c.x-gesture.x;well.scrollTop-=c.y-gesture.y;gesture={type:'pinch',...c,scale:scale()};}
    else if(gesture.type==='pan'){well.scrollLeft=gesture.left-(e.clientX-gesture.x);well.scrollTop=gesture.top-(e.clientY-gesture.y);}stop(e);
   },true);
   const end=e=>{if(!pointers.has(e.pointerId))return;const wasClaimed=claimed;pointers.delete(e.pointerId);
    if(claimed&&pointers.size===1){const [id,p]=[...pointers][0];gesture={type:'pan',id,x:p.x,y:p.y,left:well.scrollLeft,top:well.scrollTop};}
    if(!pointers.size){gesture=null;claimed=false;well.classList.remove('is-panning');}if(wasClaimed)stop(e);
   };
   well.addEventListener('pointerup',end,true);well.addEventListener('pointercancel',end,true);
   well.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();e.stopImmediatePropagation();anchorZoom(scale()*Math.exp(-e.deltaY*.002),{x:e.clientX,y:e.clientY});},{capture:true,passive:false});
   well.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
   root.addEventListener('blur',()=>{pointers.clear();gesture=null;claimed=false;well.classList.remove('is-panning');});
   well.style.touchAction='none';
  }
 }
 root.PreviewNavigation=PreviewNavigation;
})(window);

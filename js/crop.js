/* Source-coordinate crop geometry. Fractional pixels retain a locked ratio. */
(function(root) {
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function minimum(bounds,ratio) {
    if(ratio&&(bounds.w<Math.max(1,ratio)||bounds.h<Math.max(1,1/ratio)))
      throw Error(root.I18N?root.I18N.t('Quellbild ist zu klein für dieses Seitenverhältnis.'):'Quellbild ist zu klein für dieses Seitenverhältnis.');
    return ratio?Math.max(1,ratio):1;
  }
  function size(rect,bounds,ratio,axis='width') {
    const min=minimum(bounds,ratio);
    const w=clamp(axis==='height'?rect.h*ratio:rect.w,min,Math.min(bounds.w,bounds.h*ratio)),h=w/ratio;
    return {x:clamp(rect.x,0,bounds.w-w),y:clamp(rect.y,0,bounds.h-h),w,h};
  }
  function fit(rect,bounds,ratio) {
    const min=minimum(bounds,ratio),w=clamp(Math.min(rect.w,rect.h*ratio),min,Math.min(bounds.w,bounds.h*ratio)),h=w/ratio;
    return {x:clamp(rect.x+(rect.w-w)/2,0,bounds.w-w),y:clamp(rect.y+(rect.h-h)/2,0,bounds.h-h),w,h};
  }
  function move(rect,dx,dy,bounds) {
    return {...rect,x:clamp(rect.x+dx,0,bounds.w-rect.w),y:clamp(rect.y+dy,0,bounds.h-rect.h)};
  }
  function resize(rect,handle,point,bounds,ratio=0) {
    const west=handle.includes('w'),east=handle.includes('e'),north=handle.includes('n'),south=handle.includes('s');
    const sx=west?-1:1,sy=north?-1:1,ax=west?rect.x+rect.w:rect.x,ay=north?rect.y+rect.h:rect.y;
    const horizontal=west||east,vertical=north||south;
    const maxW=west?ax:bounds.w-ax,maxH=north?ay:bounds.h-ay;
    if(horizontal&&vertical) {
      let w=sx*(point.x-ax),h=sy*(point.y-ay);
      if(ratio) {
        const max=Math.min(maxW,maxH*ratio),min=Math.min(minimum(bounds,ratio),max);
        w=clamp((w+h/ratio)/(1+1/(ratio*ratio)),min,max);h=w/ratio;
      } else {w=clamp(w,1,maxW);h=clamp(h,1,maxH);}
      return {x:west?ax-w:ax,y:north?ay-h:ay,w,h};
    }
    if(horizontal) {
      let w=clamp(sx*(point.x-ax),1,maxW),h=rect.h,y=rect.y;
      if(ratio) {const center=rect.y+rect.h/2,max=Math.min(maxW,2*Math.min(center,bounds.h-center)*ratio);w=clamp(w,Math.min(minimum(bounds,ratio),max),max);h=w/ratio;y=center-h/2;}
      return {x:west?ax-w:ax,y,w,h};
    }
    let h=clamp(sy*(point.y-ay),1,maxH),w=rect.w,x=rect.x;
    if(ratio) {const center=rect.x+rect.w/2,max=Math.min(maxH,2*Math.min(center,bounds.w-center)/ratio);h=clamp(h,Math.min(minimum(bounds,ratio)/ratio,max),max);w=h*ratio;x=center-w/2;}
    return {x,y:north?ay-h:ay,w,h};
  }
  function create(anchor,point,bounds,ratio=0) {
    const horizontal=point.x<anchor.x||(point.x===anchor.x&&anchor.x>bounds.w/2)?'w':'e';
    const vertical=point.y<anchor.y||(point.y===anchor.y&&anchor.y>bounds.h/2)?'n':'s';
    const minW=minimum(bounds,ratio),minH=ratio?minW/ratio:1;
    const x=horizontal==='w'?Math.max(anchor.x,minW):Math.min(anchor.x,bounds.w-minW);
    const y=vertical==='n'?Math.max(anchor.y,minH):Math.min(anchor.y,bounds.h-minH);
    return resize({x,y,w:0,h:0},vertical+horizontal,point,bounds,ratio);
  }
  function hit(rect,point,tolerance) {
    const xs=[rect.x,rect.x+rect.w/2,rect.x+rect.w],ys=[rect.y,rect.y+rect.h/2,rect.y+rect.h];
    if(Math.abs(point.x-xs[1])<Math.min(tolerance.x,rect.w*.2)&&Math.abs(point.y-ys[1])<Math.min(tolerance.y,rect.h*.2))return 'move';
    const handles=[['nw',0,0],['n',1,0],['ne',2,0],['e',2,1],['se',2,2],['s',1,2],['sw',0,2],['w',0,1]];
    for(const [name,x,y] of handles)if(Math.abs(point.x-xs[x])<=tolerance.x&&Math.abs(point.y-ys[y])<=tolerance.y)return name;
    if(point.y>=ys[0]&&point.y<=ys[2]) {
      if(Math.abs(point.x-xs[0])<=tolerance.x)return 'w';
      if(Math.abs(point.x-xs[2])<=tolerance.x)return 'e';
    }
    if(point.x>=xs[0]&&point.x<=xs[2]) {
      if(Math.abs(point.y-ys[0])<=tolerance.y)return 'n';
      if(Math.abs(point.y-ys[2])<=tolerance.y)return 's';
    }
    if(point.x>=rect.x&&point.x<=rect.x+rect.w&&point.y>=rect.y&&point.y<=rect.y+rect.h)return 'move';
    return 'new';
  }
  root.CropModel={fit,size,move,resize,create,hit};
  if(typeof module!=='undefined')module.exports=root.CropModel;
})(globalThis);

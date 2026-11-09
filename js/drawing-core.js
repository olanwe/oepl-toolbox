/* Drawing history and palette-safe layer composition. Native display coordinates. */
(function(root){
 'use strict';
 const fonts={sans:'sans-serif',serif:'serif',mono:'monospace',arial:'Arial, Helvetica, sans-serif',verdana:'Verdana, Geneva, sans-serif',trebuchet:'"Trebuchet MS", sans-serif',georgia:'Georgia, serif',times:'"Times New Roman", Times, serif',courier:'"Courier New", Courier, monospace'};
 const fontFamily=key=>Object.hasOwn(fonts,key)?fonts[key]:fonts.sans;
 const fontCSS=op=>(op.bold?'bold ':'')+op.size+'px '+fontFamily(op.font);

 class History{
  constructor(){this.items=[];this.position=0;this.version=0;}
  add(operation){this.items.splice(this.position);this.items.push(operation);this.position++;this.version++;}
  undo(){if(this.position){this.position--;this.version++;return true;}return false;}
  redo(){if(this.position<this.items.length){this.position++;this.version++;return true;}return false;}
  get operations(){return this.items.slice(0,this.position);}
 }
 function nativePoint(p,w,h,rotation){
  switch(((rotation%360)+360)%360){case 90:return{x:p.y,y:h-p.x};case 180:return{x:w-p.x,y:h-p.y};case 270:return{x:w-p.y,y:p.x};default:return{x:p.x,y:p.y};}
 }
 function objects(operations){
  let result=[];
  for(const op of operations){
   if(op.type==='clear'){result=[];continue;}
   if(op.type==='edit'){result=result.map(item=>item.id===op.targetId?{...item,...op.patch}:item);continue;}
   if(op.type==='delete'){result=result.filter(item=>item.id!==op.targetId);continue;}
   result.push(op);
  }
  return result;
 }
 function viewPoint(p,w,h,rotation){switch(((rotation%360)+360)%360){case 90:return{x:h-p.y,y:p.x};case 180:return{x:w-p.x,y:h-p.y};case 270:return{x:p.y,y:w-p.x};default:return{x:p.x,y:p.y};}}
 function mapBox(box,map){const corners=[{x:box.x,y:box.y},{x:box.x+box.w,y:box.y},{x:box.x,y:box.y+box.h},{x:box.x+box.w,y:box.y+box.h}].map(map),x=Math.min(...corners.map(p=>p.x)),y=Math.min(...corners.map(p=>p.y));return{x,y,w:Math.max(...corners.map(p=>p.x))-x,h:Math.max(...corners.map(p=>p.y))-y};}
 function box(op){
  if(op.type==='text'||op.type==='image'){
   let width,height;
   if(op.type==='image'){width=op.imageWidth;height=width*op.image.height/op.image.width;}
   else {const lines=op.text.split('\n'),ctx=typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;if(ctx)ctx.font=fontCSS(op);width=Math.max(1,...lines.map(line=>ctx?ctx.measureText(line).width:line.length*op.size*.6));height=Math.max(op.size,lines.length*Math.ceil(op.size*1.2));}
   const angle=-(op.rotation||0)*Math.PI/180;
   return mapBox({x:0,y:0,w:width,h:height},p=>({x:op.a.x+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:op.a.y+p.x*Math.sin(angle)+p.y*Math.cos(angle)}));
  }
  if(op.type==='eraser')return null;
  const pad=op.fill&&op.type!=='line'?0:(op.width||1)/2;
  if(op.type==='circle'){const r=Math.max(.5,Math.hypot(op.b.x-op.a.x,op.b.y-op.a.y)+pad);return{x:op.a.x-r,y:op.a.y-r,w:2*r,h:2*r};}
  const x=Math.min(op.a.x,op.b.x)-pad,y=Math.min(op.a.y,op.b.y)-pad;
  return{x,y,w:Math.max(1,Math.abs(op.a.x-op.b.x)+2*pad),h:Math.max(1,Math.abs(op.a.y-op.b.y)+2*pad)};
 }
 function shift(op,dx,dy){const move=p=>({x:p.x+dx,y:p.y+dy});return {...op,a:move(op.a),...(op.b?{b:move(op.b)}:{})};}
 function transform(op,from,to){
  const sx=to.w/from.w,sy=to.h/from.h,map=p=>({x:to.x+(p.x-from.x)*sx,y:to.y+(p.y-from.y)*sy}),scale=Math.min(sx,sy);
  return {...op,a:map(op.a),...(op.b?{b:map(op.b)}:{}),...(op.type==='text'?{size:Math.max(8,Math.min(160,Math.round(op.size*scale)))}:{}),...(op.type==='image'?{imageWidth:Math.max(1,Math.min(4096,Math.round(op.imageWidth*scale)))}:{})};
 }
 function render(w,h,operations){
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
  for(const op of objects(operations)){
   ctx.save();ctx.strokeStyle=ctx.fillStyle=op.color||'#000000';ctx.lineWidth=op.width||1;ctx.lineCap='round';ctx.lineJoin='round';
   const a=op.a,b=op.b;
   if(op.type==='clear')ctx.clearRect(0,0,w,h);
   else if(op.type==='text'||op.type==='image'){
    ctx.translate(a.x,a.y);ctx.rotate(-(op.rotation||0)*Math.PI/180);
    if(op.type==='text'){ctx.font=fontCSS(op);ctx.textBaseline='top';op.text.split('\n').forEach((line,i)=>ctx.fillText(line,0,i*Math.ceil(op.size*1.2)));}
    else {ctx.imageSmoothingEnabled=op.smooth!==false;ctx.drawImage(op.image,0,0,op.imageWidth,op.imageWidth*op.image.height/op.image.width);}
   }else if(op.type==='eraser'){
    ctx.globalCompositeOperation='destination-out';ctx.beginPath();const points=op.points||[];
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    if(points.length&&!points.some(p=>p.x!==points[0].x||p.y!==points[0].y)){ctx.arc(points[0].x,points[0].y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();
   }else{
    ctx.beginPath();
    if(op.type==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}
    else if(op.type==='ellipse')ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);
    else if(op.type==='circle')ctx.arc(a.x,a.y,Math.hypot(b.x-a.x,b.y-a.y),0,Math.PI*2);
    else ctx.rect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));
    if(op.fill&&op.type!=='line')ctx.fill();else ctx.stroke();
   }
   ctx.restore();
  }
  return canvas;
 }
 function merge(base,layer){
  if(base.width!==layer.width||base.height!==layer.height)throw Error('Layer dimensions differ');
  const data=new Uint8ClampedArray(base.data),indices=new Uint8Array(base.indices);
  for(let i=0;i<indices.length;i++)if(layer.data[i*4+3]>=128){data.set(layer.data.subarray(i*4,i*4+4),i*4);data[i*4+3]=255;indices[i]=layer.indices[i];}
  return {...base,data,indices};
 }
 function bounds(pixels){
  let x=pixels.width,y=pixels.height,right=0,bottom=0;
  for(let i=0;i<pixels.width*pixels.height;i++)if(pixels.data[i*4+3]>=128){const px=i%pixels.width,py=Math.floor(i/pixels.width);x=Math.min(x,px);y=Math.min(y,py);right=Math.max(right,px+1);bottom=Math.max(bottom,py+1);}
  return right>x&&bottom>y?{x,y,w:right-x,h:bottom-y}:null;
 }
 function union(a,b){if(!b)return a;if(!a)return b;const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y);return{x,y,w:Math.max(a.x+a.w,b.x+b.w)-x,h:Math.max(a.y+a.h,b.y+b.h)-y};}
 root.DrawingLayer={fonts,fontFamily,fontCSS,History,nativePoint,viewPoint,mapBox,objects,box,shift,transform,render,merge,bounds,union};if(typeof module!=='undefined')module.exports=root.DrawingLayer;
})(typeof window!=='undefined'?window:globalThis);

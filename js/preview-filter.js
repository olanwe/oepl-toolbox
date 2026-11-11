/* Preview-only native-resolution filtering, before any CSS display scaling. */
(function(root){
 'use strict';
 function blurPixels(data,width,height,radius){
  if(!(radius>0))return new Uint8ClampedArray(data);
  const reach=Math.ceil(radius*3),weights=Array.from({length:reach*2+1},(_,i)=>Math.exp(-((i-reach)**2)/(2*radius*radius))),sum=weights.reduce((a,b)=>a+b,0);weights.forEach((v,i)=>weights[i]=v/sum);
  const horizontal=new Float32Array(data.length),out=new Uint8ClampedArray(data.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let r=0,g=0,b=0,a=0;
   for(let k=-reach;k<=reach;k++){const p=(y*width+Math.max(0,Math.min(width-1,x+k)))*4,w=weights[k+reach],alpha=data[p+3]/255;r+=data[p]*alpha*w;g+=data[p+1]*alpha*w;b+=data[p+2]*alpha*w;a+=data[p+3]*w;}
   const p=(y*width+x)*4;horizontal[p]=r;horizontal[p+1]=g;horizontal[p+2]=b;horizontal[p+3]=a;
  }
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   let r=0,g=0,b=0,a=0;
   for(let k=-reach;k<=reach;k++){const p=(Math.max(0,Math.min(height-1,y+k))*width+x)*4,w=weights[k+reach];r+=horizontal[p]*w;g+=horizontal[p+1]*w;b+=horizontal[p+2]*w;a+=horizontal[p+3]*w;}
   const p=(y*width+x)*4;if(a>1e-6){out[p]=r*255/a;out[p+1]=g*255/a;out[p+2]=b*255/a;}out[p+3]=a;
  }
  return out;
 }
 class NativePreview{
  constructor(){this.source=document.createElement('canvas');this.padded=document.createElement('canvas');this.filtered=document.createElement('canvas');this.key=null;this.radius=0;}
  paint(ctx,pixels,amount){
   const radius=Math.max(0,Math.min(4,Number(amount)||0)),{width:w,height:h}=pixels;
   if(pixels.reflectancePreview){
    if(this.key!==pixels||this.radius!==radius){const {colors,model}=pixels.reflectancePreview;this.filtered.width=w;this.filtered.height=h;this.filtered.getContext('2d').putImageData(new ImageData(root.Reflectance.preview(pixels.data,w,h,colors,model,radius),w,h),0,0);this.key=pixels;this.radius=radius;}
    ctx.save();ctx.filter='none';ctx.clearRect(0,0,w,h);ctx.drawImage(this.filtered,0,0);ctx.restore();return;
   }
   if(!radius){ctx.putImageData(new ImageData(pixels.data,w,h),0,0);return;}
   if(this.key!==pixels||this.radius!==radius){
    this.source.width=w;this.source.height=h;this.source.getContext('2d').putImageData(new ImageData(pixels.data,w,h),0,0);this.filtered.width=w;this.filtered.height=h;
    const output=this.filtered.getContext('2d');
    if('filter' in output){
     // Replicate edge pixels so opaque image borders do not fade into transparency.
     const pad=Math.ceil(radius*3)+1;this.padded.width=w+pad*2;this.padded.height=h+pad*2;const c=this.padded.getContext('2d');c.imageSmoothingEnabled=false;
     c.drawImage(this.source,pad,pad);
     c.drawImage(this.source,0,0,w,1,pad,0,w,pad);c.drawImage(this.source,0,h-1,w,1,pad,pad+h,w,pad);
     c.drawImage(this.source,0,0,1,h,0,pad,pad,h);c.drawImage(this.source,w-1,0,1,h,pad+w,pad,pad,h);
     for(const [sx,sy,dx,dy]of [[0,0,0,0],[w-1,0,pad+w,0],[0,h-1,0,pad+h],[w-1,h-1,pad+w,pad+h]])c.drawImage(this.source,sx,sy,1,1,dx,dy,pad,pad);
     output.filter='blur('+radius+'px)';output.drawImage(this.padded,-pad,-pad);output.filter='none';
    }else output.putImageData(new ImageData(blurPixels(pixels.data,w,h,radius),w,h),0,0);
    this.key=pixels;this.radius=radius;
   }
   ctx.save();ctx.filter='none';ctx.clearRect(0,0,w,h);ctx.drawImage(this.filtered,0,0);ctx.restore();
  }
 }
 root.PreviewFilter={NativePreview,blurPixels};if(typeof module!=='undefined')module.exports=root.PreviewFilter;
})(typeof window!=='undefined'?window:globalThis);

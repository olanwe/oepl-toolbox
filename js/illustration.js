/* Optional illustration protection. Source masks are reduced separately from colors. */
(function(root){
 'use strict';
 const rgb=c=>c.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)),lum=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
 const presets={off:{},comic:{dark:50,text:50,smooth:35},diagram:{dark:35,color:45,text:40},text:{text:50}};
 function settings(value={}){
  if(value===null||value===false)value={};if(typeof value==='string')value={preset:value};
  if(typeof value!=='object'||Array.isArray(value))throw Error('illustration: preset or options required');
  if(value.preset!==undefined&&!Object.hasOwn(presets,value.preset))throw Error('Unknown illustration preset');
  for(const key of Object.keys(value))if(!['preset','dark','color','text','smooth'].includes(key))throw Error('Unknown illustration option: '+key);
  const preset=presets[value.preset||'off'],result={};
  for(const key of ['dark','color','text','smooth']){const v=value[key]??preset[key]??0;if(!Number.isFinite(v)||v<0||v>100)throw Error('illustration.'+key+': 0–100');result[key]=v;}
  return result;
 }
 function resizeCoverage(input,w,h,tw,th){
  const pass=(src,sw,sh,length,vertical)=>{const old=vertical?sh:sw,outW=vertical?sw:length,outH=vertical?length:sh,out=new Uint8Array(outW*outH),lines=vertical?sw:sh,ratio=old/length;
   for(let line=0;line<lines;line++)for(let i=0;i<length;i++){
    const at=j=>src[vertical?Math.max(0,Math.min(old-1,j))*sw+line:line*sw+Math.max(0,Math.min(old-1,j))];let value;
    if(ratio<1){const p=(i+.5)*ratio-.5,a=Math.floor(p),f=p-a;value=at(a)*(1-f)+at(a+1)*f;}
    else {const a=i*ratio,b=(i+1)*ratio;let sum=0;for(let j=Math.floor(a);j<Math.ceil(b);j++)sum+=at(j)*Math.max(0,Math.min(b,j+1)-Math.max(a,j));value=sum/ratio;}
    out[vertical?i*outW+line:line*outW+i]=Math.round(value);
   }return out;
  };
  if(!Number.isInteger(tw)||!Number.isInteger(th)||tw<1||th<1||tw*th>4000000)throw Error('Invalid illustration target dimensions');
  return pass(pass(input,w,h,tw,false),tw,h,th,true);
 }
 function resizePlanes(prepared,w,h){const scale=mask=>mask?resizeCoverage(mask,prepared.width,prepared.height,w,h):null;return {dark:prepared.dark,light:prepared.light,ink:scale(prepared.ink),text:scale(prepared.text),white:scale(prepared.white),accents:prepared.accents.map(a=>({index:a.index,mask:scale(a.mask)}))};}
 function morph(input,w,h,r,max){
  function pass(src,vertical){const out=new Uint8Array(src.length),length=vertical?h:w,lines=vertical?w:h,deque=new Int32Array(length+2*r+1);
   for(let line=0;line<lines;line++){let first=0,last=0;const at=i=>src[vertical?Math.max(0,Math.min(length-1,i))*w+line:line*w+Math.max(0,Math.min(length-1,i))];
    for(let i=-r;i<length+r;i++){const v=at(i);while(last>first&&(max?at(deque[last-1])<=v:at(deque[last-1])>=v))last--;deque[last++]=i;while(last>first&&deque[first]<i-2*r)first++;if(i>=r)out[vertical?(i-r)*w+line:line*w+i-r]=at(deque[first]);}
   }return out;
  }return pass(pass(input,false),true);
 }
 function soften(data,w,h,strength){
  let current=new Uint8ClampedArray(data);const amount=strength/100;
  for(const vertical of [false,true]){const out=new Uint8ClampedArray(current);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const p=(y*w+x)*4,sum=[0,0,0];let total=0;
   for(let d=-2;d<=2;d++){const xx=vertical?x:Math.max(0,Math.min(w-1,x+d)),yy=vertical?Math.max(0,Math.min(h-1,y+d)):y,q=(yy*w+xx)*4;
    const distance=(current[p]-current[q])**2+(current[p+1]-current[q+1])**2+(current[p+2]-current[q+2])**2;
    const weight=Math.exp(-distance/(2*35**2)-d*d/(2*1.4**2))*current[q+3]/255;total+=weight;for(let k=0;k<3;k++)sum[k]+=current[q+k]*weight;
   }if(total)for(let k=0;k<3;k++)out[p+k]=current[p+k]*(1-amount)+sum[k]/total*amount;
  }current=out;}return current;
 }
 function prepare(data,w,h,colors,options={}){
  const n=w*h,palette=colors.map(rgb),order=palette.map((c,i)=>({i,l:lum(c)})).sort((a,b)=>a.l-b.l),dark=order[0].i,light=order.at(-1).i;
  const ink=new Uint8Array(n),white=new Uint8Array(n),accents=[];
  for(let p=0;p<n;p++){const i=p*4,max=Math.max(data[i],data[i+1],data[i+2]),min=Math.min(data[i],data[i+1],data[i+2]);ink[p]=(max-min<45||max<65)?Math.max(0,(150-max)/150)*data[i+3]:0;white[p]=min>225&&data[i+3]>=250?255:0;}
  let whiteMask=null,text=null;
  if(options.text>0){const r=Math.max(3,Math.min(10,Math.round(Math.min(w,h)*.015)));whiteMask=morph(morph(white,w,h,r,true),w,h,r,false);for(let p=0;p<n;p++){const i=p*4;if(Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>35)whiteMask[p]=0;}text=Uint8Array.from(ink,(v,i)=>v*whiteMask[i]/255);}
  if(options.color>0){const candidates=palette.map((c,i)=>({c,i,v:c.map(v=>255-v)})).filter(p=>p.i!==dark&&p.i!==light&&Math.max(...p.c)-Math.min(...p.c)>40);for(const candidate of candidates)accents.push({index:candidate.i,mask:new Uint8Array(n)});
   for(let p=0;p<n;p++){const i=p*4,c=[data[i],data[i+1],data[i+2]];if(Math.max(...c)-Math.min(...c)<35)continue;let best=Infinity,owner=-1,coverage=0;
    for(let j=0;j<candidates.length;j++){const q=candidates[j],length=q.v.reduce((s,v)=>s+v*v,0);if(!length)continue;const a=Math.max(0,Math.min(1,q.v.reduce((s,v,k)=>s+(255-c[k])*v,0)/length)),distance=q.v.reduce((s,v,k)=>s+(c[k]-(255-a*v))**2,0);if(distance<best){best=distance;owner=j;coverage=a;}}
    if(owner>=0&&best<3*75**2)accents[owner].mask[p]=coverage*data[i+3];
   }
   const radius=Math.max(2,Math.min(10,options.lineRadius||3));
   for(const accent of accents){const opened=morph(morph(accent.mask,w,h,radius,false),w,h,radius,true);accent.mask=Uint8Array.from(accent.mask,(v,i)=>Math.max(0,v-opened[i]));}
  }
  return {data:options.smooth>0?soften(data,w,h,options.smooth):new Uint8ClampedArray(data),width:w,height:h,dark,light,ink:options.dark>0?ink:null,text,white:whiteMask,accents};
 }
 function apply(image,masks,colors,options={}){
  const data=new Uint8ClampedArray(image.data),indices=new Uint8Array(image.indices),palette=colors.map(rgb),n=image.width*image.height;
  const paint=(p,index)=>{if(data[p*4+3]===0)return;data.set(palette[index],p*4);indices[p]=index;};
  for(let p=0;p<n;p++){
   if(masks.white&&masks.white[p]>240)paint(p,masks.light);
   for(const accent of masks.accents||[])if(accent.mask[p]/255>=.45-.4*options.color/100)paint(p,accent.index);
   if(masks.ink&&masks.ink[p]/255>=.45-.4*options.dark/100)paint(p,masks.dark);
   if(masks.text&&masks.text[p]/255>=.34-.32*options.text/100)paint(p,masks.dark);
  }return {...image,data,indices};
 }
 function resizeMasks(prepared,w,h,dx,dy,dw,dh){
    const canvas=document.createElement('canvas');canvas.width=prepared.width;canvas.height=prepared.height;const context=canvas.getContext('2d');
    const resized=document.createElement('canvas');resized.width=w;resized.height=h;const targetContext=resized.getContext('2d',{willReadFrequently:true});targetContext.imageSmoothingEnabled=true;targetContext.imageSmoothingQuality='high';
    const scale=mask=>{if(!mask)return null;const rgba=new Uint8ClampedArray(mask.length*4);for(let p=0;p<mask.length;p++)rgba[p*4+3]=mask[p];context.putImageData(new ImageData(rgba,canvas.width,canvas.height),0,0);targetContext.clearRect(0,0,w,h);targetContext.drawImage(canvas,dx,dy,dw,dh);const data=targetContext.getImageData(0,0,w,h).data;return Uint8Array.from({length:w*h},(_,p)=>data[p*4+3]);};
    return {dark:prepared.dark,light:prepared.light,ink:scale(prepared.ink),text:scale(prepared.text),white:scale(prepared.white),accents:prepared.accents.map(a=>({index:a.index,mask:scale(a.mask)}))};
 }
 root.Illustration={presets,settings,morph,prepare,apply,resizeMasks,resizeCoverage,resizePlanes};if(typeof module!=='undefined')module.exports=root.Illustration;
})(typeof window!=='undefined'?window:globalThis);

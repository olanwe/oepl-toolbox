/* Optional, empirical root-XYZ mixture model. Nominal output bytes stay unchanged.
   A power mean approximates fine-raster darkening; not a spectral panel model. */
(function(root){
 'use strict';
 const C=root.Colorimetry||(typeof module!=='undefined'?require('./colorimetry.js'):null);
 const F=root.FixedMix||(typeof module!=='undefined'?require('./fixed-mix.js'):null);
 const RGBXYZ=[[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]],XYZRGB=[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]];
 const signed=(v,p)=>Math.sign(v)*Math.abs(v)**p,clamp=v=>Math.max(0,Math.min(255,v));
 const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,encode=v=>v<=.0031308?12.92*v:1.055*Math.max(0,v)**(1/2.4)-.055;
 function validate(model,count){
  if(!model||!Number.isFinite(model.exponent)||model.exponent<1||model.exponent>3||!Array.isArray(model.xyz)||model.xyz.length!==count||model.xyz.some(v=>!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n)||Math.abs(n)>8)))throw Error('Invalid reflectance model.');
  return model;
 }
 const forward=(xyz,n)=>xyz.map((v,k)=>signed(v/C.whites.D65[k],1/n)*255);
 const inverse=(v,n)=>v.map((x,k)=>signed(x/255,n)*C.whites.D65[k]);
 const rgbXYZ=c=>C.matrix(RGBXYZ,c.map(v=>decode(v/255)));
 const screen=xyz=>C.matrix(XYZRGB,xyz).map(v=>clamp(Math.round(encode(v)*255)));
 const dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0),sub=(a,b)=>a.map((v,k)=>v-b[k]),dist=(a,b)=>dot(sub(a,b),sub(a,b));
 const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
 // Use mixture coordinates for an affine-independent palette (a simplex).
 // Euclidean XYZ distance can select a vertex outside the target's gamut face,
 // creating a one-sided residual that takes many scanlines to suppress.
 function mixtureCoordinates(palette){
  const size=palette.length-1;if(size<1||size>3)return null;
  const axes=palette.slice(1).map(p=>sub(p,palette[0])),gram=axes.map(a=>axes.map(b=>dot(a,b))),scale=Math.max(...gram.flat().map(Math.abs));
  if(!(scale>0))return null;
  const rows=gram.map((row,i)=>row.concat(Array.from({length:size},(_,j)=>Number(i===j))));
  for(let col=0;col<size;col++){
   let pivot=col;for(let j=col+1;j<size;j++)if(Math.abs(rows[j][col])>Math.abs(rows[pivot][col]))pivot=j;
   if(Math.abs(rows[pivot][col])<scale*1e-10)return null;
   [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
   const divisor=rows[col][col];rows[col]=rows[col].map(v=>v/divisor);
   for(let j=0;j<size;j++)if(j!==col){const factor=rows[j][col];rows[j]=rows[j].map((v,k)=>v-factor*rows[col][k]);}
  }
  const inverse=rows.map(row=>row.slice(size));
  return color=>{const delta=sub(color,palette[0]),rhs=axes.map(a=>dot(a,delta)),weights=inverse.map(row=>dot(row,rhs));return [1-weights.reduce((s,v)=>s+v,0),...weights];};
 }
 // Closest chromaticity at fixed working-space Y. No monitor-gamut clipping.
 function projector(palette){
  const low=Math.min(...palette.map(p=>p[1])),high=Math.max(...palette.map(p=>p[1]));
  return color=>{
   const Y=Math.max(low,Math.min(high,color[1])),points=[];
   for(let i=0;i<palette.length;i++){
    const a=palette[i];if(Math.abs(a[1]-Y)<1e-8)points.push([a[0],Y,a[2]]);
    for(let j=i+1;j<palette.length;j++){const b=palette[j],dy=b[1]-a[1];if(Math.abs(dy)<1e-10)continue;const t=(Y-a[1])/dy;if(t>=0&&t<=1)points.push(a.map((v,k)=>v+(b[k]-v)*t));}
   }
   points.sort((a,b)=>a[0]-b[0]||a[2]-b[2]);const unique=points.filter((p,i)=>!i||dist(p,points[i-1])>1e-14);
   if(unique.length===1)return unique[0].slice();
   const lower=[],upper=[];
   for(const p of unique){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=1e-9)lower.pop();lower.push(p);}
   for(const p of unique.slice().reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=1e-9)upper.pop();upper.push(p);}
   const hull=lower.slice(0,-1).concat(upper.slice(0,-1)),p=[color[0],Y,color[2]];
   if(hull.length>=3&&hull.every((a,i)=>cross(a,hull[(i+1)%hull.length],p)>=-1e-7))return p;
   let best=hull[0],bestD=dist(p,best);
   for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length],ab=sub(b,a),length=dot(ab,ab),t=length?Math.max(0,Math.min(1,dot(sub(p,a),ab)/length)):0,q=a.map((v,k)=>v+ab[k]*t),d=dist(p,q);if(d<bestD){best=q;bestD=d;}}
   return best.slice();
  };
 }
 function quantize(data,width,height,colors,options,corrected){
  const model=validate(options.reflectance,colors.length),n=model.exponent,nominal=colors.map(c=>c.slice(1).match(/../g).map(v=>parseInt(v,16))),palette=model.xyz.map(v=>forward(v,n)),labs=model.xyz.map(v=>C.xyzToLab(v));
  const {dither='none',strength=1,biases=[]}=options,count=width*height,indices=new Uint8Array(count),out=new Uint8ClampedArray(data.length),work=new Float32Array(count*3),baseIndices=new Uint8Array(count),forced=new Int16Array(count);forced.fill(-1);
  const exact=options.exactNominal?new Map(nominal.map((c,i)=>[c.join(','),i])):null,project=projector(palette),memo=new Map(),diffuse=['floyd','ordered'].includes(dither)&&strength>0;
  const nearestLab=lab=>{let best=Infinity,index=0;for(let i=0;i<labs.length;i++){const d=dist(lab,labs[i])-(biases[i]||0)*650/19.5075;if(d<best){best=d;index=i;}}return index;};
  const mixture=mixtureCoordinates(palette);
  const nearestRoot=c=>{
   const weights=mixture?.(c);let best=Infinity,index=0;
   for(let i=0;i<palette.length;i++){
    // Nearest one-hot mixture is the largest (signed) mixture coefficient.
    // Keep residuals signed; clipping them would shift the average color.
    const d=(weights?-2*255**2*weights[i]:dist(c,palette[i]))-(biases[i]||0)*650*strength;
    if(d<best){best=d;index=i;}
   }return index;
  };
  for(let p=0;p<count;p++){
   const c=[corrected[p*3],corrected[p*3+1],corrected[p*3+2]],key=c.join(',');let sample=memo.get(key);
   if(!sample){const xyz=rgbXYZ(c),base=dither==='fixed'?0:nearestLab(C.xyzToLab(xyz)),v=forward(xyz,n);sample={base,mapped:diffuse?project(v):v};if(memo.size<65536)memo.set(key,sample);}
   baseIndices[p]=sample.base;const literal=exact?.get(key);if(literal!==undefined)forced[p]=literal;
   const v=sample.mapped;
   work.set(diffuse&&strength<1?v.map((x,k)=>palette[sample.base][k]+(x-palette[sample.base][k])*strength):v,p*3);
  }
  const toLab=v=>C.xyzToLab(inverse(v,n));
  if(dither==='fixed'){
   const fixed=F.prepare(palette,{maxColors:options.mixColors??2,biases,toLab});
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=y*width+x,v=[...work.subarray(p*3,p*3+3)],i=forced[p]>=0?forced[p]:fixed.index(fixed.choose(v),x,y);indices[p]=i;out.set(nominal[i],p*4);out[p*4+3]=data[p*4+3];}
   return {data:out,indices,width,height};
  }
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],tiles=new Map();
  function ordered(v,rank){
   // Cached tiles must use the cache cell's canonical target, not whichever
   // pixel happened to populate it first. Mixture bins also retain gamut faces.
   const bins=mixture?mixture(v).map(x=>Math.max(0,Math.round(x*31))):v.map(x=>Math.round(x*31/255)),key=bins.join(',');let tile=tiles.get(key);
   if(!tile){const total=bins.reduce((s,v)=>s+v,0),target=mixture?[0,1,2].map(k=>palette.reduce((s,c,i)=>s+c[k]*bins[i]/total,0)):project(bins.map(x=>x*255/31)),sum=[0,0,0];tile=[];
    for(let i=0;i<16;i++){const q=nearestRoot(target.map((x,k)=>x*(i+1)-sum[k]));tile.push(q);palette[q].forEach((x,k)=>sum[k]+=x);}
    for(let i=0;i<16;i++){const old=palette[tile[i]],q=nearestRoot(target.map((x,k)=>x*16-sum[k]+old[k]));tile[i]=q;palette[q].forEach((x,k)=>sum[k]+=x-old[k]);}
    tile.sort((a,b)=>palette[a][1]-palette[b][1]||a-b);if(tiles.size<32768)tiles.set(key,tile);}
   return tile[rank];
  }
  for(let y=0;y<height;y++)for(let scan=0;scan<width;scan++){
   const dir=dither==='floyd'&&y%2?-1:1,x=dir<0?width-1-scan:scan,p=y*width+x,v=[...work.subarray(p*3,p*3+3)];
   let i=forced[p]>=0?forced[p]:dither==='none'||strength===0?baseIndices[p]:dither==='ordered'?ordered(v,bayer[(y%4)*4+x%4]):nearestRoot(v);
   indices[p]=i;out.set(nominal[i],p*4);out[p*4+3]=data[p*4+3];
   if(dither==='floyd'&&strength>0&&data[p*4+3]){
    const neighbors=[[dir,0,7],[-dir,1,3],[0,1,5],[dir,1,1]].filter(([dx,dy])=>x+dx>=0&&x+dx<width&&y+dy<height&&data[((y+dy)*width+x+dx)*4+3]);
    const total=neighbors.reduce((s,p)=>s+p[2],0);for(const [dx,dy,w]of neighbors){const q=((y+dy)*width+x+dx)*3;for(let k=0;k<3;k++)work[q+k]+=(v[k]-palette[i][k])*w/total;}
   }
  }
  return {data:out,indices,width,height};
 }
 // Native-resolution spatial preview: average in model coordinates, invert the
 // empirical response, then encode to the monitor. Export data is never touched.
 function preview(data,width,height,colors,model,radius=0){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>4096||height>4096||width*height>4000000||!data||data.length!==width*height*4||!Number.isFinite(radius)||radius<0||radius>4||!Array.isArray(colors)||colors.length<2||colors.length>16||colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))throw Error('Invalid reflectance preview.');
  validate(model,colors.length);const palette=model.xyz.map(v=>forward(v,model.exponent)),pack=c=>(c[0]<<16)|(c[1]<<8)|c[2],lookup=new Map(colors.map((c,i)=>[parseInt(c.slice(1),16),palette[i]]));
  let work=new Float32Array(width*height*4);
  for(let p=0;p<width*height;p++){const rgb=[data[p*4],data[p*4+1],data[p*4+2]],v=lookup.get(pack(rgb))||forward(rgbXYZ(rgb),model.exponent),a=data[p*4+3]/255;for(let k=0;k<3;k++)work[p*4+k]=v[k]*a;work[p*4+3]=a;}
  if(radius>0){const reach=Math.ceil(radius*3),weights=Array.from({length:reach*2+1},(_,i)=>Math.exp(-((i-reach)**2)/(2*radius*radius))),sum=weights.reduce((a,b)=>a+b);weights.forEach((v,i)=>weights[i]=v/sum);
   for(const vertical of [false,true]){const next=new Float32Array(work.length);for(let y=0;y<height;y++)for(let x=0;x<width;x++)for(let d=-reach;d<=reach;d++){const xx=vertical?x:Math.max(0,Math.min(width-1,x+d)),yy=vertical?Math.max(0,Math.min(height-1,y+d)):y,p=(y*width+x)*4,q=(yy*width+xx)*4;for(let k=0;k<4;k++)next[p+k]+=work[q+k]*weights[d+reach];}work=next;}
  }
  const out=new Uint8ClampedArray(data.length);for(let p=0;p<width*height;p++){const a=work[p*4+3];if(a>1e-8)out.set(screen(inverse([work[p*4]/a,work[p*4+1]/a,work[p*4+2]/a],model.exponent)),p*4);out[p*4+3]=a*255;}return out;
 }
 const api={validate,forward,inverse,screen,projector,mixtureCoordinates,quantize,preview};root.Reflectance=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

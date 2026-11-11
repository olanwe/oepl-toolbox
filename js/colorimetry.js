/* sRGB/XYZ/CIELAB and Bradford adaptation. No DOM or image I/O.
   Reference: https://www.w3.org/TR/css-color-4/#color-conversion-code */
(function(root){
 'use strict';
 const whites={D65:[.95047,1,1.08883],D50:[.96422,1,.82521]};
 const matrix=(m,v)=>m.map(row=>row.reduce((s,x,i)=>s+x*v[i],0));
 const xyzRGB=[[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]];
 const rgbXYZ=[[.4124564,.3575761,.1804375],[.2126729,.7151522,.072175],[.0193339,.119192,.9503041]];
 const bradford=[[.8951,.2664,-.1614],[-.7502,1.7135,.0367],[.0389,-.0685,1.0296]];
 const inverseBradford=[[.9869929,-.1470543,.1599627],[.4323053,.5183603,.0492912],[-.0085287,.0400428,.9684867]];
 const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
 const decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
 const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
 const fromHex=hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255);
 function toHex(linear){return '#'+linear.map(v=>Math.round(clamp(encode(v))*255).toString(16).padStart(2,'0')).join('');}
 function adapt(xyz,from,to=whites.D65){
  if(from.every((v,i)=>Math.abs(v-to[i])<1e-10))return xyz.slice();
  const a=matrix(bradford,from),b=matrix(bradford,to);if(a.some(v=>Math.abs(v)<1e-10))throw Error('Invalid adaptation white');
  return matrix(inverseBradford,matrix(bradford,xyz).map((v,i)=>v*b[i]/a[i]));
 }
 function labToXYZ([L,a,b],white=whites.D65){
  const f=(L+16)/116,undo=v=>v**3>216/24389?v**3:(116*v-16)/(24389/27);
  return [f+a/500,f,f-b/200].map((v,i)=>undo(v)*white[i]);
 }
 function xyzToLab(xyz,white=whites.D65){
  const f=xyz.map((v,i)=>{const t=v/white[i];return t>216/24389?Math.cbrt(t):((24389/27)*t+16)/116;});
  return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];
 }
 const rgbToXYZ=hex=>matrix(rgbXYZ,fromHex(hex).map(decode));
 const linearFromLab=lab=>matrix(xyzRGB,labToXYZ(lab));
 function labHex(lab,whitePoint='D65'){return toHex(matrix(xyzRGB,adapt(labToXYZ(lab,whites[whitePoint]),whites[whitePoint])));}
 function fitChroma(lab){
  const inside=linear=>linear.every(v=>v>=-1e-7&&v<=1+1e-7);if(inside(linearFromLab(lab)))return lab.slice();
  let low=0,high=1;
  for(let n=0;n<28;n++){const mid=(low+high)/2;if(inside(linearFromLab([lab[0],lab[1]*mid,lab[2]*mid])))low=mid;else high=mid;}
  return [lab[0],lab[1]*low,lab[2]*low];
 }
 function normalize(profile){
  const white=profile.nominal.indexOf('#ffffff'),black=profile.nominal.indexOf('#000000');
  const fallback={available:false,colors:profile.renderColors.slice(),gamutReduced:false,labs:null,adaptedLabs:null};
  if(white<0||black<0)return fallback;
  const source=profile.sourceLab,xyz=source?source.values.map(lab=>adapt(labToXYZ(lab,whites[source.whitePoint]),whites[source.whitePoint])):profile.renderColors.map(rgbToXYZ);
  const wp=xyz[white],Y=wp[1];if(Y<1e-6)return fallback;
  const adapted=xyz.map(c=>xyzToLab(adapt(c,wp.map(v=>v/Y))));
  const min=adapted[black][0],max=adapted[white][0];if(max-min<1e-3)return fallback;
  let gamutReduced=false;
  const labs=adapted.map((lab,i)=>{
   if(i===white)return [100,0,0];if(i===black)return [0,0,0];
   const target=[clamp((lab[0]-min)/(max-min),0,1)*100,lab[1],lab[2]],fitted=fitChroma(target);
   if(Math.hypot(fitted[1],fitted[2])+1e-5<Math.hypot(target[1],target[2]))gamutReduced=true;
   return fitted;
  });
  const colors=labs.map(lab=>toHex(linearFromLab(lab)));colors[white]='#ffffff';colors[black]='#000000';
  // Exact ideal endpoints imply no relative change for an sRGB-only profile.
  if(!source&&profile.renderColors[white]==='#ffffff'&&profile.renderColors[black]==='#000000')return {available:true,colors:profile.renderColors.slice(),gamutReduced:false,labs:adapted,adaptedLabs:adapted};
  return {available:true,colors,gamutReduced,labs,adaptedLabs:adapted};
 }
 function references(profile,mode='relative'){
  const source=profile.sourceLab,raw=source?source.values.map(lab=>adapt(labToXYZ(lab,whites[source.whitePoint]),whites[source.whitePoint])):profile.renderColors.map(rgbToXYZ);
  const white=profile.nominal.indexOf('#ffffff'),black=profile.nominal.indexOf('#000000');
  if(mode==='raw'||white<0||black<0)return {xyz:raw,available:false};
  const w=raw[white];if(w[1]<1e-6)return {xyz:raw,available:false};
  const aligned=raw.map(v=>adapt(v,w.map(x=>x/w[1]))),hi=aligned[white],lo=aligned[black];
  if(hi.some((v,k)=>v-lo[k]<1e-6))return {xyz:raw,available:false};
  const xyz=aligned.map(v=>v.map((x,k)=>(x-lo[k])/(hi[k]-lo[k])*whites.D65[k]));xyz[white]=whites.D65.slice();xyz[black]=[0,0,0];
  return {xyz,available:true};
 }
 const api={whites,matrix,adapt,labToXYZ,xyzToLab,rgbToXYZ,labHex,fitChroma,normalize,references};root.Colorimetry=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

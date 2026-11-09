/* RGB convex-gamut projection: discard unrepresentable source error before diffusion. */
(function(root){
 'use strict';
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sub=(a,b)=>a.map((v,k)=>v-b[k]);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const dist=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2,eps=1e-8;
 function segment(p,a,b){const v=sub(b,a),length=dot(v,v),t=length?Math.max(0,Math.min(1,dot(sub(p,a),v)/length)):0;return a.map((x,k)=>x+t*v[k]);}
 function prepare(colors){
  const vertices=colors.map(c=>c.map(v=>v/255)),triangles=[],edges=[];let full=false;
  for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)edges.push([vertices[i],vertices[j]]);
  for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
   const a=vertices[i],b=vertices[j],c=vertices[k],ab=sub(b,a),ac=sub(c,a),n=cross(ab,ac),nn=dot(n,n);if(nn<eps*eps)continue;
   const d00=dot(ab,ab),d01=dot(ab,ac),d11=dot(ac,ac),inv=1/(d00*d11-d01*d01),length=Math.sqrt(nn),normal=n.map(v=>v/length),sides=vertices.map(v=>dot(sub(v,a),normal));
   if(sides.some(v=>Math.abs(v)>eps))full=true;
   triangles.push({a,b,c,ab,ac,n,nn,d00,d01,d11,inv,normal,sides});
  }
  const faces=full?triangles.filter(t=>!(t.sides.some(v=>v>eps)&&t.sides.some(v=>v< -eps))):triangles,planes=[];
  const seen=new Set();if(full)for(const face of faces){const sign=face.sides.some(v=>v>eps)?-1:1,n=face.normal.map(v=>v*sign),d=-dot(n,face.a),key=n.concat(d).map(v=>Math.round(v*1e7)).join(',');if(!seen.has(key)){seen.add(key);planes.push({n,d});}}
  const line=faces.length?null:edges.reduce((best,edge)=>!best||dist(...edge)>dist(...best)?edge:best,null);
  const memo=new Map();
  function project(color){
   const p=color.map(v=>v/255);
   if(full&&planes.every(plane=>dot(plane.n,p)+plane.d<=eps))return color;
   const integer=color.every(v=>Number.isInteger(v)&&v>=0&&v<=255),key=integer?((color[0]<<16)|(color[1]<<8)|color[2]):-1;if(integer&&memo.has(key))return memo.get(key);
   let best=vertices[0],distance=dist(p,best);
   function consider(q){const d=dist(p,q);if(d<distance){best=q;distance=d;}}
   if(line)consider(segment(p,...line));
   else for(const t of faces){
    const offset=dot(sub(p,t.a),t.n)/t.nn,q=p.map((v,k)=>v-offset*t.n[k]),aq=sub(q,t.a),d20=dot(aq,t.ab),d21=dot(aq,t.ac),v=(t.d11*d20-t.d01*d21)*t.inv,w=(t.d00*d21-t.d01*d20)*t.inv;
    if(v>=-eps&&w>=-eps&&v+w<=1+eps)consider(q);
    else{consider(segment(p,t.a,t.b));consider(segment(p,t.b,t.c));consider(segment(p,t.c,t.a));}
   }
   const result=distance<eps*eps?color:best.map(v=>Math.max(0,Math.min(255,v*255)));if(integer&&memo.size<32768)memo.set(key,result);return result;
  }
  return project;
 }
 root.Gamut={prepare};if(typeof module!=='undefined')module.exports=root.Gamut;
})(typeof window!=='undefined'?window:globalThis);

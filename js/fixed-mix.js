/* Fixed, equal-share palette mixtures. No error diffusion or variable ratios. */
(function(root){
 'use strict';
 function prepare(palette,{maxColors=2,biases=[],toLab}={}){
  if(!Number.isInteger(maxColors)||maxColors<1||maxColors>4)throw Error('maxColors: 1–4');
  const limit=Math.min(maxColors,palette.length),candidates=[],unique=new Map(),pureCandidates=new Map();
  function add(indices){
   const rgb=[0,1,2].map(k=>indices.reduce((sum,i)=>sum+palette[i][k],0)/indices.length),key=rgb.map(v=>v.toFixed(5)).join(',');
   if(unique.has(key)){if(indices.length===1)pureCandidates.set(rgb.join(','),unique.get(key));return;}
   unique.set(key,candidates.length);if(indices.length===1)pureCandidates.set(rgb.join(','),candidates.length);
   candidates.push({indices,rgb,lab:toLab(rgb),bias:indices.reduce((sum,i)=>sum+(biases[i]||0),0)/indices.length*650/19.5075});
  }
  function visit(start,indices,size){if(indices.length===size){add(indices);return;}for(let i=start;i<=palette.length-(size-indices.length);i++)visit(i+1,indices.concat(i),size);}
  for(let size=1;size<=limit;size++)visit(0,[],size);
  const exact=biases.some(Boolean)?new Map():pureCandidates;
  const cache=new Int16Array(32768);cache.fill(-1);
  function choose(rgb){
   const pure=exact.get(rgb.join(','));if(pure!==undefined)return pure;
   // A bounded RGB grid keeps custom palettes (up to 2,516 candidates) practical.
   const bins=rgb.map(v=>Math.max(0,Math.min(31,Math.round(v*31/255)))),key=(bins[0]<<10)|(bins[1]<<5)|bins[2];
   if(cache[key]>=0)return cache[key];
   const lab=toLab(bins.map(v=>v*255/31));let best=Infinity,chosen=0;
   for(let i=0;i<candidates.length;i++){const c=candidates[i],distance=(lab[0]-c.lab[0])**2+(lab[1]-c.lab[1])**2+(lab[2]-c.lab[2])**2-c.bias;if(distance<best-1e-9){best=distance;chosen=i;}}
   cache[key]=chosen;return chosen;
  }
  function index(candidate,x,y){const indices=candidates[candidate].indices;return indices[(x+y)%indices.length];}
  return {candidates,choose,index};
 }
 root.FixedMix={prepare};if(typeof module!=='undefined')module.exports=root.FixedMix;
})(typeof window!=='undefined'?window:globalThis);

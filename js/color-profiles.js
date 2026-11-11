/* Physical color references are separate from the nominal wire/export palette. */
(function(root){
 'use strict';
 const hex=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
 const colorimetry=root.Colorimetry||(typeof module!=='undefined'?require('./colorimetry.js'):null);
 function validate(value){
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.name!=='string'||!value.name.trim()||value.name.length>80)throw Error('Invalid color profile name.');
  const {nominal,renderColors}=value;
  if(!Array.isArray(nominal)||nominal.length<2||nominal.length>16||nominal.some(c=>!hex(c))||new Set(nominal.map(c=>c.toLowerCase())).size!==nominal.length||!Array.isArray(renderColors)||renderColors.length!==nominal.length||renderColors.some(c=>!hex(c)))throw Error('Invalid color profile palette.');
  if(value.source!==undefined&&(typeof value.source!=='string'||value.source.length>600))throw Error('Invalid color profile source.');
  if(value.kind!==undefined&&!['approximate','measured','manufacturer'].includes(value.kind))throw Error('Invalid color profile kind.');
  if(value.normalization!==undefined&&!['relative','raw'].includes(value.normalization))throw Error('Invalid profile normalization.');
  let sourceLab,mixing;
  if(value.mixing!==undefined){if(!value.mixing||value.mixing.model!=='power-xyz'||!Number.isFinite(value.mixing.exponent)||value.mixing.exponent<1||value.mixing.exponent>3)throw Error('Invalid mixture model.');mixing={model:'power-xyz',exponent:value.mixing.exponent};}
  if(value.sourceLab!==undefined){
   const lab=value.sourceLab;
   if(!lab||!['D50','D65'].includes(lab.whitePoint)||typeof lab.assumedWhitePoint!=='boolean'||!Array.isArray(lab.values)||lab.values.length!==nominal.length||lab.values.some(v=>!Array.isArray(v)||v.length!==3||v.some(n=>!Number.isFinite(n))||v[0]<0||v[0]>100||Math.abs(v[1])>160||Math.abs(v[2])>160))throw Error('Invalid Lab source data.');
   sourceLab={whitePoint:lab.whitePoint,assumedWhitePoint:lab.assumedWhitePoint,values:lab.values.map(v=>v.slice())};
   if(sourceLab.values.some((v,i)=>colorimetry.labHex(v,sourceLab.whitePoint)!==renderColors[i].toLowerCase()))throw Error('Lab source does not match RGB references.');
  }
  return {name:value.name.trim(),nominal:nominal.map(c=>c.toLowerCase()),renderColors:renderColors.map(c=>c.toLowerCase()),source:value.source||'',kind:value.kind||'approximate',normalization:value.normalization||'relative',...(sourceLab?{sourceLab}:{}),...(mixing?{mixing}:{})};
 }
 const builtins=[];
 const genericLab=[[68,-1,3],[14,3,-1],[29,41,27],[56,17,74]];
 builtins.push(validate({name:'BWRY · generische Näherung (feine Raster)',nominal:['#ffffff','#000000','#ff0000','#ffff00'],renderColors:genericLab.map(v=>colorimetry.labHex(v,'D50')),sourceLab:{whitePoint:'D50',assumedWhitePoint:false,values:genericLab},mixing:{model:'power-xyz',exponent:1.8},kind:'approximate',source:'Abgerundete Referenzfarben aus Foto-/Herstellervergleichen; Rasterwirkung aus Kamera-/Scannervergleichen angenähert. Kein universelles Panelprofil.'}));
 function key(colors){return colors.map(c=>c.toLowerCase()).sort().join(',');}
 function match(profile,colors){return key(profile.nominal)===key(colors);}
 function ordered(profile,colors){if(!match(profile,colors))throw Error('Color profile does not match output palette.');const refs=new Map(profile.nominal.map((c,i)=>[c,profile.renderColors[i]]));return colors.map(c=>refs.get(c.toLowerCase()));}
 const normalizedCache=new WeakMap();
 function normalization(profile){const key=JSON.stringify([profile.nominal,profile.renderColors,profile.sourceLab,profile.mixing]),cached=normalizedCache.get(profile);if(cached?.key===key)return cached.result;let result;
  if(profile.mixing){const refs=colorimetry.references(profile),labs=refs.xyz.map(v=>colorimetry.xyzToLab(v));result={available:refs.available,colors:labs.map(v=>colorimetry.labHex(v)),gamutReduced:false,labs,adaptedLabs:labs};}
  else result=colorimetry.normalize(profile);normalizedCache.set(profile,{key,result});return result;}
 function effective(profile,colors,mode=profile.normalization||'relative'){
  if(!['raw','relative'].includes(mode))throw Error('Invalid profile normalization.');
  if(mode==='raw')return ordered(profile,colors);
  return ordered({...profile,renderColors:normalization(profile).colors},colors);
 }
 function calculation(profile,colors,mode=profile.normalization||'relative'){
  if(!match(profile,colors))throw Error('Color profile does not match output palette.');
  if(!['relative','raw'].includes(mode))throw Error('Invalid profile normalization.');
  const renderColors=effective(profile,colors,mode);
  if(!profile.mixing)return {renderColors};
  const refs=colorimetry.references(profile,mode),lookup=new Map(profile.nominal.map((c,i)=>[c,refs.xyz[i]]));
  return {renderColors,reflectance:{xyz:colors.map(c=>lookup.get(c.toLowerCase()).slice()),exponent:profile.mixing.exponent}};
 }
 function fromAP(meta,colors){
  if(!meta||!meta.perceptual||typeof meta.perceptual!=='object'||Array.isArray(meta.perceptual)||!meta.colortable)return null;
  const toHex=c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isInteger(v)&&v>=0&&v<=255)?'#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''):null;
  const refs=new Map();
  for(const [name,value]of Object.entries(meta.colortable)){const nominal=toHex(value);if(!nominal)return null;const perceived=Object.hasOwn(meta.perceptual,name)?toHex(meta.perceptual[name]):nominal;if(!perceived||refs.has(nominal))return null;refs.set(nominal,perceived);}
  if(refs.size!==colors.length||colors.some(c=>!refs.has(c.toLowerCase())))return null;
  return validate({name:('AP · '+(typeof meta.name==='string'?meta.name:'Display')).slice(0,80),nominal:colors,renderColors:colors.map(c=>refs.get(c.toLowerCase())),source:'OpenEPaperLink · perceptual',kind:'approximate'});
 }
 const cache=new WeakMap();
 function preview(image,nominal,renderColors,reflectance){
  if(!renderColors||image.continuous)return image;
  const signature=JSON.stringify([nominal,renderColors,reflectance]),saved=cache.get(image);if(saved?.signature===signature)return saved.image;
  if(renderColors.length!==nominal.length||renderColors.some(c=>!hex(c)))throw Error('Invalid preview palette.');
  if(reflectance){const result={...image,reflectancePreview:{colors:nominal,model:reflectance}};cache.set(image,{signature,image:result});return result;}
  const rgb=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16)),pack=c=>(c[0]<<16)|(c[1]<<8)|c[2];
  const refs=new Map(nominal.map((c,i)=>[pack(rgb(c)),rgb(renderColors[i])]));
  const data=new Uint8ClampedArray(image.data);
  for(let p=0;p<data.length;p+=4){const c=refs.get((data[p]<<16)|(data[p+1]<<8)|data[p+2]);if(c)data.set(c,p);}
  const result={...image,data};cache.set(image,{signature,image:result});return result;
 }
 const api={validate,builtins,key,match,ordered,normalization,effective,calculation,fromAP,preview};root.ColorProfiles=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

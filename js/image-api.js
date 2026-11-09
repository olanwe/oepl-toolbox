/* Public RGBA interface. Crop/resize first; background composition precedes conversion. */
(function(root){
 'use strict';
 const engine=root.OEPLImage || (typeof module!=='undefined'?require('./image-converter.js'):null);
 const illustration=root.Illustration||(typeof module!=='undefined'?require('./illustration.js'):null);
 const modes={'none':'none','floyd':'floyd','floyd-steinberg':'floyd','ordered':'ordered','bayer':'ordered','fixed':'fixed','fixed-mix':'fixed','rgb':'rgb','gamut':'gamut'};
 function settings(options={}){
  let palette=options.palette??'BWRY';if(palette==='BWYR')palette='BWRY';
  const color=palette==='COLOR';
  const colors=Array.isArray(palette)?palette:engine.palettes[color?'BWRY':palette];
  if(!colors||colors.length<2||colors.length>16||colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))||new Set(colors.map(c=>c.toLowerCase())).size!==colors.length)throw Error('Palette: preset or 2–16 distinct #RRGGBB colors required.');
  const requested=options.dither??options.dithering??'none';if(!Object.hasOwn(modes,requested))throw Error('Unknown dithering mode: '+requested);
  const dither=color?'rgb':modes[requested],strength=options.strength??1,mixColors=options.mixColors??2;
  const corrected={brightness:options.brightness??0,contrast:options.contrast??1,saturation:options.saturation??1,threshold:options.threshold??128};
  for(const [name,min,max] of [['brightness',-255,255],['contrast',0,4],['saturation',0,4],['threshold',0,255]])if(!Number.isFinite(corrected[name])||corrected[name]<min||corrected[name]>max)throw Error('Invalid '+name);
  if(!Number.isFinite(strength)||strength<0||strength>1)throw Error('strength: 0–1');
  if(!Number.isInteger(mixColors)||mixColors<1||mixColors>4)throw Error('mixColors: 1–4');
  const biases=options.biases??[];if(!Array.isArray(biases)||biases.length>colors.length||biases.some(v=>!Number.isFinite(v)||Math.abs(v)>100))throw Error('Invalid palette biases.');
  const background=options.background??null;if(background!==null&&(typeof background!=='string'||!/^#[0-9a-f]{6}$/i.test(background)))throw Error('background: null or #RRGGBB');
  return {colors:[...colors],dither,strength,mixColors,...corrected,biases:[...biases],background,illustration:illustration.settings(options.illustration)};
 }
 function convert(options={}){
  const {width,height,data}=options;engine.dimensions(width,height);const config=settings(options);
  if(!data||data.length!==width*height*4||!['[object Uint8Array]','[object Uint8ClampedArray]'].includes(Object.prototype.toString.call(data)))throw Error('Expected width × height × 4 RGBA bytes.');
  const pixels=new Uint8ClampedArray(data);
  if(config.background){const bg=engine.rgb(config.background);for(let p=0;p<pixels.length;p+=4){const alpha=pixels[p+3]/255;for(let k=0;k<3;k++)pixels[p+k]=Math.round(pixels[p+k]*alpha+bg[k]*(1-alpha));pixels[p+3]=255;}}
  if(!Object.values(config.illustration).some(v=>v>0))return engine.quantize(pixels,width,height,config.colors,config);
  const prepared=illustration.prepare(pixels,width,height,config.colors,config.illustration);
  const output=engine.quantize(prepared.data,width,height,config.colors,config);
  return illustration.apply(output,prepared,config.colors,config.illustration);
 }
 const api={...engine,version:'1.1.0',illustration,settings,convert};root.OEPLImage=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

const {test}=require('node:test'),assert=require('node:assert/strict');
const profiles=require('../js/color-profiles'),api=require('../js/image-api'),EP=require('../js/core'),{bundle}=require('../build-image-converter.cjs');
const nominal=['#ffffff','#000000'],renderColors=['#b4b4b4','#1e1e1e'];
const pixels=(v,w=64,h=64)=>Uint8Array.from({length:w*h*4},(_,i)=>i%4===3?255:v);
const convert=(mode,value,extra={})=>api.convert({data:pixels(value),width:64,height:64,palette:nominal,dithering:mode,...extra});

test('ideal reference palettes preserve existing pixels and indices in every output mode',()=>{
 const data=Uint8Array.from({length:16*16*4},(_,i)=>i%4===3?120:(i*37)%256);
 for(const colors of Object.values(EP.palettes))for(const dither of ['none','floyd','ordered','fixed','rgb','gamut']){
  const opts={data,width:16,height:16,palette:colors,dither,mixColors:3,strength:.65};
  assert.deepEqual(api.convert({...opts,renderColors:colors}),api.convert(opts));
 }
});
test('profile changes nearest-color decisions while export bytes remain nominal',()=>{
 const ideal=convert('none',105),physical=convert('none',105,{renderColors});
 assert.equal(ideal.indices[0],1);assert.equal(physical.indices[0],0);
 assert.deepEqual([...physical.data.subarray(0,4)],[255,255,255,255]);
});
test('Floyd error diffusion uses actual reference colors, not nominal export bytes',()=>{
 const ideal=convert('floyd',105),physical=convert('floyd',105,{renderColors});
 const fraction=image=>Array.from(image.indices).filter(v=>v===0).length/image.indices.length;
 assert.ok(Math.abs(fraction(physical)-.5)<.01);
 assert.ok(Math.abs(fraction(ideal)-105/255)<.01);
 assert.ok(Math.abs(fraction(physical)-fraction(ideal))>.07);
});
test('fixed mixtures and Bayer use physical references and all outputs remain palette-limited',()=>{
 const ideal=convert('fixed',180),physical=convert('fixed',180,{renderColors});
 assert.ok(ideal.indices.some(v=>v===1));assert.ok(physical.indices.every(v=>v===0));
 for(const mode of ['none','floyd','ordered','fixed']){
  const result=convert(mode,105,{renderColors});
  for(let p=0;p<result.indices.length;p++){const v=result.indices[p]===0?255:0;assert.deepEqual([...result.data.subarray(p*4,p*4+4)],[v,v,v,255]);}
 }
 assert.notDeepEqual(convert('ordered',105,{renderColors}).indices,convert('ordered',105).indices);
});
test('continuous AP preparation ignores profiles and invalid profile palettes are rejected',()=>{
 for(const mode of ['rgb','gamut'])assert.deepEqual(convert(mode,105,{renderColors}),convert(mode,105));
 for(const invalid of [null,[],['#fff','#000000'],['#ffffff'],['#ffffff',NaN]])assert.throws(()=>convert('floyd',105,{renderColors:invalid}));
});
test('profile matching remaps by nominal color, independently of palette order',()=>{
 const profile=profiles.validate({name:' Panel ',nominal,renderColors});assert.equal(profile.name,'Panel');
 assert.deepEqual(profiles.ordered(profile,['#000000','#FFFFFF']),['#1e1e1e','#b4b4b4']);
 assert.throws(()=>profiles.ordered(profile,['#ffffff','#ff0000']));
 const roundTrip=JSON.parse(JSON.stringify(profile));assert.deepEqual(profiles.validate(roundTrip),profile);
 for(const value of [null,{...profile,nominal:['#fff','#000']},{...profile,nominal:['#ffffff','#FFFFFF']},{...profile,name:''},{...profile,renderColors:[]},{...profile,kind:'unknown'},{...profile,source:'x'.repeat(601)}])assert.throws(()=>profiles.validate(value));
});
test('AP profile imports partial perceptual maps by color name and validates all channels',()=>{
 const colors=['#ffffff','#000000','#ff0000','#ffff00'];
 const meta={name:'M3',colortable:{yellow:[255,255,0],red:[255,0,0],black:[0,0,0],white:[255,255,255]},perceptual:{yellow:[200,200,0]}};
 const profile=profiles.fromAP(meta,colors);assert.deepEqual(profile.renderColors,['#ffffff','#000000','#ff0000','#c8c800']);
 assert.equal(profiles.fromAP({...meta,perceptual:null},colors),null);
 assert.equal(profiles.fromAP({...meta,perceptual:{yellow:[300,0,0]}},colors),null);
 assert.equal(profiles.fromAP(meta,nominal),null);
});
test('profile preview recolors composed pixels without changing indices, alpha or exports',()=>{
 const image={data:Uint8ClampedArray.of(255,255,255,128,0,0,0,0),indices:Uint8Array.of(0,1),width:2,height:1},before=image.data.slice();
 const preview=profiles.preview(image,nominal,renderColors);
 assert.deepEqual([...preview.data],[180,180,180,128,30,30,30,0]);assert.deepEqual(image.data,before);assert.equal(preview.indices,image.indices);
 assert.equal(profiles.preview(image,nominal,renderColors),preview);
 assert.equal(profiles.preview(image,nominal),image);
 const continuous={...image,continuous:true};assert.equal(profiles.preview(continuous,nominal,renderColors),continuous);
});
test('drawing retains explicitly selected nominal colors with extreme profiles',()=>{
 const result=EP.quantize(Uint8Array.of(255,0,0,255),1,1,['#ffffff','#ff0000'],{renderColors:['#ff0000','#000000'],exactNominal:true});
 assert.equal(result.indices[0],1);assert.deepEqual([...result.data],[255,0,0,255]);
});
test('portable converter includes physical color matching with no external dependencies',()=>{
 const module={exports:{}};new Function('module',bundle())(module);
 const options={data:pixels(105),width:64,height:64,palette:nominal,renderColors,dither:'floyd'};
 assert.deepEqual(module.exports.convert(options),api.convert(options));
});

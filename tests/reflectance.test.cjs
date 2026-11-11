const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/colorimetry'),P=require('../js/color-profiles'),R=require('../js/reflectance'),api=require('../js/image-api'),EP=require('../js/core'),{bundle}=require('../build-image-converter.cjs');
const generic=P.builtins.find(p=>p.mixing),colors=['#ffffff','#000000'],xyz=[C.whites.D65,[0,0,0]],gray=(level,w=96,h=96)=>Uint8Array.from({length:w*h*4},(_,i)=>i%4===3?255:level);
const profile=n=>P.validate({name:'BW model',nominal:colors,renderColors:colors,mixing:{model:'power-xyz',exponent:n}});
const fraction=r=>Array.from(r.indices).filter(i=>i===0).length/r.indices.length;

test('generic reflectance profile is optional, portable and preserves provenance',()=>{
 assert.equal(generic.kind,'approximate');assert.equal(generic.mixing.exponent,1.8);assert.equal(generic.sourceLab.whitePoint,'D50');
 assert.deepEqual(P.validate(JSON.parse(JSON.stringify(generic))),generic);
 for(const mixing of [{model:'other',exponent:1.8},{model:'power-xyz',exponent:NaN},{model:'power-xyz',exponent:.9},{model:'power-xyz',exponent:3.1},null])assert.throws(()=>P.validate({...generic,mixing}));
});
test('physical normalization preserves full XYZ references and follows nominal order',()=>{
 const before=JSON.stringify(generic),refs=P.calculation(generic,generic.nominal).reflectance;
 assert.deepEqual(refs.xyz[0],C.whites.D65);assert.deepEqual(refs.xyz[1],[0,0,0]);
 assert.deepEqual(P.calculation(generic,generic.nominal.slice().reverse()).reflectance.xyz,refs.xyz.slice().reverse());
 const raw=P.calculation({...generic,normalization:'raw'},generic.nominal).reflectance;
 assert.notDeepEqual(raw.xyz[0],C.whites.D65);assert.equal(JSON.stringify(generic),before);
 const negative=[.1,.05,-.01];for(const n of [1,1.8,3])R.inverse(R.forward(negative,n),n).forEach((v,i)=>assert.ok(Math.abs(v-negative[i])<1e-10));
});
test('root-space projection preserves luminance and representable mixtures',()=>{
 const refs=P.calculation(generic,generic.nominal).reflectance,palette=refs.xyz.map(v=>R.forward(v,refs.exponent)),project=R.projector(palette);
 for(let i=0;i<20;i++){const weights=[i+1,3,7,5],sum=weights.reduce((a,b)=>a+b),v=[0,1,2].map(k=>palette.reduce((s,p,j)=>s+p[k]*weights[j]/sum,0));assert.ok(Math.hypot(...project(v).map((x,k)=>x-v[k]))<1e-5);assert.ok(Math.abs(project([v[0]+500,v[1],v[2]-500])[1]-v[1])<1e-6);}
});
test('Floyd fractions compensate the measured direction of raster darkening',()=>{
 const options={data:gray(128),width:96,height:96,palette:colors,dither:'floyd'},linear=api.convert({...options,colorProfile:profile(1)}),power=api.convert({...options,colorProfile:profile(1.8)});
 const target=((128/255+.055)/1.055)**2.4;
 assert.ok(Math.abs(fraction(linear)-target)<.005);assert.ok(Math.abs(fraction(power)**1.8-target)<.005);assert.ok(fraction(power)>fraction(linear)+.15);
});

test('simplex mixture coordinates preserve signed residuals and palette order',()=>{
 const model=P.calculation(generic,generic.nominal).reflectance,palette=model.xyz.map(v=>R.forward(v,model.exponent));
 for(const order of [[0,1,2,3],[3,2,1,0]]){
  const p=order.map(i=>palette[i]),coordinates=R.mixtureCoordinates(p);
  for(const weights of [[.1,.6,.2,.1],[.2,.7,0,.1],[-.1,1.2,.2,-.3]]){
   const v=[0,1,2].map(k=>p.reduce((sum,c,i)=>sum+c[k]*weights[i],0));
   coordinates(v).forEach((w,i)=>assert.ok(Math.abs(w-weights[i])<1e-9));
  }
 }
 assert.equal(R.mixtureCoordinates([[0,0,0],[1,1,1],[2,2,2]]),null);
 assert.equal(R.mixtureCoordinates([[10,10,10],[10,10,10]]),null);
 assert.equal(R.mixtureCoordinates([...palette,[80,90,100]]),null);
});

test('Bayer tiles do not depend on previously encountered colors in the cache',()=>{
 const width=8,height=4,a=[30,30,10],b=[30,30,19],render=first=>api.convert({data:Uint8Array.from({length:width*height*4},(_,i)=>i%4===3?255:((i>>2)%width<4?first:a)[i%4]),width,height,palette:'BWRY',colorProfile:generic,dither:'ordered'}).indices;
 const plain=render(a),changed=render(b);
 for(let y=0;y<height;y++)assert.deepEqual(plain.slice(y*width+4,y*width+8),changed.slice(y*width+4,y*width+8));
});

test('identical custom pigment references stay finite in every quantized mode',()=>{
 const profile=P.validate({name:'Coincident references',nominal:['#ffffff','#000000','#ff0000'],renderColors:['#808080','#808080','#808080'],mixing:{model:'power-xyz',exponent:1.8}});
 for(const dither of ['none','floyd','ordered','fixed']){
  const result=api.convert({data:gray(128,12,8),width:12,height:8,palette:profile.nominal,colorProfile:profile,dither});
  assert.ok(result.indices.every(i=>i===0));assert.ok(result.data.every((v,i)=>i%4===3||v===255));
 }
});

test('olive gamut-face targets do not acquire red at Floyd startup or in Bayer tiles',()=>{
 const model=P.calculation(generic,generic.nominal).reflectance,palette=model.xyz.map(v=>R.forward(v,model.exponent)),project=R.projector(palette),coordinates=R.mixtureCoordinates(palette);
 for(const rgb of [[68,54,21],[74,60,20]]){
  const hex='#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join(''),target=project(R.forward(C.rgbToXYZ(hex),model.exponent)),weights=coordinates(target),width=128,height=96;
  assert.ok(Math.abs(weights[2])<1e-9);
  const data=Uint8Array.from({length:width*height*4},(_,i)=>i%4===3?255:rgb[i%4]);
  for(const dither of ['floyd','ordered']){
   const r=api.convert({data,width,height,palette:'BWRY',colorProfile:generic,dither});
   assert.ok(!r.indices.includes(2),'no out-of-face red, including the first scanline');
   if(dither==='floyd')for(let k=0;k<4;k++){
    const fraction=Array.from(r.indices).filter(i=>i===k).length/r.indices.length;
    assert.ok(Math.abs(fraction-weights[k])<.002,'diffusion retains the intended mixture');
   }
  }
 }
});

test('warm colors retain their red component rather than globally suppressing it',()=>{
 const width=128,height=96,rgb=[93,57,35],data=Uint8Array.from({length:width*height*4},(_,i)=>i%4===3?255:rgb[i%4]),model=P.calculation(generic,generic.nominal).reflectance,palette=model.xyz.map(v=>R.forward(v,model.exponent)),target=R.projector(palette)(R.forward(C.rgbToXYZ('#5d3923'),model.exponent)),weights=R.mixtureCoordinates(palette)(target);
 const r=api.convert({data,width,height,palette:'BWRY',colorProfile:generic,dither:'floyd'});
 assert.ok(weights[2]>.1);assert.ok(Math.abs(Array.from(r.indices).filter(i=>i===2).length/r.indices.length-weights[2])<.002);
});
test('ordered tiles use the same model and fixed mixtures match their predicted tone',()=>{
 const r=api.convert({data:gray(128),width:96,height:96,palette:colors,dither:'ordered',colorProfile:profile(1.8)}),target=((128/255+.055)/1.055)**2.4;
 assert.ok(Math.abs(fraction(r)**1.8-target)<.04);
 const tone=R.screen(C.whites.D65.map(v=>v*.5**1.8))[0],fixed=api.convert({data:gray(tone),width:96,height:96,palette:colors,dither:'fixed',colorProfile:profile(1.8)});assert.equal(fraction(fixed),.5);
});
test('no-dither endpoint, literal drawing colors and alpha remain intact',()=>{
 const data=Uint8ClampedArray.from({length:16*16*4},(_,i)=>i%4===3?(i*29)%256:(i*47)%256),before=data.slice(),config={data,width:16,height:16,palette:'BWRY',colorProfile:generic};
 for(const dither of ['floyd','ordered'])assert.deepEqual(api.convert({...config,dither,strength:0}),api.convert({...config,dither:'none'}));
 for(const dither of ['none','fixed','ordered','floyd']){
  const r=api.convert({...config,dither});for(let i=0;i<256;i++){assert.equal(r.data[i*4+3],data[i*4+3]);assert.deepEqual([...r.data.subarray(i*4,i*4+3)],EP.rgb(generic.nominal[r.indices[i]]));}
 }
 const literal=EP.quantize(Uint8ClampedArray.of(255,0,0,255),1,1,generic.nominal,{...P.calculation(generic,generic.nominal),exactNominal:true,dither:'floyd'});assert.equal(literal.indices[0],2);assert.deepEqual(data,before);
});
test('continuous AP preparation and old profiles retain their previous behavior',()=>{
 const config={data:gray(128,16,16),width:16,height:16,palette:'BWRY'};
 for(const dither of ['rgb','gamut'])assert.deepEqual(api.convert({...config,dither,colorProfile:generic}),api.convert({...config,dither}));
 for(const p of require('./legacy-profile-fixtures.cjs'))for(const dither of ['none','fixed','ordered','floyd'])assert.deepEqual(api.convert({...config,palette:p.nominal,dither,colorProfile:p}),api.convert({...config,palette:p.nominal,dither,renderColors:P.effective(p,p.nominal)}));
});
test('model preview preserves uniform colors, handles alpha and predicts checker darkening',()=>{
 const n=1.8,model={xyz,exponent:n},w=64,h=64,checker=Uint8ClampedArray.from({length:w*h*4},(_,i)=>i%4===3?255:(((i>>2)%w+Math.floor((i>>2)/w))%2?255:0)),before=checker.slice();
 const preview=R.preview(checker,w,h,colors,model,2),at=(32*w+32)*4,expected=R.screen(C.whites.D65.map(v=>v*.5**n))[0];assert.ok(Math.abs(preview[at]-expected)<2);assert.deepEqual(checker,before);
 for(const level of [0,255]){const v=gray(level,w,h),p=R.preview(v,w,h,colors,model,2);assert.deepEqual(p,new Uint8ClampedArray(v));}
 const transparent=Uint8ClampedArray.of(255,255,255,0,0,0,0,255),p=R.preview(transparent,2,1,colors,model,1);assert.equal(p[0],0);assert.equal(p[4],0);assert.ok(p[3]>0&&p[7]<255);
});
test('standalone converter includes the empirical model without external dependencies',()=>{
 const module={exports:{}};new Function('module',bundle())(module);const config={data:gray(127,16,16),width:16,height:16,palette:'BWRY',colorProfile:generic};
 for(const dither of ['none','fixed','ordered','floyd','rgb','gamut'])assert.deepEqual(module.exports.convert({...config,dither}),api.convert({...config,dither}));
 assert.equal(typeof module.exports.reflectance.preview,'function');
 for(const [w,h,r]of [[0,1,0],[1,1,NaN],[1,1,5],[5000,1,0]])assert.throws(()=>module.exports.reflectance.preview(Uint8ClampedArray.of(0,0,0,255),w,h,colors,{xyz,exponent:1.8},r));
});

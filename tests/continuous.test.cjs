const {test}=require('node:test'),assert=require('node:assert/strict');
const EP=require('../js/core.js'),AP=require('../js/ap.js');
test('continuous RGB preserves gradients and alpha exactly, independent of palette preferences and dither strength',()=>{
 const data=new Uint8ClampedArray(Array.from({length:256},(_,v)=>[v,255-v,75,v]).flat());
 const a=EP.quantize(data,256,1,EP.palettes.BWRY,{dither:'rgb',strength:0,biases:[100,-100,100,100]});assert.deepEqual(a.data,data);assert.ok(a.continuous);assert.throws(()=>EP.vlw(a,EP.palettes.BWRY));
 assert.deepEqual(EP.quantize(data,256,1,EP.palettes.BW,{dither:'rgb',strength:1}).data,data);
});
test('continuous corrections apply before gamut mapping and inversion preserves alpha',()=>{
 const data=Uint8ClampedArray.of(100,130,160,90),a=EP.quantize(data,1,1,EP.palettes.BW,{dither:'rgb',saturation:0,brightness:10});assert.equal(a.data[0],136);assert.equal(a.data[1],136);assert.equal(a.data[3],90);
 assert.deepEqual(Array.from(EP.invert(a,[]).data),[119,119,119,90]);
 const g=EP.quantize(Uint8ClampedArray.of(20,200,70,77),1,1,EP.palettes.BWRY,{dither:'gamut'});assert.deepEqual(Array.from(g.data),[110,110,70,77]);
});
test('continuous output stays continuous through crop, rotation and round trip orientation',()=>{
 const a=EP.quantize(Uint8ClampedArray.of(1,2,3,255,4,5,6,0),2,1,EP.palettes.BW,{dither:'rgb'});const b=EP.rotate(a,90);assert.equal(b.continuous,true);assert.deepEqual(EP.rotate(b,-90),a);const c=EP.cropImage(b,{x:0,y:0,w:1,h:1});assert.equal(c.continuous,true);assert.throws(()=>EP.vlw(c,EP.palettes.BW));
});
test('AP dither choices propagate to both upload paths, without altering JPEG bytes',async()=>{
 const old=global.fetch,bytes=Uint8Array.of(255,216,255,217);let path;
 try{for(const fallback of [false,true])for(const dither of [0,1,2]){
 global.fetch=async(url,opts)=>{
 if(url.endsWith('/imgupload')){assert.equal(opts.body.get('dither'),String(dither));assert.deepEqual(new Uint8Array(await opts.body.get('file').arrayBuffer()),bytes);return new Response('ok',{status:fallback?413:200});}
 if(url.includes('/edit?list='))return new Response('[]');
 if(url.endsWith('/littlefs_put')){path=opts.body.get('path');assert.deepEqual(new Uint8Array(await opts.body.get('file').arrayBuffer()),bytes);return new Response('ok');}
 if(url.includes('/edit?download='))return new Response(bytes);
 if(url.endsWith('/save_cfg')){const config=JSON.parse(opts.body.get('modecfgjson'));assert.equal(config.filename,path);assert.equal(config.dither,String(dither));return new Response('Ok, saved');}
 throw Error(url);};
 assert.equal((await AP.upload('http://ap','0011223344556677',new Blob([bytes]),()=>{},{dither})).via,fallback?'filesystem':'direct');
 }
 await assert.rejects(AP.upload('http://ap','0011223344556677',new Blob(),()=>{},{dither:3}));
 }finally{global.fetch=old;}
});

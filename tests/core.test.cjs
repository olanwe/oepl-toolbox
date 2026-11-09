const {test} = require('node:test');
const assert = require('node:assert/strict');
const EP = require('../js/core.js');
const AP = require('../js/ap.js');
const encode = require('../vendor/jpeg-encoder.js');
function pixels(colors, alpha = 255) { return new Uint8ClampedArray(colors.flatMap(c => [...EP.rgb(c), alpha])); }
function glyphs(font) {
  const v = new DataView(font.bytes.buffer, font.bytes.byteOffset, font.bytes.length), n = v.getInt32(0), result = [];
  let at = 24 + n * 28;
  for (let i = 0; i < n; i++) {
    const offset = 24 + i * 28, values = Array.from({length: 7}, (_, k) => v.getInt32(offset + k * 4));
    const [char, h, w, advance, top, left] = values;
    result.push({char: String.fromCharCode(char), h, w, advance, top, left, data: font.bytes.slice(at, at + h * w)}); at += h * w;
  }
  assert.deepEqual(Array.from(font.bytes.slice(at)), [0,5,73,109,97,103,101,0,5,73,109,97,103,101,0]);
  return result;
}
test('exact palette pixels survive all dither methods, including alpha', () => {
  for (const palette of Object.values(EP.palettes)) for (const dither of ['none', 'floyd', 'ordered']) {
    const src = pixels(palette, 120), image = EP.quantize(src, palette.length, 1, palette, {dither});
    assert.deepEqual(image.data, src);
  }
});
test('VLW encodes every palette plane, white and coverage; preserves old black/accent characters', () => {
  const colors = EP.palettes.BWRY, src = pixels(colors); src[3] = 0; src[7] = 128;
  const result = EP.quantize(src, 4, 1, colors), font = EP.vlw(result, colors), g = glyphs(font);
  assert.equal(g.length, 5); assert.equal(g[0].char, '0'); assert.equal(g[1].char, '1');
  assert.equal(g[0].left, 1); assert.equal(g[0].data[0], 128); assert.equal(g[1].left, 2);
  assert.equal(g[3].w, 0); assert.equal(g[3].h, 0);
  assert.deepEqual(Array.from(g[4].data), [128,255,255]); assert.equal(g[4].left, 1);
});
test('all-transparent VLW has nonnegative empty bounds', () => {
  const image = EP.quantize(pixels(['#ff0000', '#000000'], 0), 2, 1, EP.palettes.BWR);
  glyphs(EP.vlw(image, EP.palettes.BWR)).forEach(g => { assert.equal(g.w, 0); assert.equal(g.h, 0); });
});
test('multi-plane x-zero patch anchors planes and draws original owner last', () => {
  const palette = EP.palettes.BWRY, image = EP.quantize(pixels(['#ff0000','#000000','#ffff00','#ffffff']), 4, 1, palette);
  const font = EP.vlw(image, palette, true), g = glyphs(font);
  assert.equal(font.patched, true); assert.equal(font.order.at(-1), 1);
  g.slice(0, 4).forEach(glyph => assert.equal(glyph.left, 0));
  assert.equal(g[4].w, 4);
});
test('partial alpha blocks unsafe patch; mask can be omitted', () => {
  const palette = EP.palettes.BW, image = EP.quantize(pixels(palette, 128), 2, 1, palette);
  assert.throws(() => EP.vlw(image, palette, true), /harte Transparenz/);
  assert.equal(glyphs(EP.vlw(image, palette, false, false)).length, 2);
});
test('VLW warns on cropped planes over legacy 255 pixel limit', () => {
  const data = pixels(Array(256).fill('#000000')), image = EP.quantize(data, 256, 1, EP.palettes.BW);
  assert.equal(EP.vlw(image, EP.palettes.BW).oversized, true);
});
test('threshold and color bias change assignments', () => {
  const gray = new Uint8ClampedArray([140,140,140,255]);
  assert.equal(EP.quantize(gray, 1, 1, EP.palettes.BW).indices[0], 0);
  assert.equal(EP.quantize(gray, 1, 1, EP.palettes.BW, {threshold: 200}).indices[0], 1);
  assert.equal(EP.quantize(gray, 1, 1, EP.palettes.BW, {biases: [0,100]}).indices[0], 1);
});
test('dithering produces spatial mixtures without invalid palette colors', () => {
  for (const dither of ['floyd','ordered']) {
    const image = EP.quantize(new Uint8ClampedArray(Array.from({length:64}, () => [128,128,128,255]).flat()), 8, 8, EP.palettes.BW, {dither});
    assert.equal(new Set(image.indices).size, 2); assert.ok(image.indices.every(i => i < 2));
  }
});
test('dimensions reject invalid and excessive allocations', () => {
  for (const [w,h] of [[0,1],[-1,1],[1.5,3],[4097,1],[4096,4096],[NaN,1]]) assert.throws(() => EP.dimensions(w,h));
});
test('JPEG is baseline SOF0 with 4:4:4 component sampling and expected dimensions', () => {
  const data = encode({width: 4, height: 1, data: pixels(EP.palettes.BWRY)}, 100).data;
  let pos = 2, sof;
  while (pos < data.length) {
    assert.equal(data[pos++], 255); const marker = data[pos++];
    if (marker === 0xda) break;
    const len = (data[pos] << 8) | data[pos+1];
    assert.notEqual(marker, 0xc2);
    if (marker === 0xc0) sof = data.slice(pos+2,pos+len);
    pos += len;
  }
  assert.ok(sof); assert.equal((sof[1]<<8)|sof[2],1); assert.equal((sof[3]<<8)|sof[4],4);
  assert.deepEqual([sof[7],sof[10],sof[13]], [0x11,0x11,0x11]);
});
test('AP validates URLs and MACs', () => {
  assert.equal(AP.normalize('192.168.1.50/'), 'http://192.168.1.50');
  assert.throws(() => AP.normalize('file:///temp')); assert.throws(() => AP.normalize('http://a:b@ap'));
  assert.equal(AP.mac('00:11:22:33:44:55:66:77'), '0011223344556677'); assert.throws(() => AP.mac('../secret'));
});
test('AP pagination and upload fields match OEPL contract', async () => {
  const old = global.fetch, requests = [];
  global.fetch = async (url, options) => {
    requests.push({url,options});
    return new Response(JSON.stringify(url.endsWith('pos=0') ? {tags:[{mac:'a'}],continu:4} : {tags:[{mac:'b'}]}));
  };
  try {
    assert.equal((await AP.tags('http://ap')).length,2);
    await AP.upload('http://ap','0011223344556677',new Blob(['jpeg'],{type:'image/jpeg'}));
    const last = requests.at(-1); assert.equal(last.url,'http://ap/imgupload'); assert.equal(last.options.method,'POST');
    assert.equal(last.options.body.get('dither'),'0'); assert.equal(last.options.body.get('contentmode'),'22'); assert.equal(last.options.body.get('file').name,'image.jpg');
  } finally { global.fetch = old; }
});
test('RAW decoder reads bit planes and packed multi-color data; rejects mismatches', async () => {
  const colortable = {'0':[255,255,255],'1':[0,0,0],'2':[255,0,0],'3':[255,255,0]};
  const meta = {width:8,height:1,bpp:2,colortable};
  let image = await AP.decodeRaw(Uint8Array.of(0x80,0x40).buffer,meta);
  assert.deepEqual(Array.from(image.data.slice(0,12)), [0,0,0,255,255,0,0,255,255,255,255,255]);
  image = await AP.decodeRaw(Uint8Array.of(0x1b,0x1b).buffer,{...meta,bpp:5});
  assert.deepEqual(Array.from(image.data.slice(0,16)),Array.from(pixels(EP.palettes.BWRY)));
  await assert.rejects(AP.decodeRaw(new ArrayBuffer(3),meta), /Länge/);
  await assert.rejects(AP.decodeRaw(Uint8Array.of(6,8,0,1,0,1,0).buffer,{...meta,g5_compression:'10'},32), /Group5/);
});
test('zlib RAW removes length prefix and inflated OEPL header', async () => {
  const {deflateSync} = require('node:zlib');
  const payload = deflateSync(Uint8Array.of(6,8,0,1,0,1,0x80));
  const buffer = Buffer.concat([Buffer.alloc(4),payload]);
  const result = await AP.decodeRaw(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.length), {width:8,height:1,bpp:1,zlib_compression:'27',colortable:{white:[255,255,255],black:[0,0,0]}},41);
  assert.deepEqual(Array.from(result.data.slice(0,8)),[0,0,0,255,255,255,255,255]);
});
test('Group5 uses supplied decoder and removes row padding', async () => {
  const buffer = Uint8Array.of(6,3,0,2,0,1,123).buffer;
  let called = false;
  const result = await AP.decodeRaw(buffer,{width:3,height:2,bpp:1,g5_compression:'29',colortable:{white:[255,255,255],black:[0,0,0]}},41,async (bytes,w,h) => {
    called = true; assert.equal(w,3); assert.equal(h,2); assert.deepEqual(Array.from(bytes),[123]); return Uint8Array.of(0xa0,0x40);
  });
  assert.ok(called); assert.deepEqual(Array.from(result.data.filter((_,i) => i%4===0)),[0,255,0,255,0,255]);
});
test('RGB565 and RGB332 AP previews decode', async () => {
  const meta = {width:1,height:1,bpp:16};
  assert.deepEqual(Array.from((await AP.decodeRaw(Uint8Array.of(0xf8,0).buffer,meta)).data),[255,0,0,255]);
  assert.deepEqual(Array.from((await AP.decodeRaw(Uint8Array.of(0x1c).buffer,meta)).data),[0,255,0,255]);
});
test('AP can fall back to raw even when firmware supports zlib', async () => {
  const result = await AP.decodeRaw(Uint8Array.of(0x80).buffer,{width:8,height:1,bpp:1,zlib_compression:'27',colortable:{white:[255,255,255],black:[0,0,0]}},41);
  assert.equal(result.data[0],0);
});
test('quarter turns preserve coordinates, palette indices and alpha; native round trip is exact', () => {
  const palette = EP.palettes.BWRY, image = EP.quantize(pixels(palette,128),2,2,palette);
  assert.deepEqual(Array.from(EP.rotate(image,90).indices),[2,0,3,1]);
  for (const angle of [0,90,180,270]) {
    const rectangular = {...image,width:4,height:1};
    const rotated = EP.rotate(rectangular,angle);
    assert.equal(rotated.width,angle%180?1:4);
    assert.deepEqual(EP.rotate(rotated,-angle),rectangular);
  }
  assert.throws(()=>EP.rotate(image,45),/Vielfaches/);
});
test('AP-style inversion swaps only black and white, keeping accents and alpha', () => {
  const image = EP.quantize(pixels(EP.palettes.BWRY,128),4,1,EP.palettes.BWRY);
  const inverse = EP.invert(image,EP.palettes.BWRY);
  assert.deepEqual(Array.from(inverse.indices),[1,0,2,3]);
  assert.deepEqual(EP.invert(inverse,EP.palettes.BWRY),image);
  assert.equal(inverse.data[3],128);
});
test('VLW templates preserve patch order, hex colors and coordinates and omit alpha mask', () => {
  const image = EP.quantize(pixels(EP.palettes.BWRY),4,1,EP.palettes.BWRY), font = EP.vlw(image,EP.palettes.BWRY,true);
  const json = EP.template(font,'/fonts/test.vlw',12,-2);
  assert.equal(json.length,4);
  assert.deepEqual(json.map(e=>e.text[2]),font.order.map(i=>font.mapping[i].char));
  json.forEach(e=>{assert.equal(e.text[0],12);assert.equal(e.text[1],-2);assert.match(e.text[4],/^#[0-9a-f]{6}$/);});
  assert.throws(()=>EP.template(font,'/fonts/../test.vlw'),/Pfad/);
  assert.throws(()=>EP.template(font,'/fonts/test.vlw',.5,0),/Position/);
});
test('VLW import round-trips color planes, alpha and patch order with sidecar mapping', () => {
  const colors = EP.palettes.BWRY, raw = pixels(colors,128); raw[3]=0;
  const image = EP.quantize(raw,4,1,colors), font = EP.vlw(image,colors);
  const decoded = EP.readVlw(font.bytes,colors,{layers:font.mapping,drawOrder:font.order.map(i=>font.mapping[i].char)});
  for(let p=0;p<4;p++) { assert.equal(decoded.data[p*4+3],image.data[p*4+3]); if(image.data[p*4+3]) assert.deepEqual(decoded.data.slice(p*4,p*4+4),image.data.slice(p*4,p*4+4)); }
  const opaque = EP.quantize(pixels(colors),4,1,colors), patched = EP.vlw(opaque,colors,true);
  assert.deepEqual(EP.readVlw(patched.bytes,colors,{layers:patched.mapping,drawOrder:patched.order.map(i=>patched.mapping[i].char)}).data,opaque.data);
  assert.throws(()=>EP.readVlw(new Uint8Array(24),colors),/Bildfont/);
});
test('AP filesystem validates paths, blocks overwrites, and verifies uploaded bytes', async () => {
  assert.throws(()=>AP.filePath('/images/../current/a.json'),/Ungültiger/);
  assert.throws(()=>AP.writablePath('/fonts/'+'x'.repeat(25)+'.layers.json'),/31 Zeichen/);
  const original=global.fetch; let posted=0, exists=false, corrupt=false, content=Uint8Array.of(1,2,3);
  global.fetch=async(url,options)=>{
    if(url.includes('/edit?list='))return new Response(JSON.stringify(exists?[{type:'file',name:'test.jpg'}]:[]));
    if(url.endsWith('/littlefs_put')) {posted++; assert.equal(options.body.get('path'),'/images/test.jpg'); assert.equal(options.body.get('file').name,'test.jpg');return new Response('OK');}
    if(url.includes('/edit?download='))return new Response(corrupt?Uint8Array.of(4):content);
    throw Error('Unexpected request');
  };
  try {
    await AP.putFile('http://ap','/images/test.jpg',new Blob([content]));assert.equal(posted,1);
    exists=true;await assert.rejects(AP.putFile('http://ap','/images/test.jpg',new Blob([content])),/existiert/);assert.equal(posted,1);
    corrupt=true;await assert.rejects(AP.putFile('http://ap','/images/test.jpg',new Blob([content]),true),/stimmt nicht/);assert.equal(posted,2);
    await assert.rejects(AP.putFile('http://ap','/www/main.js',new Blob([content])),/Ablage/);assert.equal(posted,2);
  } finally {global.fetch=original;}
});
test('JSON template upload uses OEPL form contract and validates destination', async () => {
  const old=global.fetch;
  global.fetch=async(url,options)=>{assert.equal(url,'http://ap/jsonupload');assert.equal(options.method,'POST');assert.equal(options.body.get('mac'),'0011223344556677');assert.deepEqual(JSON.parse(options.body.get('json')),[{text:[1,2,'0','/fonts/test.vlw','#000000',0,0]}]);return new Response('Ok, saved');};
  try { await AP.sendTemplate('http://ap','0011223344556677',[{text:[1,2,'0','/fonts/test.vlw','#000000',0,0]}]); await assert.rejects(AP.sendTemplate('http://ap','broken',[]),/Leeres/); }
  finally {global.fetch=old;}
});

test('413 fallback preserves JPEG bytes and verifies the file before scheduling a static image', async () => {
  const original=global.fetch, content=Uint8Array.of(255,216,1,2,255,217), calls=[];let path,fail=null;
  global.fetch=async(url,options)=>{
    calls.push(new URL(url).pathname);
    if(url.endsWith('/imgupload')) return new Response('Image too large',{status:fail==='server'?500:413});
    if(url.includes('/edit?list=')) return new Response('[]');
    if(url.endsWith('/littlefs_put')) {path=options.body.get('path');assert.match(path,/^\/images\/i2v-[a-z0-9]+\.jpg$/);assert.ok(path.split('/').at(-1).length<=31);assert.deepEqual(new Uint8Array(await options.body.get('file').arrayBuffer()),content);return new Response('OK');}
    if(url.includes('/edit?download='))return new Response(fail==='verify'?Uint8Array.of(0):content);
    if(url.endsWith('/save_cfg')) {assert.equal(options.body.get('mac'),'0011223344556677');assert.equal(options.body.get('contentmode'),'22');assert.deepEqual(JSON.parse(options.body.get('modecfgjson')),{filename:path,timetolive:'0',dither:'0',delete:'1',preload:'0',preload_lut:'0',preload_type:'0'});return new Response(fail==='config'?'Error while saving: mac not found':'Ok, saved');}
    throw Error('Unexpected request');
  };
  try {
    const notes=[],result=await AP.upload('http://ap','0011223344556677',new Blob([content]),s=>notes.push(s));assert.equal(result.via,'filesystem');assert.equal(notes.length,2);assert.deepEqual(calls,['/imgupload','/edit','/littlefs_put','/edit','/save_cfg']);
    calls.length=0;fail='server';await assert.rejects(AP.upload('http://ap','0011223344556677',new Blob([content])),/HTTP 500/);assert.deepEqual(calls,['/imgupload']);
    calls.length=0;fail='verify';await assert.rejects(AP.upload('http://ap','0011223344556677',new Blob([content])),/stimmt nicht/);assert.ok(!calls.includes('/save_cfg'));
    fail='config';await assert.rejects(AP.upload('http://ap','0011223344556677',new Blob([content])),/nicht bestätigt/);
  } finally {global.fetch=original;}
});

function flatColor(color, width=64, height=64) {
  const data=new Uint8ClampedArray(width*height*4);for(let p=0;p<data.length;p+=4)data.set([...color,255],p);return data;
}
function averageColor(image) {
  const sum=[0,0,0];for(let p=0;p<image.indices.length;p++)for(let k=0;k<3;k++)sum[k]+=image.data[p*4+k];return sum.map(v=>v/image.indices.length);
}
test('Bayer preserves olive, neutral and warm mixtures when orange is added to the palette',()=>{
  for(const color of [[85,95,60],[80,90,55],[96,104,76],[120,120,120],[64,80,96],[180,145,115]])for(const name of ['Spectra6','ACeP7']){
    const image=EP.quantize(flatColor(color),64,64,EP.palettes[name],{dither:'ordered'}),average=averageColor(image);
    average.forEach((v,k)=>assert.ok(Math.abs(v-color[k])<=17,`${name} ${color}: channel ${k} average ${v}`));
    if(color[1]>color[0]&&color[0]>color[2])assert.ok(average[1]>average[0]&&average[0]>average[2],'olive remains green-dominant');
  }
});
test('Bayer zero strength matches nearest-color quantization and custom palettes retain alpha',()=>{
  const colors=['#ffffff','#000000','#b43218','#236a45'],data=flatColor([85,95,60]);for(let p=0;p<data.length;p+=16)data[p+3]=128;
  const none=EP.quantize(data,64,64,colors,{dither:'none',biases:[0,0,15,0]});
  assert.deepEqual(EP.quantize(data,64,64,colors,{dither:'ordered',strength:0,biases:[0,0,15,0]}),none);
  const image=EP.quantize(data,64,64,colors,{dither:'ordered'});
  for(let p=0;p<image.indices.length;p++){assert.deepEqual(Array.from(image.data.slice(p*4,p*4+3)),EP.rgb(colors[image.indices[p]]));assert.equal(image.data[p*4+3],data[p*4+3]);}
});
test('Floyd keeps signed out-of-range error instead of collapsing cyan or magenta to white',()=>{
  for(const color of [[0,255,255],[255,0,255]]){
    const image=EP.quantize(flatColor(color),64,64,EP.palettes.ACeP7,{dither:'floyd'}),average=averageColor(image);
    assert.ok(new Set(image.indices).size>1);assert.ok(Math.hypot(...average.map((v,k)=>v-color[k]))<170);
  }
});

test('sRGB to Lab conversion matches D50 reference colors',()=>{
  const references=[[[0,0,0],[0,0,0]],[[255,255,255],[100,0,0]],[[255,0,0],[54.29,80.80,69.89]]];
  for(const [rgb,expected] of references)EP.rgbToLab(rgb).forEach((v,k)=>assert.ok(Math.abs(v-expected[k])<.02));
});
test('direct ACeP7 mapping preserves neutral grays and does not map olive to orange',()=>{
  for(let gray=0;gray<=255;gray++){
    const image=EP.quantize(new Uint8ClampedArray([gray,gray,gray,128]),1,1,EP.palettes.ACeP7);
    assert.ok([0,1].includes(image.indices[0]),`gray ${gray} became an accent color`);assert.equal(image.data[3],128);
  }
  for(const color of [[85,95,60],[110,125,80],[140,150,110]]){
    const image=EP.quantize(new Uint8ClampedArray([...color,255]),1,1,EP.palettes.ACeP7);
    assert.notEqual(image.indices[0],6,'olive is not orange');
  }
  assert.equal(EP.quantize(new Uint8ClampedArray([200,100,20,255]),1,1,EP.palettes.ACeP7).indices[0],6,'orange still maps to orange');
});
test('all zero-strength dither modes use the same perceptual mapping as none',()=>{
  const data=flatColor([120,120,120]),colors=EP.palettes.ACeP7,expected=EP.quantize(data,64,64,colors,{dither:'none'});
  for(const dither of ['floyd','ordered'])assert.deepEqual(EP.quantize(data,64,64,colors,{dither,strength:0}),expected);
});

test('dither strength fades neutral ACeP7 tones to direct mapping without accent colors at intermediate values',()=>{
  for(const dither of ['floyd','ordered'])for(const gray of [90,120,150,200]){
    const data=flatColor([gray,gray,gray]),direct=EP.quantize(data,64,64,EP.palettes.ACeP7,{dither:'none'});
    const endpoint=averageColor(direct)[0];let previousDistance=Infinity;
    for(const strength of [1,.95,.9,.85,.8,.75,.7,.65,.6,.55,.5,.45,.4,.35,.3,.25,.2,.15,.1,.05,.01,.001,0]){
      const image=EP.quantize(data,64,64,EP.palettes.ACeP7,{dither,strength});
      assert.ok(image.indices.every(index=>index<=1),`${dither} gray ${gray}, strength ${strength}: accent color`);
      const distance=Math.abs(averageColor(image)[0]-endpoint);
      assert.ok(distance<=previousDistance+1,`${dither} gray ${gray}: moved away from endpoint at ${strength}`);previousDistance=distance;
      if(strength<=.001)assert.deepEqual(image,direct,`${dither} must reach direct mapping before zero`);
    }
  }
});
test('olive patches do not turn orange as dithering is reduced and converge before zero',()=>{
  for(const dither of ['floyd','ordered'])for(const color of [[85,95,60],[140,150,110]]){
    const data=flatColor(color),direct=EP.quantize(data,64,64,EP.palettes.ACeP7,{dither:'none'});
    for(const strength of [.75,.5,.25,.1,.05,.001]){
      const image=EP.quantize(data,64,64,EP.palettes.ACeP7,{dither,strength}),average=averageColor(image);
      assert.ok(average[0]<=average[1]+8,`${dither} ${color} at ${strength} developed red cast`);
      if(strength<=.05)assert.ok(!image.indices.includes(6),'weak olive raster must not favor orange');
      if(strength===.001)assert.deepEqual(image,direct);
    }
  }
});
test('tiny positive strength converges with custom color preferences and preserves alpha',()=>{
  const colors=['#ffffff','#000000','#bbbbbb','#dddddd'],data=flatColor([245,245,245]);
  for(let p=0;p<data.length;p+=4)data[p+3]=128;
  const options={biases:[-100,0,10,0]},direct=EP.quantize(data,64,64,colors,options);
  for(const dither of ['floyd','ordered'])assert.deepEqual(EP.quantize(data,64,64,colors,{...options,dither,strength:.000001}),direct);
});

test('cropping converted pixels preserves palette indices, white pixels and partial alpha',()=>{
 const palette=EP.palettes.BWR,source=EP.quantize(pixels(['#000000','#ffffff','#ff0000','#ffffff','#000000','#ff0000'],128),3,2,palette);
 const cropped=EP.cropImage(source,{x:1,y:0,w:2,h:2});assert.equal(cropped.width,2);assert.equal(cropped.height,2);assert.deepEqual(Array.from(cropped.indices),[0,2,1,2]);assert.deepEqual(Array.from(cropped.data),[...source.data.slice(4,12),...source.data.slice(16,24)]);
 for(const angle of [0,90,180,270])assert.deepEqual(EP.rotate(EP.rotate(cropped,angle),-angle),cropped);
 assert.throws(()=>EP.cropImage(source,{x:2,y:0,w:2,h:1}),/Bildausschnitt/);
});

const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../js/colorimetry'),P=require('../js/color-profiles'),api=require('../js/image-api'),{bundle}=require('../build-image-converter.cjs');
const fixtures=require('./legacy-profile-fixtures.cjs');
const close=(a,b,tolerance=1e-3)=>assert.ok(Math.abs(a-b)<tolerance,`${a} versus ${b}`);

test('Lab conversion reproduces known sRGB reference points and Bradford reference whites',()=>{
 assert.equal(C.labHex([100,0,0]),'#ffffff');assert.equal(C.labHex([0,0,0]),'#000000');
 assert.equal(C.labHex([50,0,0]),'#777777');assert.equal(C.labHex([60.3,12.4,68.5]),'#c08700');
 assert.equal(C.labHex([60.3,12.4,68.5],'D50'),'#ba8800');
 close(C.adapt([0,1,0],C.whites.D50)[2],-.0205,1e-4);
 const adapted=C.adapt(C.whites.D50,C.whites.D50);adapted.forEach((v,i)=>close(v,C.whites.D65[i],1e-6));
 for(const color of ['#ffffff','#000000','#ff0000','#219ac7']){const xyz=C.rgbToXYZ(color),lab=C.xyzToLab(xyz),roundtrip=C.labToXYZ(lab);roundtrip.forEach((v,i)=>close(v,xyz[i],1e-8));}
});
test('manufacturer normalization maps endpoints exactly, preserves relative lightness and adapted hue',()=>{
 for(const profile of fixtures.slice(1).filter(p=>!p.mixing)){
  const report=P.normalization(profile);assert.equal(report.available,true);assert.equal(report.colors[0],'#ffffff');assert.equal(report.colors[1],'#000000');
  const lo=report.adaptedLabs[1][0],hi=report.adaptedLabs[0][0];
  for(let i=2;i<report.labs.length;i++){
   const before=report.adaptedLabs[i],after=report.labs[i];close(after[0],Math.max(0,Math.min(100,(before[0]-lo)*100/(hi-lo))));
   close(Math.atan2(after[2],after[1]),Math.atan2(before[2],before[1]),1e-7);
   assert.ok(Math.hypot(after[1],after[2])<=Math.hypot(before[1],before[2])+1e-6);
   const encoded=C.xyzToLab(C.rgbToXYZ(report.colors[i]));close(encoded[0],after[0],.35);
  }
  assert.equal(report.gamutReduced,true);
 }
});
test('normalization never overwrites RGB or Lab source references and follows reordered palettes',()=>{
 const profile=P.validate(fixtures[1]),before=JSON.stringify(profile),reversed=profile.nominal.slice().reverse();
 assert.deepEqual(P.effective(profile,reversed),P.normalization(profile).colors.slice().reverse());
 assert.deepEqual(P.effective(profile,reversed,'raw'),profile.renderColors.slice().reverse());
 assert.equal(JSON.stringify(profile),before);assert.equal(profile.sourceLab.assumedWhitePoint,true);
 assert.deepEqual(P.validate(JSON.parse(before)),profile);
 assert.notEqual(P.effective(profile,profile.nominal)[3],'#ffff00');
});
test('existing ideal endpoints and OEPL references remain unchanged under relative normalization',()=>{
 const profile=fixtures[0];assert.deepEqual(P.effective(profile,profile.nominal),profile.renderColors);
 for(const color of ['#ff0000','#123abc','#c8c800']){
  const p=P.validate({name:'Reference',nominal:['#ffffff','#000000',color],renderColors:['#ffffff','#000000',color]});assert.deepEqual(P.effective(p,p.nominal),p.renderColors);
 }
});
test('missing or reversed black-white endpoints safely retain unnormalized values',()=>{
 for(const p of [P.validate({name:'No white',nominal:['#ff0000','#0000ff'],renderColors:['#802020','#203080']}),P.validate({name:'No range',nominal:['#ffffff','#000000'],renderColors:['#808080','#808080']}),P.validate({name:'Reversed',nominal:['#ffffff','#000000'],renderColors:['#000000','#ffffff']})]){
  assert.equal(P.normalization(p).available,false);assert.deepEqual(P.effective(p,p.nominal),p.renderColors);
 }
});
test('normalization cache accounts for changed source values',()=>{
 const p=P.validate({name:'Mutable reference',nominal:['#ffffff','#000000','#ffff00'],renderColors:['#a0a0a0','#202020','#908020']}),first=P.effective(p,p.nominal);p.renderColors[2]='#a07010';assert.notDeepEqual(P.effective(p,p.nominal),first);
});
test('invalid Lab metadata, mismatched provenance values and normalization modes are rejected',()=>{
 const p=fixtures[1];
 for(const sourceLab of [{...p.sourceLab,whitePoint:'unknown'},{...p.sourceLab,assumedWhitePoint:'yes'},{...p.sourceLab,values:[[200,0,0]]},{...p.sourceLab,values:p.sourceLab.values.map(()=>[50,0,0])}])assert.throws(()=>P.validate({...p,sourceLab}));
 assert.throws(()=>P.validate({...p,normalization:'other'}));assert.throws(()=>P.effective(p,p.nominal,'other'));
});
test('public API and standalone factory can resolve normalized and raw profiles without external dependencies',()=>{
 const module={exports:{}};new Function('module',bundle())(module);
 const data=Uint8Array.from({length:16*16*4},(_,i)=>i%4===3?255:(i*23)%256);
 for(const lib of [api,module.exports])for(const mode of ['relative','raw'])for(const dither of ['none','floyd','ordered','fixed','rgb','gamut']){
  const profile={...fixtures[1],normalization:mode},options={data,width:16,height:16,palette:'BWRY',dither};
  assert.deepEqual(lib.convert({...options,colorProfile:profile}),api.convert({...options,renderColors:P.effective(profile,profile.nominal,mode)}));
 }
 assert.throws(()=>api.settings({palette:'BW',colorProfile:fixtures[1]}));
 assert.throws(()=>api.settings({colorProfile:fixtures[1],renderColors:fixtures[1].renderColors}));
 assert.equal(module.exports.colorProfiles.builtins.length,1);
});

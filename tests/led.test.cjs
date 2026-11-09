const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../js/led-core.js');
const AP=require('../js/ap.js');
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
test('wire packet is exactly twelve bytes with counts, pauses and total repeats encoded',()=>{
  const c=L.defaults();assert.equal(L.pattern(c),'21E0530A1C530A03530A0100');
  assert.deepEqual(L.fromPattern(L.pattern(c)),c);
});
test('all six channel orders round-trip every supported physical channel level',()=>{
  for(const profile of Object.keys(L.profiles))for(const order of L.orders)for(let i=0;i<3;i++)for(const value of L.levels(profile,order,L.channels[i])){
    const c=L.defaults(profile);c.order=order;c.groups[0].color=[0,0,0];c.groups[0].color[i]=value;
    assert.deepEqual(L.fromPattern(L.pattern(c),profile,order),c);
  }
});
test('mapping compensates swapped physical channels and relocates the two-bit quantization',()=>{
  assert.equal(L.packedColor([255,0,0],'nrf','GRB').byte,0x1c);
  assert.equal(L.packedColor([0,255,0],'nrf','GBR').byte,0xe0);
  assert.deepEqual(L.levels('nrf','GBR','R'),[0,109,182,255]);
  assert.deepEqual(L.levels('nrf','GBR','B'),[0,36,73,109,146,182,219,255]);
});
test('nRF blue PWM uses 3/7 and 5/7 duty; combined channels count union without double counting',()=>{
  const c=L.defaults();c.pulseCode=0;c.repeats=1;c.groups=[{color:[36,0,109],flashes:1,gapMs:100,afterMs:0},{color:[0,0,0],flashes:0,gapMs:0,afterMs:0},{color:[0,0,0],flashes:0,gapMs:0,afterMs:0}];
  const a=L.analyze(c,{currents:[2,3,4],voltage:3});near(a.pulseMs,.7);near(a.channelOnMs[0],.1);near(a.channelOnMs[2],.3);near(a.anyOnMs,.4);near(a.ledMah,(.1*2+.3*4)/3600000);near(a.durationMs,100.7);
  c.groups[0].color=[255,255,255];near(L.analyze(c).anyOnMs,.7);
});
test('default complete timing includes off delay after each flash and each group',()=>{
  const a=L.analyze(L.defaults());near(a.cycleMs,7518.9);near(a.durationMs,15037.8);a.channelOnMs.forEach(v=>near(v,12.6));near(a.totalMah,.000021);
});
test('ESP32 inserts one ms when an inner delay is zero, and after a zero-delay final group',()=>{
  const c=L.defaults('esp32');c.repeats=1;c.pulseCode=0;c.groups.forEach((g,i)=>{g.flashes=i===0?1:0;g.gapMs=0;g.afterMs=0;});
  near(L.analyze(c).durationMs,2.7);c.profile='nrf';near(L.analyze(c).durationMs,.7);
});
test('EFR32 binary colors, count-minus-one and omitted terminal delay differ from PWM profiles',()=>{
  const c=L.defaults('efr32');c.pulseCode=2;c.repeats=2;c.groups.forEach(g=>{g.flashes=1;g.gapMs=100;g.afterMs=100;});
  const a=L.analyze(c);assert.equal(parseInt(L.pattern(c).slice(4,6),16)&15,0);near(a.pulseMs,2);near(a.cycleMs,606);near(a.durationMs,1112);near(a.anyOnMs,12);
  c.groups[0].color=[36,0,0];assert.throws(()=>L.analyze(c),/Stufen/);
  c.groups[0].color=[255,0,0];c.groups[0].gapMs=0;assert.throws(()=>L.analyze(c),/100/);
});
test('finite maxima, endless sentinel and overflow values are distinct',()=>{
  const c=L.defaults();c.repeats=254;assert.equal(L.pattern(c).slice(20,22),'FD');c.forever=true;assert.equal(L.pattern(c).slice(20,22),'FE');assert.equal(L.analyze(c).forever,true);assert.equal(L.fromPattern(L.pattern(c)).forever,true);
  assert.throws(()=>L.fromPattern(L.pattern(c).slice(0,20)+'FF00'),/sicherer/);
  c.profile='efr32';assert.throws(()=>L.validate(c),/Endlos/);c.forever=false;c.repeats=256;assert.equal(L.pattern(c).slice(20,22),'FF');assert.equal(L.fromPattern(L.pattern(c),'efr32').repeats,256);
});
test('invalid raw bounds and unsupported modes never silently wrap into another command',()=>{
  const cases=[c=>c.pulseCode=16,c=>c.groups[0].flashes=16,c=>c.groups[0].gapMs=1600,c=>c.groups[0].gapMs=150,c=>c.groups[0].afterMs=25600,c=>c.repeats=0,c=>c.order='RRB',c=>c.groups.push(c.groups[0]),c=>c.groups[0].color[0]=250];
  for(const mutate of cases){const c=L.defaults();mutate(c);assert.throws(()=>L.pattern(c));}
  assert.throws(()=>L.fromPattern('000000000000000000000000'),/Modus/);assert.throws(()=>L.fromPattern('abc'),/24/);
});
test('maximal sequence stays compact and analysis uses exact total counts',()=>{
  const c=L.defaults();c.pulseCode=15;c.repeats=254;c.groups.forEach(g=>{g.flashes=15;g.gapMs=1500;g.afterMs=25500;});
  const a=L.analyze(c);assert.ok(a.segments.length<=93);assert.equal(a.colors.reduce((n,c)=>n+c.flashes,0),11430);assert.ok(a.durationMs>36000000);
});
test('simulation uses exact boundaries, actual PWM slots and the newest visible flash',()=>{
  const c=L.defaults();c.pulseCode=0;c.repeats=1;c.groups=[{color:[255,0,0],flashes:1,gapMs:0,afterMs:10*100},{color:[0,255,0],flashes:1,gapMs:100,afterMs:0},{color:[0,0,0],flashes:0,gapMs:0,afterMs:0}];
  let a=L.analyze(c);assert.deepEqual(L.stateAt(a,0),[255,0,0]);assert.deepEqual(L.stateAt(a,.7),[0,0,0]);assert.deepEqual(L.stateAt(a,a.durationMs),[0,0,0]);
  c.groups[0].afterMs=0;a=L.analyze(c);assert.deepEqual(L.stateAt(a,.8,{holdMs:60}),[0,255,0]);
  c.groups[0].color=[36,0,0];a=L.analyze(c);assert.deepEqual(L.stateAt(a,.05,{pwm:true}),[0,0,0]);assert.deepEqual(L.stateAt(a,.15,{pwm:true}),[255,0,0]);
});
test('energy calibration separates LED duty, controller pulse current and voltage',()=>{
  const c=L.defaults();const a=L.analyze(c,{currents:[1,2,3],voltage:4,extraMa:10});near(a.ledMah,12.6*6/3600000);near(a.controllerMah,a.activeMs*10/3600000);near(a.energyMwh,a.totalMah*4);
  assert.throws(()=>L.analyze(c,{voltage:0}),/Kalibrierung/);assert.throws(()=>L.analyze(c,{currents:[-1,0,0]}),/Kalibrierung/);
});
test('LED AP transport validates destination and payload; stopping has no image upload',async()=>{
  const old=global.fetch;const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return new Response('ok, request transmitted');};
  try{await AP.sendLED('http://ap','0011223344556677',L.pattern(L.defaults()));await AP.sendLED('http://ap','0011223344556677','000000000000000000000000');assert.equal(calls.length,2);assert.ok(calls.every(c=>c.url.includes('/led_flash?mac=0011223344556677&pattern=')));assert.ok(calls[1].url.endsWith('pattern=000000000000000000000000'));await assert.rejects(AP.sendLED('http://ap','bad','xx'));assert.equal(calls.length,2);}finally{global.fetch=old;}
});

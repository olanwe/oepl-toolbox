/* OEPL mode-1 LED model. Wire layout and firmware sources are documented in LED-DESIGNER.md.
 * Timing is nominal: radio latency, scheduler jitter and GPIO overhead are not measured. */
(function(root) {
  'use strict';
  const t = (key, values) => root.I18N ? root.I18N.t(key, values) : key;
  const profiles = {
    nrf: {name:'nRF52811 · OEPL Newton M3', pwm:true, minGap:0, maxFlashes:15, maxRepeats:254, minPulse:0, endless:true, terminalDelay:true,
      note:'7 PWM-Zeitschlitze à 100 µs pro Stufe. Beginn/Unterbrechung hängt vom Schlaf- und Funkzyklus ab. Code 0 bedeutet hier 0,7 ms; Code 15 bedeutet 11,2 ms.'},
    esp32: {name:'ESP32 · OpenDisplay Firmware', pwm:true, minGap:0, maxFlashes:15, maxRepeats:254, minPulse:0, endless:true, terminalDelay:true,
      note:'OpenDisplay-Firmware mit OEPL-LED-Payload: gleiche 7-Slot-PWM, bei Pause 0 mindestens 1 ms Schedulerpause. Kein allgemeines Profil für jeden ESP32 oder die AP-Status-LED.'},
    efr32: {name:'EFR32xG22 · OEPL RGB', pwm:false, minGap:100, maxFlashes:16, maxRepeats:256, minPulse:1, endless:false, terminalDelay:false,
      note:'Geprüfter OEPL-Quellstand: nur Ein/Aus pro Kanal; Zähler im Paket sind Anzahl minus eins. Puls 1–15 ms. Null-Timer werden vermieden. Keine endlose Wiederholung. RGB-LED vorausgesetzt.'}
  };
  const orders=['RGB','RBG','GRB','GBR','BRG','BGR'], channels=['R','G','B'];
  const thresholds=[[7,1,6,2,5,3,4],[7,1,6,2,5,3,4],[3,3,1,1,1,2,2]];
  function integer(value,min,max,label) {if(!Number.isInteger(value)||value<min||value>max)throw Error(label+': '+min+'–'+max+t(' als ganze Zahl.'));return value;}
  function levels(profile,order,channel) {
    const p=profiles[profile];if(!p||!orders.includes(order))throw Error(t('Unbekanntes LED-Profil oder Kanalfolge.'));
    if(!p.pwm)return [0,255];
    return order.indexOf(channel)===2?[0,109,182,255]:[0,36,73,109,146,182,219,255];
  }
  function snap(rgb,profile,order) {return rgb.map((v,i)=>levels(profile,order,channels[i]).reduce((a,b)=>Math.abs(v-a)<=Math.abs(v-b)?a:b));}
  function defaults(profile='nrf') {
    const p=profiles[profile];if(!p)throw Error(t('Unbekanntes LED-Profil.'));
    return {format:'img2vlw-led-v1',profile,order:'RGB',pulseCode:2,repeats:2,forever:false,groups:[
      {color:[255,0,0],flashes:3,gapMs:500,afterMs:1000},
      {color:[0,255,0],flashes:3,gapMs:500,afterMs:1000},
      {color:[0,0,255],flashes:3,gapMs:500,afterMs:1000}]};
  }
  function validate(input) {
    if(!input||input.format!=='img2vlw-led-v1'||!profiles[input.profile])throw Error(t('Kein unterstütztes LED-Design.'));
    const p=profiles[input.profile];if(!orders.includes(input.order))throw Error(t('Kanalfolge muss eine der sechs RGB-Permutationen sein.'));
    integer(input.pulseCode,p.minPulse,15,t('Pulsstufe'));integer(input.repeats,1,p.maxRepeats,t('Gesamtdurchläufe'));
    if(typeof input.forever!=='boolean'||(input.forever&&!p.endless))throw Error(t('Endlos ist in diesem Profil nicht verfügbar.'));
    if(!Array.isArray(input.groups)||input.groups.length!==3)throw Error(t('Das OEPL-Paket bietet genau drei Gruppen.'));
    const groups=input.groups.map((g,i)=>{
      if(!g||!Array.isArray(g.color)||g.color.length!==3)throw Error(t('Gruppe ')+(i+1)+t(': RGB-Farbe fehlt.'));
      g.color.forEach((v,k)=>{integer(v,0,255,t('Farbwert'));if(!levels(input.profile,input.order,channels[k]).includes(v))throw Error(t('Gruppe ')+(i+1)+t(': Farbe passt nicht zu den verfügbaren Stufen.'));});
      integer(g.flashes,p.pwm?0:1,p.maxFlashes,t('Blinkanzahl'));integer(g.gapMs,p.minGap,1500,t('Pause zwischen Impulsen (ms)'));integer(g.afterMs,p.minGap,25500,t('Pause nach Gruppe (ms)'));
      if(g.gapMs%100||g.afterMs%100)throw Error(t('Pausen müssen Vielfache von 100 ms sein.'));
      return {color:g.color.slice(),flashes:g.flashes,gapMs:g.gapMs,afterMs:g.afterMs};
    });
    return {format:'img2vlw-led-v1',profile:input.profile,order:input.order,pulseCode:input.pulseCode,repeats:input.repeats,forever:input.forever,groups};
  }
  function packedColor(color,profile,order) {
    const physical=Object.fromEntries(channels.map((c,i)=>[c,color[i]]));
    const raw=order.split('').map((c,slot)=>{
      if(!profiles[profile].pwm)return physical[c]?(slot===2?3:7):0;
      return levels(profile,order,c).indexOf(physical[c]);
    });
    return {raw,byte:(raw[0]<<5)|(raw[1]<<2)|raw[2]};
  }
  function pattern(input) {
    const c=validate(input),p=profiles[c.profile],bytes=new Uint8Array(12);
    bytes[0]=(c.pulseCode<<4)|1;
    c.groups.forEach((g,i)=>{const at=1+i*3;bytes[at]=packedColor(g.color,c.profile,c.order).byte;bytes[at+1]=((g.gapMs/100)<<4)|(p.pwm?g.flashes:g.flashes-1);bytes[at+2]=g.afterMs/100;});
    bytes[10]=c.forever?254:c.repeats-1;
    return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function fromPattern(hex,profile='nrf',order='RGB') {
    if(!/^[0-9a-f]{24}$/i.test(hex))throw Error(t('LED-Muster benötigt genau 24 Hex-Zeichen.'));
    const b=hex.match(/../g).map(v=>parseInt(v,16)),p=profiles[profile];
    if(!p||!orders.includes(order))throw Error(t('Unbekanntes Profil oder Kanalfolge.'));
    if((b[0]&15)!==1||b[11]!==0)throw Error(t('Unterstützt wird LED-Modus 1 mit Reservebyte 00.'));
    if(p.pwm&&b[10]===255)throw Error(t('Wiederholwert FF ist bei diesem Quellstand kein sicherer Endloswert; FE verwenden.'));
    const result=defaults(profile);result.order=order;result.pulseCode=b[0]>>4;result.forever=p.endless&&b[10]===254;result.repeats=result.forever?1:b[10]+1;
    result.groups=[0,1,2].map(i=>{const at=1+i*3,raw=[b[at]>>5,(b[at]>>2)&7,b[at]&3],color=[0,0,0];
      order.split('').forEach((channel,slot)=>{color[channels.indexOf(channel)]=p.pwm?levels(profile,order,channel)[raw[slot]]:(raw[slot]?255:0);});
      return {color,flashes:(b[at+1]&15)+(p.pwm?0:1),gapMs:(b[at+1]>>4)*100,afterMs:b[at+2]*100};});
    return validate(result);
  }
  function analyze(input,calibration={}) {
    const config=validate(input),p=profiles[config.profile],pulseMs=p.pwm?(config.pulseCode+1)*.7:config.pulseCode;
    const currents=calibration.currents||[2,2,2],voltage=calibration.voltage??3,extraMa=calibration.extraMa??0;
    if(!Array.isArray(currents)||currents.length!==3||currents.some(v=>!Number.isFinite(v)||v<0||v>100)||!Number.isFinite(voltage)||voltage<=0||voltage>60||!Number.isFinite(extraMa)||extraMa<0||extraMa>500)throw Error(t('Kalibrierung: Kanalströme 0–100 mA, Zusatzstrom 0–500 mA, Spannung größer 0 bis 60 V.'));
    const segments=[],channelOnMs=[0,0,0],colorTotals=new Map();let time=0,anyOnMs=0,activeMs=0;
    const add=(duration,group,on,color,raw)=>{if(duration>0){segments.push({start:time,end:time+duration,group,on,color,raw});time+=duration;}};
    config.groups.forEach((g,group)=>{
      const {raw}=packedColor(g.color,config.profile,config.order),duty=[0,0,0];let union=0;
      if(p.pwm){for(let slot=0;slot<7;slot++) {let any=false;config.order.split('').forEach((ch,wire)=>{if(raw[wire]>=thresholds[wire][slot]){duty[channels.indexOf(ch)]+=1/7;any=true;}});if(any)union+=1/7;}}
      else {g.color.forEach((v,i)=>duty[i]=v?1:0);union=g.color.some(v=>v)?1:0;}
      const key=g.color.join(','),total=colorTotals.get(key)||{color:g.color.slice(),flashes:0,windowMs:0,onMs:0,channelMs:[0,0,0]};
      for(let flash=0;flash<g.flashes;flash++){
        add(pulseMs,group,true,g.color,raw);activeMs+=pulseMs;anyOnMs+=pulseMs*union;
        duty.forEach((d,i)=>{channelOnMs[i]+=pulseMs*d;total.channelMs[i]+=pulseMs*d;});total.flashes++;total.windowMs+=pulseMs;total.onMs+=pulseMs*union;
        add(config.profile==='esp32'?Math.max(1,g.gapMs):g.gapMs,group,false,[0,0,0],null);
      }
      colorTotals.set(key,total);add(g.afterMs,group,false,[0,0,0],null);
    });
    if(config.profile==='esp32'&&config.groups[2].afterMs===0)add(1,2,false,[0,0,0],null);
    if(time<=0)throw Error(t('Die Sequenz benötigt mindestens eine Pause oder einen Impuls.'));
    const count=config.forever?1:config.repeats,terminal=p.terminalDelay?0:config.groups[2].afterMs;
    const durationMs=config.forever?time:time*count-terminal;
    const channelTotals=channelOnMs.map(v=>v*count),ledMah=channelTotals.reduce((n,ms,i)=>n+ms*currents[i]/3600000,0),controllerMah=activeMs*count*extraMa/3600000;
    const colors=Array.from(colorTotals.values(),t=>({...t,flashes:t.flashes*count,windowMs:t.windowMs*count,onMs:t.onMs*count,channelMs:t.channelMs.map(v=>v*count),mah:t.channelMs.reduce((n,ms,i)=>n+ms*count*currents[i]/3600000,0)}));
    return {config,pulseMs,cycleMs:time,durationMs,forever:config.forever,segments,channelOnMs:channelTotals,anyOnMs:anyOnMs*count,activeMs:activeMs*count,colors,ledMah,controllerMah,totalMah:ledMah+controllerMah,energyMwh:(ledMah+controllerMah)*voltage,averageMa:(ledMah+controllerMah)*3600000/durationMs,voltage,currents,extraMa,terminalMs:terminal};
  }
  function stateAt(analysis,milliseconds,{pwm=false,holdMs=0}={}) {
    if(!Number.isFinite(milliseconds)||milliseconds<0||(!analysis.forever&&milliseconds>=analysis.durationMs))return [0,0,0];
    const t=milliseconds%analysis.cycleMs;
    const segment=analysis.segments.find(s=>s.on&&t>=s.start&&t<s.end)||analysis.segments.findLast(s=>s.on&&t>=s.start&&t<Math.min(analysis.cycleMs,s.end+holdMs));
    if(!segment)return [0,0,0];
    if(!pwm||!profiles[analysis.config.profile].pwm)return segment.color.slice();
    if(t>=segment.end)return [0,0,0];
    const slot=Math.min(6,Math.floor(((t-segment.start)%.7)/.1)),result=[0,0,0];
    analysis.config.order.split('').forEach((ch,wire)=>{if(segment.raw[wire]>=thresholds[wire][slot])result[channels.indexOf(ch)]=255;});
    return result;
  }
  root.EPLED={profiles,orders,channels,levels,snap,defaults,validate,packedColor,pattern,fromPattern,analyze,stateAt};
  if(typeof module!=='undefined')module.exports=root.EPLED;
})(globalThis);

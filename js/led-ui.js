(function() {
  'use strict';
  const t = (key, values) => I18N.t(key, values);
  const $=id=>document.getElementById(id),number=id=>$(id).value.trim()===''?NaN:Number($(id).value),fmt=(v,d=2)=>new Intl.NumberFormat(I18N.locale,{maximumFractionDigits:d}).format(v);
  const ms=value=>value<1000?fmt(value,3)+' ms':value<60000?fmt(value/1000,3)+' s':fmt(value/60000,2)+' min';
  const hex=color=>'#'+color.map(v=>v.toString(16).padStart(2,'0')).join('');
  let design=EPLED.defaults(),analysis=null,playing=false,simulationTime=0,lastFrame=0,animation=0,timelineMs=1,targets=[],targetBase='',job=false;
  let saved=Object.create(null);
  try {const data=JSON.parse(localStorage.getItem('ep-led-presets-v1')||'{}');for(const [name,value]of Object.entries(data))try{if(name.length<=60){const c=EPLED.validate(value);if(value.calibration){EPLED.analyze(c,value.calibration);c.calibration=value.calibration;}saved[name]=c;}}catch{}}catch{}
  function status(text,error=false){$('ledStatus').textContent=text;$('ledStatus').classList.toggle('error',error);Activity.update('led',text,error);}
  function element(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  function option(select,value,text){select.append(new Option(text,value));}
  function setTool(led){pause();$('ledDesigner').hidden=!led;document.querySelector('main > .intro').hidden=led;document.querySelector('.workspace').hidden=led;document.querySelector('.delivery').hidden=led;$('notice').hidden=led;for(const [id,active]of[['imageTool',!led],['ledTool',led]]){$(id).classList.toggle('active',active);$(id).setAttribute('aria-pressed',String(active));}}
  $('ledTool').onclick=()=>setTool(true);$('imageTool').onclick=()=>setTool(false);
  for(const [key,p]of Object.entries(EPLED.profiles))option($('ledProfile'),key,p.name);
  EPLED.orders.forEach(order=>option($('ledOrder'),order,order));
  function controls(){
    const p=EPLED.profiles[design.profile];$('ledProfile').value=design.profile;$('ledOrder').value=design.order;
    $('ledPulse').replaceChildren();for(let code=p.minPulse;code<=15;code++)option($('ledPulse'),String(code),t('Stufe ')+(code+1)+' · '+ms(p.pwm?(code+1)*.7:code));
    $('ledPulse').value=design.pulseCode;$('ledRepeats').max=p.maxRepeats;$('ledRepeats').value=design.repeats;$('ledForever').disabled=!p.endless;$('ledForever').checked=design.forever;
    $('ledProfileInfo').textContent=t(p.note);
    $('ledOrderInfo').textContent=t('Protokollkanäle R/G/B treiben die physischen LED-Kanäle ')+design.order.split('').join('/')+t('. Die ausgewählten Farben werden entsprechend codiert.');
    groups();refresh();
  }
  function groups(){
    $('ledGroups').replaceChildren();
    design.groups.forEach((group,i)=>{
      const card=element('div',undefined,'ledGroup'),heading=element('div',undefined,'ledGroupHeading');heading.append(element('h3',t('Gruppe ')+(i+1)));
      for(const [direction,label]of[[-1,'↑'],[1,'↓']]){const button=element('button',label);button.type='button';button.setAttribute('aria-label',t('Gruppe ')+(i+1)+(direction<0?t(' nach oben'):t(' nach unten')));button.disabled=i+direction<0||i+direction>2;button.onclick=()=>{[design.groups[i],design.groups[i+direction]]=[design.groups[i+direction],design.groups[i]];groups();refresh();};heading.append(button);}
      card.append(heading);
      const colorRow=element('div',undefined,'ledGroupColor'),picker=document.createElement('input');picker.type='color';picker.value=hex(group.color);picker.setAttribute('aria-label',t('Farbe Gruppe ')+(i+1));picker.dataset.groupPicker=i;colorRow.append(picker);
      const selects=[];
      EPLED.channels.forEach((channel,k)=>{
        const label=element('label',channel),select=document.createElement('select');select.dataset.groupColor=i;select.dataset.channel=k;
        EPLED.levels(design.profile,design.order,channel).forEach(value=>option(select,String(value),fmt(value/255*100,0)+' %'));
        select.value=group.color[k];select.setAttribute('aria-label',[t('Rot'),t('Grün'),t('Blau')][k]+t(' Gruppe ')+(i+1));
        select.onchange=()=>{group.color[k]=Number(select.value);picker.value=hex(group.color);refresh();};selects.push(select);label.append(select);colorRow.append(label);
      });
      // A color input includes '#'; parse only the six hexadecimal digits.
      picker.oninput=()=>{group.color=EPLED.snap(picker.value.slice(1).match(/../g).map(v=>parseInt(v,16)),design.profile,design.order);selects.forEach((s,k)=>s.value=group.color[k]);refresh();};
      picker.onchange=()=>picker.value=hex(group.color);
      card.append(colorRow);
      const quick=element('div',undefined,'ledQuickColors');
      for(const [name,color]of[[t('Rot'),[255,0,0]],[t('Grün'),[0,255,0]],[t('Blau'),[0,0,255]],[t('Weiß'),[255,255,255]],[t('Aus'),[0,0,0]]]){const button=element('button',name);button.onclick=()=>{group.color=color.slice();picker.value=hex(color);selects.forEach((s,k)=>s.value=color[k]);refresh();};quick.append(button);}card.append(quick);
      const fields=element('div',undefined,'row'),p=EPLED.profiles[design.profile];
      for(const [key,label,min,max,step]of[['flashes',t('Impulse'),p.pwm?0:1,p.maxFlashes,1],['gapMs',t('Impulspause (ms)'),p.minGap,1500,100],['afterMs',t('Danach (ms)'),p.minGap,25500,100]]){
        const l=element('label',label),input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step=step;input.value=group[key];input.dataset.group=i;input.dataset.field=key;input.setAttribute('aria-label',label+t(' Gruppe ')+(i+1));
        input.oninput=()=>{group[key]=input.value.trim()===''?NaN:Number(input.value);refresh();};l.append(input);fields.append(l);
      }
      card.append(fields);$('ledGroups').append(card);
    });
  }
  function profileChanged(){
    const old=design.profile;design.profile=$('ledProfile').value;const p=EPLED.profiles[design.profile];design.pulseCode=Math.max(p.minPulse,design.pulseCode);design.repeats=Math.min(p.maxRepeats,Math.max(1,design.repeats));design.forever=design.forever&&p.endless;
    design.groups.forEach(g=>{g.flashes=Math.min(p.maxFlashes,Math.max(p.pwm?0:1,g.flashes));g.gapMs=Math.max(p.minGap,g.gapMs);g.afterMs=Math.max(p.minGap,g.afterMs);g.color=p.pwm?EPLED.snap(g.color,design.profile,design.order):g.color.map(v=>v?255:0);});
    controls();status(t('Profil gewechselt: Farben und Grenzen für ')+EPLED.profiles[design.profile].name+t(' angepasst')+(old!==design.profile?'.':t(' – identisch.')));
  }
  $('ledProfile').onchange=profileChanged;
  $('ledOrder').onchange=()=>{design.order=$('ledOrder').value;design.groups.forEach(g=>g.color=EPLED.snap(g.color,design.profile,design.order));controls();};
  for(const id of ['ledPulse','ledRepeats','ledForever','ledCurrentR','ledCurrentG','ledCurrentB','ledVoltage','ledExtraCurrent'])$(id).addEventListener('input',refresh);
  function calibration(){return {currents:[number('ledCurrentR'),number('ledCurrentG'),number('ledCurrentB')],voltage:number('ledVoltage'),extraMa:number('ledExtraCurrent')};}
  function applyCalibration(c){if(!c)return;['ledCurrentR','ledCurrentG','ledCurrentB'].forEach((id,i)=>$(id).value=c.currents?.[i]??2);$('ledVoltage').value=c.voltage??3;$('ledExtraCurrent').value=c.extraMa??0;}
  function documentJSON(){
    if(!analysis)throw Error(t('Bitte zuerst ein gültiges Design vorbereiten.'));
    let mac='DISPLAY_MAC';try{mac=EPAP.mac($('ledMAC').value.trim());}catch{}
    const tidy=v=>Math.round(v*1e12)/1e12;
    return {...analysis.config,calibration:calibration(),wire:{pattern:EPLED.pattern(analysis.config),endpoint:'/led_flash',method:'GET',parameters:{mac,pattern:EPLED.pattern(analysis.config)}},estimate:{scope:analysis.forever?'per-cycle':'complete-sequence',durationMs:tidy(analysis.durationMs),ledMah:tidy(analysis.ledMah),extraMah:tidy(analysis.controllerMah),totalMah:tidy(analysis.totalMah),energyMwh:tidy(analysis.energyMwh)}};
  }
  function disabled(){for(const id of ['ledPlay','ledDownload','ledCopy'])$(id).disabled=!analysis;for(const id of ['ledSend','ledStop'])$(id).disabled=job||!$('ledAP').value.trim()||!$('ledMAC').value.trim()||(id==='ledSend'&&!analysis);$('ledConnect').disabled=job;}
  function refresh(){
    pause();simulationTime=0;
    try{
      design.pulseCode=number('ledPulse');design.repeats=number('ledRepeats');design.forever=$('ledForever').checked;
      analysis=EPLED.analyze(design,calibration());
      $('ledRepeats').disabled=design.forever;$('ledDuration').textContent=design.forever?t('Endlos · ')+ms(analysis.cycleMs)+t(' pro Durchlauf'):ms(analysis.durationMs)+t(' insgesamt');
      $('ledSeek').max=analysis.durationMs;$('ledSeek').value=0;
      $('ledPattern').textContent=EPLED.pattern(design);$('ledJSON').value=JSON.stringify(documentJSON(),null,2);
      timeline();metrics();drawSimulation();disabled();
      if($('ledStatus').classList.contains('error'))status(t('Design aktualisiert.'));
    }catch(error){analysis=null;$('ledTimeline').replaceChildren();$('ledJSON').value='';$('ledPattern').textContent='';$('ledDuration').textContent=t('Ungültige Eingabe');$('ledMetrics').replaceChildren();$('ledColorStats').replaceChildren();$('ledChannelStats').replaceChildren();$('ledBulb').style.setProperty('--led-color','#111');$('ledColorLabel').textContent=t('Simulation nicht verfügbar');disabled();status(error.message,true);}
  }
  const ns='http://www.w3.org/2000/svg';
  function svgElement(tag,attrs,text){const el=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;return el;}
  function timeline(){
    const svg=svgElement('svg',{viewBox:'0 0 960 190',role:'img','aria-label':'LED-Zeitstrahl eines Durchlaufs',tabindex:0}),left=64,width=872,cycle=analysis.forever||analysis.config.repeats>1?analysis.cycleMs:analysis.durationMs;
    timelineMs=cycle;
    svg.append(svgElement('rect',{x:left,y:42,width,height:115,fill:'#eef1ea',rx:5}));
    let at=0;analysis.config.groups.forEach((g,i)=>{const own=analysis.segments.filter(s=>s.group===i),end=Math.min(cycle,own.length?own.at(-1).end:at),w=(end-at)/cycle*width;
      svg.append(svgElement('rect',{x:left+at/cycle*width,y:8,width:Math.max(.5,w),height:25,fill:hex(g.color),opacity:.25}));
      if(w>55)svg.append(svgElement('text',{x:left+at/cycle*width+5,y:25,fill:'#243b38','font-size':11},t('Gruppe ')+(i+1)+' · '+g.flashes+'×'));at=end;});
    ['LED',t('Rot'),t('Grün'),t('Blau')].forEach((text,i)=>svg.append(svgElement('text',{x:5,y:61+i*28,'font-size':12,fill:'#526956'},text)));
    for(const s of analysis.segments.filter(s=>s.on&&s.start<cycle))for(let row=0;row<4;row++){
      const fraction=row?s.color[row-1]/255:Math.max(...s.color)/255;if(!fraction)continue;
      const rect=svgElement('rect',{x:left+s.start/cycle*width,y:45+row*28,width:Math.max(.8,(s.end-s.start)/cycle*width),height:17,fill:row?['#df3447','#35a767','#477ee2'][row-1]:hex(s.color),opacity:row?Math.max(.2,fraction):1});
      rect.append(svgElement('title',{},t('Gruppe ')+(s.group+1)+' · '+ms(s.start)+t(' bis ')+ms(s.end)+' · '+hex(s.color)));svg.append(rect);
    }
    for(let i=0;i<=4;i++){const x=left+width*i/4;svg.append(svgElement('line',{x1:x,x2:x,y1:40,y2:159,stroke:'#9baa99','stroke-width':.5}));svg.append(svgElement('text',{x,y:180,'text-anchor':i===4?'end':'start','font-size':11,fill:'#526956'},ms(cycle*i/4)));}
    svg.append(svgElement('line',{id:'ledPlayhead',x1:left,x2:left,y1:4,y2:159,stroke:'#112f27','stroke-width':2}));
    svg.onpointerdown=event=>{pause();const r=svg.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*960;simulationTime=Math.max(0,Math.min(cycle-.0001,(x-left)/width*cycle));drawSimulation();};
    $('ledTimeline').replaceChildren(svg);
  }
  function metric(label,value){const card=element('div',undefined,'ledMetric');card.append(element('span',label),element('strong',value));return card;}
  function metrics(){
    const a=analysis;$('ledMetrics').replaceChildren(metric(a.forever?t('Durchlauf'):t('Gesamtdauer'),ms(a.durationMs)),metric(t('LED an · PWM berücksichtigt'),ms(a.anyOnMs)),metric(t('Ladung · Modell'),fmt(a.totalMah*1000,4)+' µAh'),metric(t('Energie · Modell'),fmt(a.energyMwh*1000,4)+' µWh'));
    $('ledColorStats').replaceChildren();for(const color of a.colors){const row=document.createElement('tr'),cell=document.createElement('td'),swatch=element('span',undefined,'ledColorSwatch');swatch.style.background=hex(color.color);cell.append(swatch,document.createTextNode(hex(color.color)));row.append(cell);for(const v of [String(color.flashes),ms(color.windowMs),ms(color.onMs),fmt(color.mah*1000,4)+' µAh'])row.append(element('td',v));$('ledColorStats').append(row);}
    $('ledChannelStats').replaceChildren(...EPLED.channels.map((c,i)=>metric([t('Rot'),t('Grün'),t('Blau')][i]+t(' tatsächlich an'),ms(a.channelOnMs[i]))));
    $('ledEnergyNote').textContent=(a.forever?t('Endlos: Gesamtzeit und Gesamtenergie sind unbegrenzt; alle Tabellenwerte gelten für einen Durchlauf. '):t('Werte gelten für alle ')+a.config.repeats+t(' Durchläufe. '))+ t('Mittlerer Modellstrom: ')+fmt(a.averageMa,5)+t(' mA. Hochgerechnet bei fortlaufender gleicher Sequenz: ')+fmt(a.averageMa,5)+t(' mAh pro Stunde. LED-Anteil ')+fmt(a.ledMah*1000,4)+t(' µAh, Zusatzanteil ')+fmt(a.controllerMah*1000,4)+t(' µAh. Pulsfenster enthalten interne PWM-Aus-Zeiten; „LED an“ zählt nur Zeiten, in denen mindestens ein Kanal eingeschaltet ist. Keine Batterielaufzeitprognose.');
  }
  function drawSimulation(){
    if(!analysis)return;const mode=$('ledSimulationMode').value,color=EPLED.stateAt(analysis,simulationTime,{pwm:mode==='pwm',holdMs:mode==='visible'?Math.max(0,60-analysis.pulseMs):0}),lit=color.some(v=>v);
    $('ledBulb').style.setProperty('--led-color',lit?hex(color):'#111b19');$('ledBulb').classList.toggle('lit',lit);$('ledColorLabel').textContent=lit?'LED '+hex(color):t('LED aus');
    $('ledClock').textContent=ms(simulationTime)+' / '+(analysis.forever?'∞':ms(analysis.durationMs))+t(' · Durchlauf ')+Math.min(analysis.forever?Infinity:analysis.config.repeats,Math.floor(simulationTime/analysis.cycleMs)+1);
    $('ledSeek').value=simulationTime%(analysis.forever?analysis.cycleMs:analysis.durationMs+1);
    const head=$('ledPlayhead');if(head){const phase=!analysis.forever&&simulationTime>=analysis.durationMs?analysis.cycleMs-analysis.terminalMs:simulationTime%analysis.cycleMs;const x=64+Math.min(timelineMs,phase)/timelineMs*872;head.setAttribute('x1',x);head.setAttribute('x2',x);}
  }
  function pause(){playing=false;cancelAnimationFrame(animation);$('ledPlay').textContent=t('Abspielen');}
  function tick(now){if(!playing||!analysis)return;if(lastFrame)simulationTime+=(now-lastFrame)*number('ledSpeed');lastFrame=now;if(!analysis.forever&&simulationTime>=analysis.durationMs){simulationTime=analysis.durationMs;pause();}drawSimulation();if(playing)animation=requestAnimationFrame(tick);}
  $('ledPlay').onclick=()=>{if(!analysis||playing)return;if(!analysis.forever&&simulationTime>=analysis.durationMs)simulationTime=0;playing=true;lastFrame=0;$('ledPlay').textContent=t('Läuft …');drawSimulation();animation=requestAnimationFrame(tick);};
  $('ledPause').onclick=pause;$('ledReset').onclick=()=>{pause();simulationTime=0;drawSimulation();};$('ledSeek').oninput=()=>{pause();simulationTime=number('ledSeek');drawSimulation();};
  $('ledSimulationMode').onchange=()=>{if($('ledSimulationMode').value==='pwm')$('ledSpeed').value='0.001';drawSimulation();};
  function saveFile(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $('ledDownload').onclick=()=>{try{saveFile(new Blob([JSON.stringify(documentJSON(),null,2)],{type:'application/json'}),'led-design.json');}catch(error){status(error.message,true);}};
  $('ledCopy').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(documentJSON(),null,2));status(t('LED-JSON kopiert.'));}catch{status(t('Kopieren ist in diesem Browserkontext nicht möglich. JSON herunterladen oder im Textfeld markieren.'),true);}};
  function presetOptions(){const old=$('ledPreset').value;$('ledPreset').replaceChildren();for(const[k,label]of[['signal',t('Dreifarbiges Signal')],['gentle',t('Kurzes grünes Signal')],['chase',t('Farbwechsel')]])option($('ledPreset'),k,label);for(const name of Object.keys(saved))option($('ledPreset'),'saved:'+name,name);$('ledPreset').value=old||'signal';}
  function persist(){try{localStorage.setItem('ep-led-presets-v1',JSON.stringify(saved));}catch{status(t('Browserspeicher ist gesperrt. JSON-Export bleibt verfügbar.'),true);}presetOptions();}
  $('ledLoadPreset').onclick=()=>{const key=$('ledPreset').value;if(key.startsWith('saved:')){const stored=saved[key.slice(6)];design=EPLED.validate(stored);applyCalibration(stored.calibration);}else{design=EPLED.defaults($('ledProfile').value);if(key==='gentle'){design.repeats=1;design.groups[0]={color:[0,255,0],flashes:1,gapMs:500,afterMs:500};design.groups.slice(1).forEach(g=>{g.color=[0,0,0];g.flashes=EPLED.profiles[design.profile].pwm?0:1;g.gapMs=100;g.afterMs=100;});}if(key==='chase'){design.groups.forEach(g=>{g.flashes=2;g.gapMs=100;g.afterMs=100;});design.repeats=3;}}controls();status(t('Vorlage geladen.'));};
  $('ledSavePreset').onclick=()=>{try{const name=$('ledPresetName').value.trim();if(!name)throw Error(t('Bitte einen Presetnamen angeben.'));if(!analysis)throw Error(t('Bitte erst alle Eingaben korrigieren.'));saved[name]={...EPLED.validate(design),calibration:calibration()};persist();$('ledPreset').value='saved:'+name;status(t('LED-Preset gespeichert.'));}catch(error){status(error.message,true);}};
  $('ledDeletePreset').onclick=()=>{const key=$('ledPreset').value;if(!key.startsWith('saved:'))return status(t('Bitte ein eigenes Preset auswählen.'),true);delete saved[key.slice(6)];persist();$('ledPreset').value='signal';status(t('Eigenes Preset gelöscht.'));};
  function importText(text){
    if(text.length>1000000)throw Error(t('Design-Datei ist zu groß.'));
    let next;if(/^[0-9a-f]{24}$/i.test(text.trim()))next=EPLED.fromPattern(text.trim(),$('ledProfile').value,$('ledOrder').value);else{const parsed=JSON.parse(text);next=EPLED.validate(parsed);if(parsed.calibration){EPLED.analyze(next,parsed.calibration);applyCalibration(parsed.calibration);}}
    design=next;controls();status(t('LED-Design importiert. Es wurde nichts an ein Display gesendet.'));
  }
  $('ledImport').onclick=()=>{try{importText($('ledImportText').value);}catch(error){status('Import: '+error.message,true);}};
  $('ledImportFile').onchange=async event=>{const file=event.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error(t('Design-Datei ist zu groß.'));importText(await file.text());}catch(error){status('Import: '+error.message,true);}finally{event.target.value='';}};
  let known=[];try{known=JSON.parse(localStorage.getItem('ep-aps-v2')||'[]');if(!Array.isArray(known))known=[];}catch{}
  known.filter(v=>typeof v==='string').forEach(url=>option($('ledKnownAPs'),url,url));$('ledAP').value=$('apAddress').value||'';
  $('ledUseImageAP').onclick=()=>{$('ledAP').value=$('apAddress').value;$('ledAP').dispatchEvent(new Event('input'));status(t('AP-Adresse aus dem Bildstudio übernommen.'));};
  $('ledAP').oninput=()=>{targets=[];targetBase='';$('ledTargets').replaceChildren(I18N.option('Bitte Displays laden',''));disabled();};
  $('ledMAC').oninput=()=>{disabled();if(analysis)$('ledJSON').value=JSON.stringify(documentJSON(),null,2);};
  $('ledConnect').onclick=async()=>{const activity=Activity.begin('led',t('Displays werden geladen …'));status(t('Displays werden geladen …'));job=true;disabled();try{const base=EPAP.normalize($('ledAP').value.trim()),items=await EPAP.tags(base);if(EPAP.normalize($('ledAP').value.trim())!==base)return;targets=items;targetBase=base;$('ledTargets').replaceChildren(I18N.option('Display auswählen',''));items.forEach((tag,i)=>{const supported=tag.capabilities===undefined||Boolean(Number(tag.capabilities)&1);const optionNode=new Option((tag.alias||'Display')+' · '+tag.mac+(supported?'':t(' · keine LED gemeldet')),String(i));optionNode.disabled=!supported;$('ledTargets').append(optionNode);});status(items.length+t(' Displays geladen. Nur LED-fähige oder noch nicht eindeutig erkannte Ziele sind auswählbar.'));}catch(error){status(error.message,true);}finally{job=false;disabled();Activity.end(activity);}};
  $('ledTargets').onchange=()=>{if($('ledTargets').value==='')return;const tag=targets[Number($('ledTargets').value)];$('ledMAC').value=tag.mac;$('ledTargetInfo').textContent=(tag.alias||'Display')+' · '+tag.mac+' · Hardware-ID '+tag.hwType+' · Firmware '+tag.ver+t('. Profil bitte anhand der tatsächlich installierten Firmware wählen; Kanalfolge ist eine manuelle Verdrahtungskorrektur.');disabled();if(analysis)$('ledJSON').value=JSON.stringify(documentJSON(),null,2);};
  async function send(stop){
    const activity=Activity.begin('led',t('LED-Befehl wird gesendet …'));status(t('LED-Befehl wird gesendet …'));job=true;disabled();try{const base=EPAP.normalize($('ledAP').value.trim()),mac=EPAP.mac($('ledMAC').value),tag=base===targetBase?targets.find(t=>EPAP.mac(t.mac)===mac):null;if(tag?.capabilities!==undefined&&!(Number(tag.capabilities)&1))throw Error(t('Dieses Display meldet keine LED-Unterstützung.'));if(!stop&&!analysis)throw Error(t('Bitte ein gültiges LED-Design vorbereiten.'));const pattern=stop?'000000000000000000000000':EPLED.pattern(EPLED.validate(design));await EPAP.sendLED(base,mac,pattern);status((stop?t('LED-Stopp'):t('LED-Sequenz'))+t(' vom AP angenommen für ')+mac+t('. Ausführung beim nächsten Empfang; keine optische Bestätigung.'));}catch(error){status(error.message,true);}finally{job=false;disabled();Activity.end(activity);}}
  $('ledSend').onclick=()=>send(false);$('ledStop').onclick=()=>send(true);
  document.addEventListener('languagechange', () => {
    const time = simulationTime, wasPlaying = playing;
    controls(); presetOptions(); simulationTime = time; drawSimulation();
    if (wasPlaying && analysis) $('ledPlay').click();
    if(!Activity.isActive('led'))status(t('Sprache geändert.'));
  });
  presetOptions();controls();
})();

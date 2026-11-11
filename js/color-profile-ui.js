/* Local profile management. Selecting a profile changes calculation, not export codes. */
(function(root){
 'use strict';
 class ColorProfileEditor{
  constructor({colors,readStore,saveStore,message,onChange,onPreview,download,t}){
   Object.assign(this,{colors,saveStore,message,onChange,onPreview,download,t});this.$=id=>document.getElementById(id);this.own=Object.create(null);this.ap=null;this.context=null;this.entries=new Map();
   const stored=readStore('oepl-color-profiles-v1',{});
   if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const [name,value]of Object.entries(stored).slice(0,50))try{const p=ColorProfiles.validate(value);if(name===p.name)this.own[name]=p;}catch{}
   const choices=readStore('oepl-color-profile-choices-v1',{});this.choices=Object.create(null);
   if(choices&&typeof choices==='object'&&!Array.isArray(choices))for(const [key,value]of Object.entries(choices).slice(0,100))if(key.length<=600&&typeof value==='string'&&value.length<=300)this.choices[key]=value;
   this.normalizationModes=Object.create(null);const modes=readStore('oepl-profile-normalization-v1',{});
   if(modes&&typeof modes==='object'&&!Array.isArray(modes))for(const [key,value]of Object.entries(modes).slice(0,100))if(key.length<=600&&['relative','raw'].includes(value))this.normalizationModes[key]=value;
   if(this.normalizationModes['builtin:bwry-generic']===undefined&&this.normalizationModes['builtin:3']!==undefined)this.normalizationModes['builtin:bwry-generic']=this.normalizationModes['builtin:3'];
   this.$('profilePreview').value=readStore('oepl-profile-preview-v1','profile')==='ideal'?'ideal':'profile';
   this.$('colorProfileModel').onchange=()=>{this.$('colorProfileExponent').disabled=this.$('colorProfileModel').value!=='power-xyz';};
   this.$('colorProfileExponent').ondblclick=()=>{this.$('colorProfileExponent').value='1.8';};
   this.$('colorProfile').onchange=()=>{this.remember();this.fill();onChange();};
   this.$('profilePreview').onchange=()=>{saveStore('oepl-profile-preview-v1',this.$('profilePreview').value);onPreview();};
   this.$('profileNormalization').onchange=()=>{this.normalizationModes[this.modeKey()]=this.$('profileNormalization').value;const keys=Object.keys(this.normalizationModes);if(keys.length>100)delete this.normalizationModes[keys[0]];saveStore('oepl-profile-normalization-v1',this.normalizationModes);this.updateNormalization();onChange();};
   this.$('saveColorProfile').onclick=()=>this.guard(()=>{
    const current=this.current(),renderColors=[...this.$('colorProfileRows').querySelectorAll('input[type=text]')].map(i=>i.value.toLowerCase());
    const unchanged=current&&JSON.stringify(renderColors)===JSON.stringify(ColorProfiles.ordered(current,this.colors()));
    const sourceLab=unchanged&&current.sourceLab?{...current.sourceLab,values:this.colors().map(c=>current.sourceLab.values[current.nominal.indexOf(c.toLowerCase())])}:undefined;
    const mixing=this.$('colorProfileModel').value==='power-xyz'?{model:'power-xyz',exponent:Number(this.$('colorProfileExponent').value)}:undefined;
    const profile=ColorProfiles.validate({name:this.$('colorProfileName').value,source:this.$('colorProfileSource').value,kind:this.$('colorProfileKind').value,nominal:this.colors(),renderColors,normalization:this.$('profileNormalization').value,...(sourceLab?{sourceLab}:{}),...(mixing?{mixing}:{})});
    if(!Object.hasOwn(this.own,profile.name)&&Object.keys(this.own).length>=50)throw Error('Profile limit');
    this.own[profile.name]=profile;this.save();this.populate('custom:'+profile.name);this.remember();onChange();message(t('Farbprofil gespeichert und für die Berechnung aktiviert.'));
   });
   this.$('deleteColorProfile').onclick=()=>this.guard(()=>{
    const id=this.$('colorProfile').value;if(!id.startsWith('custom:'))return;
    delete this.own[id.slice(7)];for(const key of Object.keys(this.choices))if(this.choices[key]===id)delete this.choices[key];this.save();this.populate('ideal');this.remember();onChange();message(t('Eigenes Farbprofil gelöscht.'));
   });
   this.$('exportColorProfile').onclick=()=>this.guard(()=>{
    const profile={...(this.current()||ColorProfiles.validate({name:t('Idealisiert – reine RGB-Farben'),nominal:this.colors(),renderColors:this.colors()})),normalization:this.$('profileNormalization').value};
    download(new Blob([JSON.stringify({format:'oepl-color-profile',version:1,profile},null,2)],{type:'application/json'}),'oepl-color-profile.json');
   });
   this.$('importColorProfile').onchange=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
     if(file.size>32768)throw Error('Profile file too large');
     const doc=JSON.parse(await file.text());if(doc.format!=='oepl-color-profile'||doc.version!==1)throw Error('Profile format');
     const profile=ColorProfiles.validate(doc.profile);
     // Import must not silently switch the selected display palette.
     if(!ColorProfiles.match(profile,this.colors())){message(t('Das Farbprofil passt nicht zu den gewählten Displayfarben. Bitte zuerst die passende Farbpalette wählen.'),true);return;}
     if(!Object.hasOwn(this.own,profile.name)&&Object.keys(this.own).length>=50)throw Error('Profile limit');
     this.own[profile.name]=profile;this.normalizationModes[this.context||'custom:'+profile.name]=profile.normalization;saveStore('oepl-profile-normalization-v1',this.normalizationModes);this.save();this.populate('custom:'+profile.name);this.remember();onChange();message(t('Farbprofil importiert und aktiviert.'));
    }catch{message(t('Ungültiges Farbprofil. Name, Farben, Herkunft und Dateiformat prüfen (höchstens 50 Profile, 32 KiB je Import).'),true);}
    finally{event.target.value='';}
   };
   document.addEventListener('languagechange',()=>{const selected=this.$('colorProfile').value;this.populate(selected);});
  }
  guard(fn){try{fn();}catch{this.message(this.t('Ungültiges Farbprofil. Name, Farben, Herkunft und Dateiformat prüfen (höchstens 50 Profile, 32 KiB je Import).'),true);}}
  save(){this.saveStore('oepl-color-profiles-v1',this.own);this.saveStore('oepl-color-profile-choices-v1',this.choices);}
  remember(){const key=this.context||ColorProfiles.key(this.colors());this.choices[key]=this.$('colorProfile').value;const keys=Object.keys(this.choices);if(keys.length>100)delete this.choices[keys[0]];this.saveStore('oepl-color-profile-choices-v1',this.choices);}
  current(){return this.entries.get(this.$('colorProfile').value)||null;}
  modeKey(){return this.context||this.$('colorProfile').value;}
  get calculation(){const p=this.current();return p?ColorProfiles.calculation(p,this.colors(),this.$('profileNormalization').value):{};}
  get renderColors(){return this.calculation.renderColors;}
  get previewColors(){return this.$('profilePreview').value==='profile'?this.renderColors:undefined;}
  get previewReflectance(){return this.$('profilePreview').value==='profile'?this.calculation.reflectance:undefined;}
  populate(selected){
   const select=this.$('colorProfile'),colors=this.colors();this.entries=new Map();select.replaceChildren(new Option(this.t('Idealisiert – reine RGB-Farben'),'ideal'));
   const add=(id,p)=>{if(ColorProfiles.match(p,colors)){this.entries.set(id,p);const option=new Option(this.t(p.name),id);option.title=this.t(p.name);select.append(option);}};
   // Stable identifier: removing old presets must not reinterpret builtin:0.
   ColorProfiles.builtins.forEach(p=>add('builtin:bwry-generic',p));for(const [name,p]of Object.entries(this.own))add('custom:'+name,p);if(this.ap)add('ap',this.ap);
   const choice=selected??this.choices[this.context||ColorProfiles.key(colors)]??'ideal';const resolved=choice==='builtin:3'?'builtin:bwry-generic':choice;select.value=this.entries.has(resolved)?resolved:'ideal';this.fill();
  }
  paletteChanged(){const current=this.current(),selected=this.$('colorProfile').value,key=ColorProfiles.key(this.colors());if(this.nominalKey!==key)this.context=null;this.nominalKey=key;if(this.ap&&!ColorProfiles.match(this.ap,this.colors()))this.ap=null;this.populate(current&&ColorProfiles.match(current,this.colors())?selected:undefined);}
  applyAP(meta,context){this.context=context||null;this.ap=ColorProfiles.fromAP(meta,this.colors());const previous=this.context?this.choices[this.context]:undefined;this.populate(previous??(this.ap?'ap':'ideal'));}
  clearAP(){const selected=this.$('colorProfile').value;this.context=null;this.ap=null;this.populate(selected==='ap'?'ideal':selected);}
  fill(){
   const p=this.current(),refs=p?ColorProfiles.ordered(p,this.colors()):this.colors(),$=this.$,t=this.t;
   $('profileNormalization').value=this.normalizationModes[this.modeKey()]||p?.normalization||'relative';
   const info=$('colorProfileInfo');info.replaceChildren();
   if(!p)info.textContent=t('Bisherige Berechnung mit idealen RGB-Farben.');
   else{
    info.append(t(({approximate:'Näherung',measured:'Eigene Messung',manufacturer:'Herstellerangabe'})[p.kind]));
    if(p.source){info.append(' · ');if(/^https?:\/\//i.test(p.source)){const link=document.createElement('a');link.href=p.source;link.textContent=t('Quelle');link.title=p.source;link.target='_blank';link.rel='noopener noreferrer';info.append(link);}else info.append(p.source);}
   }
   $('colorProfileName').value=p?.name||'';$('colorProfileSource').value=p?.source||'';$('colorProfileKind').value=p?.kind||'approximate';$('deleteColorProfile').disabled=!$('colorProfile').value.startsWith('custom:');
   $('colorProfileModel').value=p?.mixing?'power-xyz':'legacy';$('colorProfileExponent').value=String(p?.mixing?.exponent??1.8);$('colorProfileExponent').disabled=!p?.mixing;
   $('colorProfileRows').replaceChildren();this.colors().forEach((color,i)=>{
    const row=document.createElement('div');row.className='colorProfileRow';const label=document.createElement('label'),name=document.createElement('span'),swatch=document.createElement('input'),hex=document.createElement('input');
    name.textContent=ColorInfo.label(color);swatch.type='color';swatch.value=refs[i];swatch.setAttribute('aria-label',t('Profilfarbe für {color}',{color:ColorInfo.label(color)}));hex.type='text';hex.value=refs[i];hex.maxLength=7;hex.pattern='#[0-9a-fA-F]{6}';hex.setAttribute('aria-label',t('RGB-Wert für {color}',{color:ColorInfo.label(color)}));
    swatch.oninput=()=>{hex.value=swatch.value;hex.setCustomValidity('');};hex.oninput=()=>{const valid=/^#[0-9a-f]{6}$/i.test(hex.value);hex.setCustomValidity(valid?'':t('Bitte #RRGGBB eingeben.'));if(valid)swatch.value=hex.value;};
    label.append(name,hex);row.append(label,swatch);$('colorProfileRows').append(row);
    const effective=document.createElement('span');effective.className='profileEffectiveColor';row.append(effective);
   });
   this.showPanelReferences(p,refs);this.updateNormalization();
  }
  showPanelReferences(profile,refs){
   const container=this.$('panelReferenceComparison'),t=this.t;container.replaceChildren();container.hidden=!profile;if(!profile)return;
   const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=t('Panelfarben im Profil');table.append(caption);
   const head=document.createElement('thead'),header=document.createElement('tr');
   for(const title of ['',t('Idealisiert'),t('Panelreferenz')]){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}head.append(header);table.append(head);
   const body=document.createElement('tbody');this.colors().forEach((color,i)=>{
    const row=document.createElement('tr'),name=document.createElement('th');name.scope='row';name.textContent=ColorInfo.code(color);name.title=ColorInfo.label(color);row.append(name);
    for(const value of [color,refs[i]]){
     const cell=document.createElement('td'),swatch=document.createElement('span');swatch.className='panelReferenceSwatch';swatch.style.backgroundColor=value;swatch.textContent=value;swatch.style.color=ColorInfo.brightness(value)<.5?'#ffffff':'#000000';cell.append(swatch);row.append(cell);
    }body.append(row);
   });table.append(body);container.append(table);
   const hint=document.createElement('p');hint.className='hint';hint.textContent=t('Hinterlegte, unnormalisierte Referenzfarben. Die Bildschirmdarstellung ist eine Näherung.');container.append(hint);
  }
  updateNormalization(){
   const p=this.current(),report=p?ColorProfiles.normalization(p):null,$=this.$,t=this.t;
   $('profileNormalization').disabled=!p||!report.available;
   $('profileWhitePointHint').hidden=!p?.sourceLab?.assumedWhitePoint;
   $('normalizationInfo').textContent=!p?t('Idealisiert: keine zusätzliche Normalisierung.'):!report.available?t('Normalisierung benötigt unterschiedliche Referenzwerte für Weiß und Schwarz. Die Originalwerte bleiben aktiv.'):$('profileNormalization').value==='raw'?t('Unnormalisierte Referenzfarben für Berechnung und Profilvorschau.'):t('Panelweiß → Weiß, Panelschwarz → Schwarz; gemeinsame Helligkeitsabbildung, Farbton bezogen auf Panelweiß erhalten.')+(report.gamutReduced?' '+t('Sättigung bei Bedarf auf sRGB begrenzt.'): '');
   if(p?.mixing)$('normalizationInfo').textContent=t('Reflexionsmodell: Vollfarben und Rasterwirkung getrennt. XYZ-Rechenwerte bleiben unbeschnitten; RGB-Werte dienen nur der Vorschau.')+' '+t('Rasterexponent: {value}',{value:p.mixing.exponent});
   const colors=this.renderColors||this.colors();$('colorProfileRows').querySelectorAll('.profileEffectiveColor').forEach((node,i)=>{node.style.setProperty('--effective-color',colors[i]);node.textContent=t(p?.mixing?'Vorschau: {color}':'Wirksam: {color}',{color:colors[i]});node.title=t(p?.mixing?'Nur Bildschirmdarstellung der Rechenreferenz':'Berechnungs- und Vorschaufarbe');});
  }
  continuous(value){this.$('profileContinuousHint').hidden=!value;this.$('profilePreview').disabled=value;}
 }
 root.ColorProfileEditor=ColorProfileEditor;
})(window);

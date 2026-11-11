(function () {
  'use strict';
  const t = (key, values) => I18N.t(key, values);
  const $ = id => document.getElementById(id), val = id => Number($(id).value);
  const source = $('source'), target = $('target'), targetPreview=new PreviewFilter.NativePreview();
  let resetHint = t('Doppelklick: auf Standardwert zurücksetzen');
  document.querySelectorAll('input[type="range"]').forEach(range => { range.title = resetHint; });
  document.addEventListener('dblclick', event => {
    const range = event.target;
    if (!(range instanceof HTMLInputElement) || range.type !== 'range' || range.disabled) return;
    range.value = range.defaultValue;
    range.dispatchEvent(new Event('input', {bubbles: true}));
    range.dispatchEvent(new Event('change', {bubbles: true}));
  });
  let image = null, baseImage = null, result = null, displayResult = null, font = null, nativeFont = null, filename = 'image', frame = 0, loadVersion = 0;
  let savedResult = null, contentBounds = null, drawing = null;
  let guideVersion=0;
  let previewActivity = null, previewVersion = 0, basePreview = null, composedDrawingKey = null;
  let apFileEntries = [], listedBase = '', listedDirectory = '', currentTemplate = null;
  const busy = new Set();
  let selectedMeta = null, selectedTag = null, connectedBase = '', selectionVersion = 0;
  let allTags = [], biases = [], drag = null, forceNewCrop = false, mixPage=0, mixPaletteKey='', colorProfileEditor=null;
  const defaults = {brightness: 0, contrast: 1, saturation: 1, threshold: 128, strength: 1};
  function message(text, error = false) { $('notice').textContent = text; $('notice').classList.toggle('error', error); Activity.update('image',text,error); }
  function readStore(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
  function saveStore(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { message(t('Speichern im Browser ist gesperrt. Die aktuelle Sitzung bleibt nutzbar.'), true); } }
  const validColors = ColorInfo.valid;
  let presets = Object.assign(Object.create(null), Object.fromEntries(Object.entries(readStore('ep-presets-v2', {})).filter(([k, c]) => k.length <= 60 && validColors(c))));
  let known = readStore('ep-aps-v2', []);
  if (!Array.isArray(known)) known = [];
  known = known.filter(v => typeof v === 'string').slice(0, 30);
  function option(select, value, text) { const o = new Option(text, value); select.appendChild(o); }
  function populatePresets(chosen = 'BWR') {
    $('palette').replaceChildren();
    Object.keys(EP.palettes).forEach(k => option($('palette'), k, ({Spectra3100Plus:'BWRYO · Spectra 3100 Plus',Spectra6:'BWRYGB · Spectra 6',ACeP7:'BWRYGBO · ACeP 7'}[k]||k)));
    Object.keys(presets).forEach(k => option($('palette'), 'custom:' + k, k));
    $('palette').value = chosen; paletteChanged();
  }
  const colors = () => $('palette').value.startsWith('custom:') ? presets[$('palette').value.slice(7)] : EP.palettes[$('palette').value];
  function paletteChanged() {
    colorProfileEditor?.paletteChanged();
    populatePatternColors();drawing?.populate();
    const palette = colors(); biases = palette.map(() => 0);
    $('customColors').value = palette.join(', '); $('colors').replaceChildren(); $('biases').replaceChildren();
    palette.forEach((color, i) => {
      const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.background = color; swatch.title = ColorInfo.label(color); $('colors').append(swatch);
      const label = document.createElement('label'), range = document.createElement('input'), output = document.createElement('output');
      label.append(color, output); output.value = 0; range.type = 'range'; range.min = -100; range.max = 100; range.defaultValue = '0'; range.title = resetHint;
      range.addEventListener('input', () => { biases[i] = Number(range.value); output.value = range.value; schedule(); });
      label.append(range); $('biases').append(label);
    });
    updateColorLegend();updateMethodGuide();schedule();
  }
  function updateColorLegend(){ $('colorLegend').textContent=colors().map(ColorInfo.label).join(' · '); }
  $('palette').addEventListener('change', paletteChanged);
  $('savePreset').onclick = () => {
    const name = $('presetName').value.trim(), palette = $('customColors').value.split(',').map(c => c.trim().toLowerCase());
    if (!name || !validColors(palette)) return message(t('Preset benötigt einen Namen und 2–16 unterschiedliche #RRGGBB-Farben.'), true);
    presets[name] = palette; saveStore('ep-presets-v2', presets); populatePresets('custom:' + name); message(t('Farbpreset gespeichert: ') + name);
  };
  $('deletePreset').onclick = () => {
    if (!$('palette').value.startsWith('custom:')) return message(t('Standardpaletten bleiben erhalten. Bitte ein eigenes Preset auswählen.'), true);
    delete presets[$('palette').value.slice(7)]; saveStore('ep-presets-v2', presets); populatePresets();
  };
  function buttons() {
    $('vlwWarning').hidden = !font?.oversized;
    if(font?.oversized)$('vlw').setAttribute('aria-describedby','vlwWarning');else $('vlw').removeAttribute('aria-describedby');
    $('nativeVlwWarning').hidden = !nativeFont?.oversized;
    if(nativeFont?.oversized)$('testVLW').setAttribute('aria-describedby','nativeVlwWarning');else $('testVLW').removeAttribute('aria-describedby');
    ['png', 'jpeg'].forEach(id => $(id).disabled = !result);
    $('vlw').disabled = !font; $('manifest').disabled = !font;
    $('send').disabled = !result || !$('apAddress').value || !$('mac').value;
    $('profile').disabled = !selectedMeta;
    $('read').disabled = !selectedMeta; $('raw').disabled = !selectedTag;
    $('storeJPEG').disabled = !result || !$('apAddress').value;
    $('storeVLW').disabled = !font || !$('apAddress').value;
    $('saveTemplate').disabled = !currentTemplate;
    $('testVLW').disabled = !currentTemplate || !selectedMeta || !selectedTag || !$('mac').value;
    for (const id of busy) $(id).disabled = true;
  }
  function cropRatio() {
    const w=val('width'),h=val('height');
    return $('cropAspect').checked&&w>0&&h>0 ? (val('viewRotation')%180?h/w:w/h) : 0;
  }
  const cropBounds=()=>({w:image.width,h:image.height});
  function writeCrop(rect) {
    if(!cropRatio()) {
      rect.x=Math.max(0,Math.min(image.width-1,Math.round(rect.x)));
      rect.y=Math.max(0,Math.min(image.height-1,Math.round(rect.y)));
      rect.w=Math.max(1,Math.min(image.width-rect.x,Math.round(rect.w)));
      rect.h=Math.max(1,Math.min(image.height-rect.y,Math.round(rect.h)));
    }
    for(const [id,key]of [['cropX','x'],['cropY','y'],['cropW','w'],['cropH','h']])$(id).value=Number(rect[key].toFixed(8));
  }
  function syncCropAspect() {
    if(!image||!cropRatio())return;
    let rect;try{rect=crop();}catch{return;}
    if(Math.abs(rect.w/rect.h-cropRatio())<1e-7)return;
    try{writeCrop(CropModel.fit(rect,cropBounds(),cropRatio()));}
    catch(error){$('cropAspect').checked=false;message(error.message,true);}
  }
  const continuousOutput=()=>['rgb','gamut'].includes($('dither').value);
  function schedule() {
    const continuous=continuousOutput(),fixed=$('dither').value==='fixed';
    colorProfileEditor?.continuous(continuous);
    $('fixedMixControls').hidden=!fixed;
    $('quantizedHint').hidden=continuous||fixed;$('continuousHint').hidden=!continuous;$('apDitherChoice').hidden=!continuous;
    $('strength').disabled=continuous||fixed||$('dither').value==='none';
    $('biases').querySelectorAll('input').forEach(input=>input.disabled=continuous);
    const placed=['native','free'].includes($('fit').value);
    $('placementControls').hidden=!placed;target.style.cursor=drawing?.active?'crosshair':placed?'move':'';target.style.touchAction=placed?'none':'';
    syncCropAspect();
    result = null; displayResult = null; savedResult = null; contentBounds = null; font = null; nativeFont = null; currentTemplate = null; buttons();
    basePreview=null;composedDrawingKey=null;
    cancelAnimationFrame(frame);
    const version=++previewVersion;
    if(!image)return;
    if(!previewActivity)previewActivity=Activity.begin('preview',t('Vorschau wird berechnet …'));
    else Activity.update('preview',t('Vorschau wird berechnet …'));
    frame=requestAnimationFrame(async()=>{
      // Paint the fixed activity display before entering synchronous pixel work.
      await Activity.nextPaint();
      if(version!==previewVersion)return;
      const activity=previewActivity;previewActivity=null;
      try {
        const error=render();
        if(error)Activity.update('preview',error,true);
      } finally { Activity.end(activity,t('Vorschau aktualisiert.')); }
    });
  }
  function resetCrop() {
    if (!image) return;
    drag=null;forceNewCrop=false;$('newCrop').setAttribute('aria-pressed','false');
    $('cropX').value = 0; $('cropY').value = 0; $('cropW').value = image.width; $('cropH').value = image.height;
    schedule();
  }
  function crop() {
    const x = val('cropX'), y = val('cropY'), w = val('cropW'), h = val('cropH');
    if (![x, y, w, h].every(Number.isFinite) || x < 0 || y < 0 || w < 1 || h < 1 || x + w > image.width+1e-6 || y + h > image.height+1e-6)
      throw Error(t('Der Ausschnitt muss vollständig im Originalbild liegen.'));
    return {x, y, w:Math.min(w,image.width-x), h:Math.min(h,image.height-y)};
  }
  function updateZoom() {
    for (const canvas of [source, target]) {
      const zoom = $(canvas===source?'zoom':'targetZoom').value; canvas.classList.toggle('zoomed', zoom !== 'fit');
      canvas.style.width = zoom === 'fit' ? '' : (canvas===source&&image?image.width:canvas.width) * Number(zoom) + 'px';
      canvas.style.height = zoom === 'fit' ? '' : (canvas===source&&image?image.height:canvas.height) * Number(zoom) + 'px';
    }
    updateTargetBlur();
  }
  function fitPreviews() {
    $('zoom').value = 'fit';$('targetZoom').value='fit';updateZoom();
    for (const canvas of [source,target]) { canvas.parentElement.scrollLeft = 0; canvas.parentElement.scrollTop = 0; }
  }
  function drawSource(rect) {
    const scale = $('zoom').value==='fit'?Math.min(1, 1200 / Math.max(image.width, image.height)):1;
    source.width = Math.max(1, Math.round(image.width * scale)); source.height = Math.max(1, Math.round(image.height * scale));
    const ctx = source.getContext('2d'); ctx.drawImage(image, 0, 0, source.width, source.height);
    const sx = source.width / image.width, sy = source.height / image.height;
    if ($('cropMode').checked || rect.x || rect.y || rect.w !== image.width || rect.h !== image.height) {
      ctx.fillStyle = '#143d3066'; ctx.beginPath(); ctx.rect(0, 0, source.width, source.height); ctx.rect(rect.x * sx, rect.y * sy, rect.w * sx, rect.h * sy); ctx.fill('evenodd');
      const screenScale=source.width/Math.max(1,source.getBoundingClientRect().width);
      ctx.strokeStyle = '#67c58d'; ctx.lineWidth = 2*screenScale; ctx.strokeRect(rect.x * sx + 1, rect.y * sy + 1, Math.max(0, rect.w * sx - 2), Math.max(0, rect.h * sy - 2));
      if($('cropMode').checked) {
        const size=8*screenScale;
        for(const [hx,hy]of [[0,0],[.5,0],[1,0],[1,.5],[1,1],[.5,1],[0,1],[0,.5]]) {
          const x=(rect.x+rect.w*hx)*sx,y=(rect.y+rect.h*hy)*sy;
          ctx.fillStyle='#fffdf8';ctx.fillRect(x-size/2,y-size/2,size,size);
          ctx.lineWidth=1.5*screenScale;ctx.strokeRect(x-size/2,y-size/2,size,size);
        }
      }
    }
  }
  async function updateMethodGuide(){
    const version=++guideVersion;if(!$('methodGuide').open)return;
    const activity=Activity.begin('guide',t('Beispiele werden berechnet …'));
    try{await Activity.nextPaint();if(version===guideVersion&&$('methodGuide').open)MethodGuide.render($('methodExamples'),colors(),t,colorProfileEditor?.renderColors,colorProfileEditor?.previewColors,colorProfileEditor?.calculation.reflectance,colorProfileEditor?.previewReflectance);}
    catch(error){message(error.message,true);Activity.update('guide',error.message,true);}
    finally{Activity.end(activity,t('Beispiele aktualisiert.'));}
  }
  $('methodGuide').addEventListener('toggle',()=>{updateMethodGuide();if($('methodGuide').open)document.querySelector('.workspace').scrollIntoView({block:'start'});});
  const optimizationKinds=['dark','color','text','smooth'];
  function optimizationOptions(){return Object.fromEntries(optimizationKinds.map(key=>{const suffix=key[0].toUpperCase()+key.slice(1);return [key,$('opt'+suffix).checked?val('opt'+suffix+'Strength'):0];}));}
  function optimizationPreset(name){const preset=Illustration.presets[name]||{};for(const key of optimizationKinds){const suffix=key[0].toUpperCase()+key.slice(1);$('opt'+suffix).checked=Boolean(preset[key]);$('opt'+suffix+'Strength').value=preset[key]||50;syncOptimization(key);}$('optPreset').value=name;schedule();}
  function syncOptimization(key){const suffix=key[0].toUpperCase()+key.slice(1);$('opt'+suffix+'Strength').disabled=!$('opt'+suffix).checked;$('opt'+suffix+'StrengthValue').value=$('opt'+suffix+'Strength').value+' %';}
  $('optPreset').onchange=()=>{if($('optPreset').value!=='custom')optimizationPreset($('optPreset').value);};
  $('optReset').onclick=()=>optimizationPreset('off');
  for(const key of optimizationKinds){const suffix=key[0].toUpperCase()+key.slice(1);for(const id of ['opt'+suffix,'opt'+suffix+'Strength'])$(id).addEventListener('input',()=>{syncOptimization(key);$('optPreset').value='custom';schedule();});}
  function optimizedSource(rect,dw,dh){
    const options=optimizationOptions();if(!Object.values(options).some(v=>v>0))return null;
    // Bound preprocessing memory for very large originals while retaining a high-resolution mask.
    const scale=Math.min(1,Math.sqrt(2000000/(rect.w*rect.h))),w=Math.max(1,Math.round(rect.w*scale)),h=Math.max(1,Math.round(rect.h*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,rect.x,rect.y,rect.w,rect.h,0,0,w,h);
    options.lineRadius=Math.round(Math.min(w/Math.max(1,dw),h/Math.max(1,dh))*1.5);
    const prepared=Illustration.prepare(context.getImageData(0,0,w,h).data,w,h,colors(),options);context.putImageData(new ImageData(prepared.data,w,h),0,0);
    return {canvas,prepared,options};
  }
  function convertSource() {
      const rect = crop(); drawSource(rect);
      const nativeW = val('width'), nativeH = val('height'), viewRotation = val('viewRotation'); EP.dimensions(nativeW, nativeH);
      const w = viewRotation % 180 ? nativeH : nativeW, h = viewRotation % 180 ? nativeW : nativeH;
      target.width = w; target.height = h; const ctx = target.getContext('2d', {willReadFrequently: true});
      if (!$('transparent').checked) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); }
      ctx.imageSmoothingEnabled = $('smooth').value === 'yes'; ctx.imageSmoothingQuality = 'high';
      let dw = w, dh = h;
      if (['native','free'].includes($('fit').value)) {
        if ($('fit').value==='native'&&![rect.x,rect.y,rect.w,rect.h].every(Number.isInteger)) throw Error(t('Für 1:1 bitte einen Ausschnitt mit ganzzahligen Pixelmaßen wählen (Seitenverhältnis-Bindung ggf. lösen).'));
        const scale=$('fit').value==='native'?1:val('imageScale')/100;
        if(!Number.isFinite(scale)||scale<.01||scale>4)throw Error(t('Bildskalierung: 1–400 %.'));
        dw=Math.max(1,Math.round(rect.w*scale));dh=Math.max(1,Math.round(rect.h*scale));
      } else if ($('fit').value !== 'stretch') {
        const scale = Math[$('fit').value === 'cover' ? 'max' : 'min'](w / rect.w, h / rect.h);
        dw = rect.w * scale; dh = rect.h * scale;
      }
      const placed=['native','free'].includes($('fit').value);
      if(placed&&![val('offsetX'),val('offsetY')].every(n=>Number.isInteger(n)&&Math.abs(n)<=4096))throw Error(t('Versatz: ganzzahlige Werte von −4096 bis 4096 Pixel.'));
      const dx=placed?Math.floor((w-dw)/2)+val('offsetX'):(w-dw)/2,dy=placed?Math.floor((h-dh)/2)+val('offsetY'):(h-dh)/2;
      if(dx>=w||dy>=h||dx+dw<=0||dy+dh<=0)throw Error(t('Das Bild liegt außerhalb des Displays. Bitte zentrieren oder den Versatz ändern.'));
      const enhanced=optimizedSource(rect,dw,dh);
      if(enhanced&&enhanced.options.smooth>0)ctx.drawImage(enhanced.canvas,dx,dy,dw,dh);else ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h,dx,dy,dw,dh);
      const options = Object.fromEntries(Object.keys(defaults).map(id => [id, val(id)]));
      displayResult = EP.quantize(ctx.getImageData(0, 0, w, h).data, w, h, colors(), {...options, dither: $('dither').value, mixColors:val('mixColors'), biases, ...colorProfileEditor?.calculation});
      if(enhanced)displayResult=Illustration.apply(displayResult,Illustration.resizeMasks(enhanced.prepared,w,h,dx,dy,dw,dh),colors(),enhanced.options);
      if ($('invert').checked) displayResult = EP.invert(displayResult, colors());
    return {pixels:displayResult,nativeW,nativeH,viewRotation,w,h,dx,dy,dw,dh};
  }
  function drawingKey(){return JSON.stringify([drawing?.history.version,drawing?.visible]);}
  function updateDrawing() {
    // A pending source calculation will composite the latest drawing itself.
    if(!basePreview)return;
    if(composedDrawingKey===drawingKey()){paintTargetPreview();return;}
    render(true);
  }
  function render(drawingOnly=false) {
    if (!image) return;
    try {
      if(!drawingOnly||!basePreview)basePreview=convertSource();
      const {pixels,nativeW,nativeH,viewRotation,w,h,dx,dy,dw,dh}=basePreview;
      displayResult=pixels;
      drawing?.sync(displayResult,nativeW,nativeH,viewRotation);
      const nativeLayer=drawing?.raster(nativeW,nativeH),viewLayer=nativeLayer?EP.rotate(nativeLayer,viewRotation):null;
      if(viewLayer)displayResult=DrawingLayer.merge(displayResult,viewLayer);
      result = EP.rotate(displayResult, -viewRotation);
      const left = Math.max(0, Math.floor(dx+1e-7)), top = Math.max(0, Math.floor(dy+1e-7));
      contentBounds = {x:left,y:top,w:Math.min(w,Math.ceil(dx+dw-1e-7))-left,h:Math.min(h,Math.ceil(dy+dh-1e-7))-top};
      if(viewLayer)contentBounds=DrawingLayer.union(contentBounds,DrawingLayer.bounds(viewLayer));
      if ($('exportContentOnly').checked) {
        const content = EP.cropImage(displayResult,contentBounds);
        savedResult = $('exportOrientation').value === 'view' ? content : EP.rotate(content,-viewRotation);
      } else savedResult = $('exportOrientation').value === 'view' ? displayResult : result;
      paintTargetPreview();
      $('sourceInfo').textContent = image.width + ' × ' + image.height + ' px'; $('targetInfo').textContent = w + ' × ' + h + ' px' + (viewRotation ? ' · ' + viewRotation + '°' : '');
      $('orientationInfo').textContent = t('Anzeige: ') + w + ' × ' + h + t(' · Auslieferung: ') + nativeW + ' × ' + nativeH + t(' · Speichern: ') + ($('exportOrientation').value === 'view' ? t('aktuelle Darstellung') : t('Originalformat')) + t(' · Datei: {width} × {height} px', {width:savedResult.width,height:savedResult.height}) + '.';
      $('paletteInfo').textContent = (continuousOutput()?t('Farbstufen · '):$('dither').value==='fixed'?t('Feste Mischfarben · bis zu {count} Displayfarben pro Mischton · ',{count:Math.min(val('mixColors'),colors().length)}):colors().length + t(' Farben · ')) + (result.data.some((v, i) => i % 4 === 3 && v < 255) ? t('mit Transparenz') : t('deckend'));
      $('emptySource').hidden = true; $('emptyTarget').hidden = true;
      try {
        nativeFont = EP.vlw(result, colors(), $('xpatch').checked, $('alphaPlane').checked);
        font = savedResult === result ? nativeFont : EP.vlw(savedResult, colors(), $('xpatch').checked, $('alphaPlane').checked);
        $('vlwInfo').textContent = font.mapping.map(m => '„' + m.char + '“ = ' + (m.mask ? t('Deckungsmaske (Alpha)') : m.color)).join(' · ') + '. ' + (font.oversized ? t('Achtung: Mindestens eine Ebene ist größer als 255 px; der VLW-Renderer kann diese fehlerhaft darstellen. ') : '') + (font.patched ? t('Patch aktiv: angegebene Zeichenreihenfolge beachten. ') : '') + t('Farbebenen enthalten bereits Alpha. Maske nicht als zusätzliche Farbe zeichnen.');
        $('vlwExample').textContent = t('Zeichen in dieser Reihenfolge am selben Ort zeichnen:\n') + font.order.map(i => '„' + font.mapping[i].char + '“ → ' + font.mapping[i].color).join('\n') + t('\n\nOEPL-Farbnummern hängen von Firmware und Display ab.\nDie Maske beschreibt Deckung: 0 = transparent, 255 = deckend.\nWeiß ist eine eigene Ebene; transparente Pixel bleiben leer.');
      } catch (error) { font = null; nativeFont = null; $('vlwInfo').textContent = error.message; $('vlwExample').textContent = continuousOutput()?error.message:t('Bitte VLW-Einstellungen anpassen.'); }
      updateTemplate();
      updateZoom(); buttons();composedDrawingKey=drawingKey();
      if ($('notice').classList.contains('error')) message(t('Vorschau aktualisiert.'));
    } catch (error) { basePreview=null;composedDrawingKey=null;drawing?.invalidate();result = null; displayResult = null; savedResult = null; contentBounds = null; font = null; nativeFont = null; currentTemplate = null; target.getContext('2d').clearRect(0, 0, target.width, target.height); buttons(); message(error.message, true); return error.message; }
  }
  function useImage(newImage, name) {
    baseImage = newImage; image = newImage; $('rotation').value = '0';$('offsetX').value=0;$('offsetY').value=0;
    filename = name.replace(/\.vlw(?:\.gz)?$|\.[^.]+$/i, '') || 'image'; $('imageName').textContent = name; resetCrop(); fitPreviews(); message(t('Bild geladen.'));
  }
  function rotatedSource(src, angle) {
    const c = document.createElement('canvas'), odd = angle % 180;
    c.width = odd ? src.height : src.width; c.height = odd ? src.width : src.height;
    const ctx = c.getContext('2d'); ctx.translate(c.width/2,c.height/2); ctx.rotate(angle*Math.PI/180); ctx.drawImage(src,-src.width/2,-src.height/2); return c;
  }
  async function openFile(file) {
    if (!file) return;
    const token = ++loadVersion, url = URL.createObjectURL(file), activity=Activity.begin('image',t('Bild wird geladen …'));
    message(t('Bild wird geladen …'));
    try {
      if (/\.vlw(?:\.gz)?$/i.test(file.name)) {
        const bytes=await FontCodec.unpack(file,file.name),pixels=EP.readVlw(bytes,colors().slice());
        if(token!==loadVersion)return;
        useImage(imageCanvas(pixels),file.name);
        message(t('VLW-Bild importiert. ') + t('Farben mit der aktuellen Palette interpretiert; bitte Zuordnung prüfen.'));
        await Activity.nextPaint(); return;
      }
      const img = new Image(); img.src = url; await img.decode();
      if (token !== loadVersion) return;
      if (img.naturalWidth * img.naturalHeight > 24000000) throw Error(t('Das Quellbild ist zu groß (maximal 24 Millionen Pixel).'));
      useImage(img, file.name); await Activity.nextPaint();
    } catch (error) { if (token === loadVersion) message(/\.vlw(?:\.gz)?$/i.test(file.name)?error.message:t('Bild konnte nicht geladen werden. Bitte ein gültiges Rasterbild bis 24 Millionen Pixel verwenden.'), true); }
    finally { URL.revokeObjectURL(url); Activity.end(activity,t('Bild geladen.')); }
  }
  async function readClipboard(destination){
    if(destination==='drawing'&&!image)throw Error(t('Bitte zuerst ein Bild laden oder eine leere Zeichenfläche anlegen.'));
    const token=destination==='drawing'?++drawing.loadVersion:++loadVersion;
    const file=await ClipboardImage.readImage();
    if(token!==(destination==='drawing'?drawing.loadVersion:loadVersion))return;
    if(destination==='drawing')await drawing.loadImage(file,{place:true});else await openFile(file);
  }
  task('pasteSource',()=>readClipboard('source'));
  task('pasteDrawing',()=>readClipboard('drawing'));
  document.addEventListener('paste',event=>{
    if(event.defaultPrevented||$('imageTool').getAttribute('aria-pressed')!=='true'||ClipboardImage.textTarget(event.target))return;
    const file=ClipboardImage.fromTransfer(event.clipboardData);if(!file)return;
    event.preventDefault();
    if(image&&drawing?.active)drawing.loadImage(file,{place:true});else openFile(file);
  });
  $('file').onchange = event => openFile(event.target.files[0]);
  $('sourceWell').ondragover = event => event.preventDefault();
  $('sourceWell').ondrop = event => { event.preventDefault(); openFile(event.dataTransfer.files[0]); };
  $('demo').onclick = () => {
    ++loadVersion;
    const canvas = document.createElement('canvas'); canvas.width = 888; canvas.height = 384;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fffdf4'; ctx.fillRect(0, 0, 888, 384);
    ctx.fillStyle = '#164f42'; ctx.fillRect(0, 0, 290, 384); ctx.fillStyle = '#f3cd38'; ctx.beginPath(); ctx.arc(142, 128, 64, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px Segoe UI'; ctx.fillText(t('E-PAPER'), 34, 267); ctx.fillText(t('TESTBILD'), 34, 300);
    ctx.fillStyle = '#222'; ctx.font = 'bold 53px Segoe UI'; ctx.fillText(t('E-Paper-Testbild'), 330, 104); ctx.font = '24px Segoe UI'; ctx.fillText(t('Text, Farbflächen und Farbverlauf'), 333, 151);
    const grad = ctx.createLinearGradient(330, 0, 830, 0); grad.addColorStop(0, '#000'); grad.addColorStop(.5, '#f22'); grad.addColorStop(1, '#ffec00'); ctx.fillStyle = grad; ctx.fillRect(334, 198, 502, 88);
    ctx.fillStyle = '#66766a'; ctx.font = '18px Segoe UI'; ctx.fillText(t('AUSSCHNITT  /  SKALIERUNG  /  FARBZUORDNUNG'), 334, 339); useImage(canvas, 'E-Paper-Beispiel.png');
  };
  function populatePatternColors(){
    populateMixSizes();const palette=colors();
    for(const [id,fallback]of [['patternColorA',0],['patternColorB',1]]){
      const select=$(id),previous=select.value;select.replaceChildren();palette.forEach(color=>option(select,color,ColorInfo.label(color)));select.value=palette.includes(previous)?previous:palette[fallback];
    }
  }
  $('testPatternMode').onchange=()=>{
    const mode=$('testPatternMode').value;$('patternMixControls').hidden=mode!=='pairs';updateMixInfo();$('patternOptions').hidden=false;$('patternLabelsControl').hidden=['solid','checker','noise'].includes(mode);$('patternFirstColor').hidden=!['solid','checker'].includes(mode);$('patternSeedControl').hidden=mode!=='noise';$('noiseHint').hidden=mode!=='noise';$('patternSecondColor').hidden=mode!=='checker';$('patternCellControl').hidden=mode!=='checker';
  };
  function populateMixSizes(){
    const palette=colors(),key=JSON.stringify(palette),select=$('patternMixSize'),previous=Number(select.value)||2;
    if(key!==mixPaletteKey){mixPage=0;mixPaletteKey=key;}
    select.replaceChildren();for(let n=2;n<=palette.length;n++)option(select,String(n),String(n));select.value=String(Math.min(palette.length,previous));updateMixInfo();
  }
  function updateMixInfo(){
    const group=TestPattern.mixturePage(colors(),val('patternMixSize')||2,mixPage);mixPage=group.page;
    $('patternMixPage').value=mixPage+1;$('patternMixPage').max=group.pages;$('patternMixPrevious').disabled=mixPage===0;$('patternMixNext').disabled=mixPage>=group.pages-1;
    $('patternMixInfo').textContent=t(group.total===1?'Seite {page} von {pages} · {total} Kombination':'Seite {page} von {pages} · {total} Kombinationen',{page:mixPage+1,pages:group.pages,total:group.total});
    $('patternMixLegend').textContent=group.items.map((mix,i)=>(mixPage*12+i+1)+': '+mix.map(ColorInfo.code).join('/')).join(' · ');
  }
  $('patternMixSize').onchange=()=>{mixPage=0;updateMixInfo();};
  function navigateMixPage(page){if(Number.isFinite(page)&&Math.floor(page)===mixPage){updateMixInfo();return;}if(busy.has('testPattern'))return;mixPage=Number.isFinite(page)?Math.floor(page):0;updateMixInfo();$('testPattern').click();}
  $('patternMixPrevious').onclick=()=>navigateMixPage(mixPage-1);$('patternMixNext').onclick=()=>navigateMixPage(mixPage+1);$('patternMixPage').onchange=()=>navigateMixPage(val('patternMixPage')-1);
  $('newPatternSeed').onclick=()=>{$('patternSeed').value=crypto.getRandomValues(new Uint32Array(1))[0];};
  $('patternCell').oninput=()=>{$('patternCellValue').value=$('patternCell').value;};
  task('testPattern', () => {
    try {
      const odd=val('viewRotation')%180,w=val(odd?'height':'width'),h=val(odd?'width':'height');
      EP.dimensions(w,h);
      const canvas=TestPattern.create(w,h,colors(),$('testPatternMode').value,t,{a:$('patternColorA').value,b:$('patternColorB').value,cell:val('patternCell'),seed:val('patternSeed'),labels:$('patternLabels').value,mixSize:val('patternMixSize'),mixPage});
      ++loadVersion;
      $('cropAspect').checked=false;$('fit').value='native';$('offsetX').value=0;$('offsetY').value=0;$('imageScale').value=100;$('imageScaleValue').value='100 %';
      $('resetAdjustments').click();
      useImage(canvas,'OEPL-Test-'+w+'x'+h+'.png');
      message(t('Testbild erzeugt. Farbkorrekturen, Invertierung und Dithering wurden zurückgesetzt. Verläufe lassen sich anschließend mit Dithering prüfen.'));
    } catch(error) { message(error.message,true); }
  });
  $('size').onchange = () => { if ($('size').value !== 'custom') { const [w, h] = $('size').value.split('x'); $('width').value = w; $('height').value = h; aspectRatio = Number(w) / Number(h); } schedule(); };
  let aspectRatio = val('width') / val('height');
  $('aspect').onchange = () => { aspectRatio = val('width') / val('height'); };
  for (const id of ['width', 'height']) $(id).addEventListener('input', () => {
    $('size').value = 'custom'; if ($('aspect').checked && Number.isFinite(aspectRatio) && aspectRatio > 0) $(id === 'width' ? 'height' : 'width').value = Math.max(1, Math.round(id === 'width' ? val(id) / aspectRatio : val(id) * aspectRatio)); schedule();
  });
  $('swap').onclick = () => { const w = $('width').value; $('width').value = $('height').value; $('height').value = w; aspectRatio = val('width') / val('height'); $('size').value = 'custom'; schedule(); };
  $('resetCrop').onclick = () => { drag = null; resetCrop(); fitPreviews(); };
  $('originalSize').onclick = () => {
    if (!image) return;
    try {
      const c = crop(), odd = val('viewRotation') % 180;
      const width = Math.max(1,Math.round(odd ? c.h : c.w)), height = Math.max(1,Math.round(odd ? c.w : c.h));
      // Validate before changing any fields. Large source files are allowed,
      // but the processing limit must not leave the target in an invalid state.
      EP.dimensions(width,height);
      $('width').value = width; $('height').value = height; aspectRatio = width/height;
      $('size').value = 'custom'; fitPreviews(); schedule();
    } catch (error) { message(t('Ausschnittgröße kann nicht übernommen werden. Die Zielgröße bleibt unverändert. ') + error.message,true); }
  };
  for (const id of ['cropX','cropY','cropW','cropH','fit','rotation','smooth','cropMode','transparent','xpatch','alphaPlane','dither','mixColors','viewRotation','exportOrientation','exportContentOnly','invert']) $(id).addEventListener('input', () => {
    if(image&&cropRatio()&&['cropX','cropY','cropW','cropH'].includes(id)) {
      const rect={x:val('cropX'),y:val('cropY'),w:val('cropW'),h:val('cropH')};
      if([rect.x,rect.y,rect.w,rect.h].every(Number.isFinite)&&rect.w>=1&&rect.h>=1)
        try{writeCrop(CropModel.size(rect,cropBounds(),cropRatio(),id==='cropH'?'height':'width'));}catch(error){message(error.message,true);}
    }
    if(id==='fit'&&$('fit').value==='native'){$('imageScale').value=100;$('imageScaleValue').value='100 %';}
    if(id==='cropMode'&&!$('cropMode').checked){drag=null;forceNewCrop=false;$('newCrop').setAttribute('aria-pressed','false');}
    schedule();
  });
  $('imageScale').oninput=()=>{$('fit').value='free';$('imageScaleValue').value=$('imageScale').value+' %';schedule();};
  for(const id of ['offsetX','offsetY'])$(id).oninput=schedule;
  $('centerImage').onclick=()=>{$('offsetX').value=0;$('offsetY').value=0;schedule();};
  let placementDrag=null;
  target.addEventListener('pointerdown',event=>{
    if(!image||!['native','free'].includes($('fit').value)||event.button!==0)return;
    event.preventDefault();const r=target.getBoundingClientRect();
    placementDrag={id:event.pointerId,x:event.clientX,y:event.clientY,ox:val('offsetX'),oy:val('offsetY'),sx:target.width/r.width,sy:target.height/r.height};
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove',event=>{
    if(!placementDrag||event.pointerId!==placementDrag.id)return;
    for(const [id,key,client,origin,scale]of [['offsetX','ox',event.clientX,'x','sx'],['offsetY','oy',event.clientY,'y','sy']])$(id).value=Math.max(-4096,Math.min(4096,placementDrag[key]+Math.round((client-placementDrag[origin])*placementDrag[scale])));
    schedule();
  });
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])target.addEventListener(kind,()=>{placementDrag=null;});
  $('cropAspect').onchange=()=>{syncCropAspect();schedule();};
  $('newCrop').onclick=()=>{forceNewCrop=true;$('newCrop').setAttribute('aria-pressed','true');$('cropMode').checked=true;source.style.cursor='crosshair';schedule();};
  $('rotation').addEventListener('change', () => { if (baseImage) { image = rotatedSource(baseImage, val('rotation')); resetCrop(); fitPreviews(); } });
  for (const id of Object.keys(defaults)) $(id).oninput = () => { $(id + 'Value').value = $(id).value; schedule(); };
  $('resetAdjustments').onclick = () => { for (const [id, v] of Object.entries(defaults)) { $(id).value = v; $(id + 'Value').value = v; } $('dither').value = 'none'; $('invert').checked = false; optimizationPreset('off');paletteChanged(); };
  function paintTargetPreview(){
    if(displayResult){targetPreview.paint(target.getContext('2d'),ColorProfiles.preview(displayResult,colors(),colorProfileEditor?.previewColors,colorProfileEditor?.previewReflectance),val('targetBlur'));drawing?.decorate();}
  }
  function updateTargetBlur(){
    const amount=val('targetBlur');target.style.filter='none';target.style.imageRendering=amount>0?'auto':'pixelated';$('targetBlurValue').value=I18N.number(amount,2)+' px';paintTargetPreview();
  }
  $('targetBlur').oninput=updateTargetBlur;
  function refreshPreviewViews(){
    updateZoom();
    if(image){try{drawSource(crop());}catch{}}
    paintTargetPreview();
  }
  $('zoom').onchange=()=>{refreshPreviewViews();source.parentElement.scrollLeft=0;source.parentElement.scrollTop=0;};
  $('targetZoom').onchange=()=>{refreshPreviewViews();target.parentElement.scrollLeft=0;target.parentElement.scrollTop=0;};
  function workspaceSizing(){
    const stage=document.querySelector('.stage'),height=stage.getBoundingClientRect().height;
    stage.classList.toggle('previewTooTall',height>innerHeight-32);
    // Tall tool panels scroll out first; then keep the lower image area in view.
    const imageOffset=stage.querySelector('.previews').getBoundingClientRect().top-stage.getBoundingClientRect().top;
    const top=Math.max(Math.min(16,Math.floor(innerHeight-height-16)),Math.ceil(16-imageOffset));
    stage.style.setProperty('--stage-sticky-top',top+'px');
  }
  function previewHeight(){document.documentElement.style.setProperty('--preview-height',$('previewHeight').value+'vh');$('previewHeightValue').value=$('previewHeight').value+' %';refreshPreviewViews();workspaceSizing();}
  $('previewHeight').oninput=previewHeight;
  function expandedWorkspace(expanded){
    document.body.classList.toggle('workspaceExpanded',expanded);$('expandWorkspace').setAttribute('aria-pressed',String(expanded));
    const key=expanded?'Arbeitsansicht verkleinern':'Arbeitsansicht vergrößern';$('expandWorkspace').dataset.i18n=key;$('expandWorkspace').textContent=t(key);
    refreshPreviewViews();workspaceSizing();document.querySelector('.workspace').scrollIntoView({block:'start'});
  }
  $('expandWorkspace').onclick=()=>expandedWorkspace(!document.body.classList.contains('workspaceExpanded'));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented&&!drawing?.gesture&&document.body.classList.contains('workspaceExpanded')){event.preventDefault();expandedWorkspace(false);}});
  window.addEventListener('resize',()=>{refreshPreviewViews();workspaceSizing();});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{workspaceSizing();updateTargetBlur();}).observe(document.querySelector('.stage'));

  function pointer(event) {
    const r=source.getBoundingClientRect();
    return {x:Math.max(0,Math.min(image.width,(event.clientX-r.left)/r.width*image.width)),y:Math.max(0,Math.min(image.height,(event.clientY-r.top)/r.height*image.height))};
  }
  function cropHit(point) {
    const rect=crop(),r=source.getBoundingClientRect(),hit=CropModel.hit(rect,point,{x:10*image.width/r.width,y:10*image.height/r.height});
    const full=rect.x===0&&rect.y===0&&rect.w===image.width&&rect.h===image.height;
    return forceNewCrop||(full&&hit==='move')?'new':hit;
  }
  function cropCursor(hit) {
    source.style.cursor=hit==='move'?'move':hit==='new'?'crosshair':({nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'}[hit]||'default');
  }
  source.onpointerdown=event=>{
    if(!image||!$('cropMode').checked||event.button!==0)return;
    try {const point=pointer(event);drag={pointerId:event.pointerId,start:point,rect:crop(),mode:cropHit(point)};source.setPointerCapture(event.pointerId);cropCursor(drag.mode);event.preventDefault();}
    catch(error){message(error.message,true);}
  };
  source.onpointermove=event=>{
    if(!image)return;
    if(!$('cropMode').checked){source.style.cursor='default';return;}
    try {
      const point=pointer(event);
      if(!drag){cropCursor(cropHit(point));return;}
      if(event.pointerId!==drag.pointerId)return;
      const bounds=cropBounds(),ratio=cropRatio();
      const rect=drag.mode==='new'?CropModel.create(drag.start,point,bounds,ratio):drag.mode==='move'?CropModel.move(drag.rect,point.x-drag.start.x,point.y-drag.start.y,bounds):CropModel.resize(drag.rect,drag.mode,point,bounds,ratio);
      writeCrop(rect);schedule();
    } catch(error){message(error.message,true);}
  };
  source.onpointerup=source.onpointercancel=event=>{
    if(drag&&drag.pointerId===event.pointerId){drag=null;forceNewCrop=false;$('newCrop').setAttribute('aria-pressed','false');if(source.hasPointerCapture(event.pointerId))source.releasePointerCapture(event.pointerId);}
  };
  source.onlostpointercapture=()=>{drag=null;};
  function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function exportImage() { return savedResult; }
  function imageCanvas(pixels) { const c = document.createElement('canvas'); c.width = pixels.width; c.height = pixels.height; c.getContext('2d').putImageData(new ImageData(pixels.data,pixels.width,pixels.height),0,0); return c; }
  function jpegBlob(pixels = exportImage()) {
    if (!pixels) throw Error(t('Bitte zuerst ein gültiges Bild vorbereiten.'));
    const data = new Uint8ClampedArray(pixels.data);
    for (let p = 0; p < data.length; p += 4) { const a = data[p + 3] / 255; for (let k = 0; k < 3; k++) data[p + k] = data[p + k] * a + 255 * (1 - a); data[p + 3] = 255; }
    const encoded = window['jpeg-js'].encode({data, width: pixels.width, height: pixels.height}, 100).data;
    return new Blob([encoded], {type: 'image/jpeg'});
  }
  function task(id, action) {
    $(id).onclick = async () => {
      const actionName=$(id).textContent.trim(), label=t('Aktion läuft: {action}',{action:actionName});
      const activity=Activity.begin('image',label);
      busy.add(id); buttons(); message(label);
      try { await Activity.nextPaint(); await action(); if (!result && image) await Activity.nextPaint(); }
      catch (error) { message(error.message || t('Aktion fehlgeschlagen.'),true); }
      finally {
        if ($('notice').textContent===label) message(t('Aktion abgeschlossen: {action}',{action:actionName}));
        busy.delete(id); $(id).disabled=false; buttons(); Activity.end(activity);
      }
    };
  }
  task('png', async () => { if (!result) return; const blob = await new Promise(resolve => imageCanvas(exportImage()).toBlob(resolve, 'image/png')); if (!blob) throw Error(t('PNG-Export fehlgeschlagen.')); download(blob, filename + '.png'); });
  task('jpeg', () => download(jpegBlob(), filename + '.jpg'));
  task('vlw', async () => { if (font) { const saved=font,compressed=$('gzipFont').checked,name=FontCodec.fileName(filename,compressed); download(await FontCodec.pack(saved.bytes,compressed),name); } });
  task('manifest', () => {
    if (!font || !result) throw Error(t('Bitte zuerst ein gültiges Bild vorbereiten.'));
    const metadata = layerManifest(font,exportImage(),FontCodec.fileName(filename,$('gzipFont').checked));
    download(new Blob([JSON.stringify(metadata, null, 2)], {type: 'application/json'}), filename + '.layers.json');
  });
  function layerManifest(vlw, pixels, path, orientation = $('exportOrientation').value, area = $('exportContentOnly').checked?'content':'display') {
    return {format:'img2vlw-layers-v2',width:pixels.width,height:pixels.height,font:path,orientation,viewRotation:val('viewRotation'),exportArea:area,compression:/\.gz$/i.test(path)?'gzip':'none',contentBoundsView:contentBounds,layers:vlw.mapping,drawOrder:vlw.order.map(i=>vlw.mapping[i].char),patched:vlw.patched};
  }
  function effectiveFontPath() {
    const path=$('fontPath').value.trim();
    if(!/\.vlw(?:\.gz)?$/i.test(path))throw Error(t('VLW-Pfad muss /fonts/DATEI.vlw oder /fonts/DATEI.vlw.gz entsprechen.'));
    return FontCodec.fileName(path,$('gzipFont').checked);
  }
  $('gzipFont').onchange=()=>{
    if(/\.vlw(?:\.gz)?$/i.test($('fontPath').value.trim()))$('fontPath').value=effectiveFontPath();
    updateTemplate();
  };
  $('fontPath').addEventListener('change',()=>{
    if(/\.vlw(?:\.gz)?$/i.test($('fontPath').value.trim()))$('fontPath').value=effectiveFontPath();
    updateTemplate();
  });
  function updateTemplate() {
    currentTemplate = null;
    try {
      if (!nativeFont || !result) throw Error(t('Bitte zuerst ein gültiges Bild vorbereiten.'));
      EPAP.writablePath(effectiveFontPath()); EPAP.writablePath(effectiveFontPath().replace(/\.vlw(?:\.gz)?$/i,'.layers.json'));
      currentTemplate = EP.template(nativeFont,FontCodec.logicalPath(effectiveFontPath()),val('templateX'),val('templateY'));
      $('templateJSON').value = JSON.stringify(currentTemplate,null,2);
      const w = selectedMeta ? Number(selectedMeta.width) : result.width, h = selectedMeta ? Number(selectedMeta.height) : result.height;
      const c = $('templatePreview'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,w,h); ctx.drawImage(imageCanvas(result),val('templateX'),val('templateY'));
      $('templateInfo').textContent = t('Bild ') + result.width + ' × ' + result.height + t(' auf Display ') + w + ' × ' + h + ' · X=' + val('templateX') + ', Y=' + val('templateY') + '. ' + (nativeFont.oversized ? t('Achtung: VLW-Ebenen über 255 px können vom VLW-Renderer fehlerhaft dargestellt werden. ') : '') + (val('templateX') === 0 && !$('xpatch').checked ? t('Bei X=0 möglichst den x-Position-0-Patch verwenden. ') : '') + (val('templateX') < 0 || val('templateY') < 0 || val('templateX') + result.width > w || val('templateY') + result.height > h ? t('Das Bild wird am Displayrand abgeschnitten.') : '');
    } catch (error) { $('templateJSON').value = ''; $('templateInfo').textContent = error.message; }
    buttons();
  }
  for (const id of ['templateX','templateY','fontPath']) $(id).addEventListener('input',updateTemplate);
  function templateBlob(template) { return new Blob([JSON.stringify(template,null,2)],{type:'application/json'}); }
  task('saveTemplate', () => { if (!currentTemplate) throw Error(t('Bitte ein gültiges VLW-Template vorbereiten.')); download(templateBlob(currentTemplate),filename + '.template.json'); });
  async function storeFont(address,path,vlw,pixels,overwrite,orientation = $('exportOrientation').value,area = $('exportContentOnly').checked?'content':'display') {
    EP.template(vlw,path,0,0); // Validate the font path before writing anything.
    const sidecar = path.replace(/\.vlw(?:\.gz)?$/i,'.layers.json');
    EPAP.writablePath(path); EPAP.writablePath(sidecar);
    const manifest = layerManifest(vlw,pixels,path,orientation,area);
    const packed=await FontCodec.pack(vlw.bytes,/\.gz$/i.test(path));
    const existing = await EPAP.files(address,'/fonts');
    if(/\.gz$/i.test(path)&&existing.some(entry=>entry.name.split('/').at(-1)===FontCodec.logicalPath(path).split('/').at(-1)))throw Error(t('Eine unkomprimierte VLW-Datei gleichen Namens würde die Gzip-Datei auf dem AP überlagern. Anderen Namen wählen oder die alte VLW-Datei auf dem AP entfernen.'));
    if (!overwrite && existing.some(entry => [path,sidecar].some(p=>p.split('/').at(-1) === entry.name.split('/').at(-1)))) throw Error(t('Font oder Ebenenplan existiert bereits. Neuen Namen wählen oder Überschreiben aktivieren.'));
    await EPAP.putFile(address,path,packed,overwrite);
    await EPAP.putFile(address,sidecar,new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}),overwrite);
  }
  task('storeJPEG', async () => {
    const address = base(), path = $('jpegPath').value.trim(), blob = jpegBlob();
    if (!/^\/images\/[A-Za-z0-9._-]+\.jpe?g$/i.test(path)) throw Error(t('JPEG-Pfad muss /images/DATEI.jpg entsprechen.'));
    await EPAP.putFile(address,path,blob,$('overwriteFiles').checked); message(t('JPEG auf dem AP gespeichert und bytegenau geprüft: ') + path);
  });
  task('storeVLW', async () => {
    if (!font || !result) throw Error(t('Bitte ein gültiges VLW-Bild vorbereiten.'));
    const address = base(), path = effectiveFontPath(), savedFont = font, pixels = exportImage();
    await storeFont(address,path,savedFont,pixels,$('overwriteFiles').checked); message(t('VLW und Ebenenplan gespeichert und bytegenau geprüft: ') + path);
  });
  task('testVLW', async () => {
    if (!currentTemplate || !nativeFont || !result || !selectedTag || !selectedMeta) throw Error(t('Bitte Bild, Template und Testdisplay auswählen.'));
    const address = selectedBase(), targetMAC = EPAP.mac($('mac').value), targetTag = selectedTag;
    if (targetMAC !== EPAP.mac(targetTag.mac)) throw Error(t('Für den VLW-Test muss die MAC zum ausgewählten Display gehören.'));
    const template = currentTemplate, savedFont = nativeFont, pixels = result, path = effectiveFontPath(), overwrite = $('overwriteFiles').checked;
    message(t('Lade VLW und Ebenenplan hoch …'));
    await storeFont(address,path,savedFont,pixels,overwrite,'native','display');
    message(t('Dateien geprüft. Sende VLW-Template an ') + targetMAC + ' …');
    await EPAP.sendTemplate(address,targetMAC,template);
    message(t('VLW-Dateien geprüft und Template vom AP angenommen. Das Display übernimmt es beim nächsten Abruf.'));
  });
  async function listAPFiles() {
    const address = base(), directory = EPAP.filePath($('apDirectory').value.trim());
    const entries = await EPAP.files(address,directory);
    if (base() !== address || $('apDirectory').value.trim() !== directory) return;
    listedBase = address; listedDirectory = directory; apFileEntries = entries;
    $('apFiles').replaceChildren(I18N.option('Datei oder Ordner auswählen',''));
    entries.forEach((entry,i) => option($('apFiles'),String(i),(entry.type === 'dir' ? '▸ ' : '') + entry.name + (entry.size ? ' · ' + entry.size + ' Bytes' : '')));
    message(entries.length + t(' Einträge in ') + directory + t(' geladen.'));
  }
  function chosenAPFile() {
    if (base() !== listedBase || $('apDirectory').value.trim() !== listedDirectory || $('apFiles').value === '') throw Error(t('Bitte die aktuelle Dateiliste laden und einen Eintrag auswählen.'));
    const entry = apFileEntries[Number($('apFiles').value)];
    const path = EPAP.filePath((listedDirectory === '/' ? '' : listedDirectory) + '/' + entry.name.split('/').at(-1));
    return {address:listedBase,path,entry};
  }
  task('listFiles',listAPFiles);
  task('parentDirectory',async () => { $('apDirectory').value = $('apDirectory').value.trim().replace(/\/[^/]+\/?$/,'') || '/'; await listAPFiles(); });
  task('downloadAPFile',async () => { const file = chosenAPFile(); if (file.entry.type !== 'file') throw Error(t('Bitte eine Datei auswählen.')); const blob = await (await EPAP.getFile(file.address,file.path)).blob(); download(blob,file.path.split('/').at(-1)); });
  task('openAPFile',async () => {
    const file = chosenAPFile();
    if (file.entry.type === 'dir') { $('apDirectory').value = file.path; await listAPFiles(); return; }
    const name = file.path.split('/').at(-1);
    if (/\.vlw(?:\.gz)?$/i.test(name)) {
      const token = ++loadVersion, palette = colors().slice();
      let blob = await (await EPAP.getFile(file.address,file.path)).blob(), metadata = null;
      const bytes = await FontCodec.unpack(blob,name);
      try { metadata = await (await EPAP.getFile(file.address,file.path.replace(/\.vlw(?:\.gz)?$/i,'.layers.json'))).json(); } catch (error) { if (!String(error.message).includes('HTTP 404')) throw error; }
      const pixels = EP.readVlw(bytes,palette,metadata);
      if (token !== loadVersion || base() !== file.address) return;
      if (metadata?.layers) {
        const importedColors = [...new Set([...metadata.layers.filter(m=>!m.mask&&m.color).map(m=>m.color.toLowerCase())])];
        if (validColors(importedColors)) { presets['AP-Bildfont'] = importedColors; populatePresets('custom:AP-Bildfont'); }
      }
      useImage(imageCanvas(pixels),name); message(t('VLW-Bild importiert. ') + (metadata ? t('Farben aus gespeichertem Ebenenplan übernommen.') : t('Farben mit der aktuellen Palette interpretiert; bitte Zuordnung prüfen.')));
    } else {
      if (!/\.(?:png|jpe?g|bmp|webp|gif)$/i.test(name)) throw Error(t('Bitte ein Rasterbild oder einen img2vlw-Bildfont auswählen.'));
      const blob = await (await EPAP.getFile(file.address,file.path)).blob();
      if (base() !== file.address) return;
      await openFile(new File([blob],name));
    }
  });
  function knownOptions() { $('knownAPs').replaceChildren(); known.forEach(k => option($('knownAPs'), k, k)); }
  function base() { return EPAP.normalize($('apAddress').value.trim()); }
  function selectedBase() { if (!connectedBase || base() !== connectedBase) throw Error(t('Bitte zuerst mit diesem AP verbinden.')); return connectedBase; }
  async function connect(address) {
    const normalized = EPAP.normalize(address); message(t('Lade Displays von ') + normalized + ' …');
    const tags = await EPAP.tags(normalized);
    if (base() !== normalized) return;
    connectedBase = normalized; allTags = tags; selectedTag = null; selectedMeta = null; ++selectionVersion;
    $('tags').replaceChildren(I18N.option('Display auswählen', ''));
    tags.forEach((tag, i) => option($('tags'), String(i), (tag.alias || 'Display') + ' · ' + tag.mac));
    known = [normalized, ...known.filter(k => k !== normalized)].slice(0, 30); saveStore('ep-aps-v2', known); knownOptions(); buttons(); message(tags.length + t(' Displays gefunden.'));
  }
  const connectionError = error => { throw Error(error.message + t(' · Bei Netzwerkfehlern AP-Adresse, Browser-Netzwerkfreigabe und CORS prüfen. Die App kann auch direkt vom AP bereitgestellt werden (README).')); };
  task('connect', async () => { try { await connect($('apAddress').value); } catch (e) { connectionError(e); } });
  task('discover', async () => {
    message(t('Prüfe bekannte AP-Adressen …'));
    const candidates = [...new Set([...known, ...($('apAddress').value ? [$('apAddress').value] : []), 'http://openepaperlink.local'])];
    const results = await Promise.allSettled(candidates.map(async address => { await EPAP.tags(address); return EPAP.normalize(address); }));
    const found = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    if (!found.length) throw Error(t('Keine bekannten APs erreichbar. Bitte AP-Adresse direkt eingeben. Browser können den Zugriff blockieren.'));
    known = [...new Set([...found, ...known])].slice(0, 30); knownOptions(); saveStore('ep-aps-v2', known); $('apAddress').value = found[0]; await connect(found[0]);
  });
  $('apAddress').oninput = () => { connectedBase = ''; selectedMeta = null; selectedTag = null; allTags = []; ++selectionVersion; $('tags').replaceChildren(I18N.option('Bitte verbinden', '')); $('tagInfo').textContent = t('Noch kein Display ausgewählt.'); buttons(); };
  $('mac').oninput = buttons;
  $('tags').onchange = async () => {
    const token = ++selectionVersion; selectedMeta = null; selectedTag = null; buttons();
    if ($('tags').value === '') return;
    selectedTag = allTags[Number($('tags').value)]; $('mac').value = selectedTag.mac; buttons();
    const activity=Activity.begin('image',t('Displayprofil wird geladen …')); message(t('Displayprofil wird geladen …'));
    try {
      const meta = await EPAP.type(selectedBase(), selectedTag.hwType);
      if (token !== selectionVersion) return;
      EP.dimensions(Number(meta.width), Number(meta.height)); selectedMeta = meta;
      updateTagInfo(); updateTemplate(); buttons(); message(t('Displayprofil geladen.'));
    } catch (error) { if (token === selectionVersion) { $('tagInfo').textContent = t('Profil nicht verfügbar.'); message(error.message, true); } }
    finally { Activity.end(activity); }
  };
  function applyProfile() {
    if (!selectedMeta) throw Error(t('Bitte ein Display mit verfügbarem Profil auswählen.'));
    const palette = [...new Set(Object.values(selectedMeta.colortable || {}).map(c => '#' + c.map(v => Number(v).toString(16).padStart(2, '0')).join('')))];
    const white = palette.indexOf('#ffffff'); if (white >= 0) {palette.splice(white, 1);palette.unshift('#ffffff');}
    if (!validColors(palette)) throw Error(t('Die AP-Farbtabelle kann nicht als Palette übernommen werden.'));
    const black = palette.indexOf('#000000'); if (black > 1) { palette.splice(black, 1); palette.splice(1, 0, '#000000'); }
    presets['AP-Display'] = palette; populatePresets('custom:AP-Display');
    if($('takeColorProfile').checked)colorProfileEditor.applyAP(selectedMeta,'ap:'+selectedBase()+':'+EPAP.mac(selectedTag.mac));
    else colorProfileEditor.clearAP();
    $('width').value = selectedMeta.width; $('height').value = selectedMeta.height; aspectRatio = Number(selectedMeta.width) / Number(selectedMeta.height); $('size').value = 'custom'; schedule();
  }
  function updateTagInfo() {
    $('tagInfo').textContent = (selectedMeta.name || 'Display') + ' · ' + selectedMeta.width + ' × ' + selectedMeta.height + ' px · ' + Object.keys(selectedMeta.colortable || {}).length + t(' Farben') + (Number(selectedTag.rotate) || Number(selectedTag.invert) ? t(' · Achtung: Im AP sind zusätzliche Drehung oder Invertierung aktiv; diese können das ausgelieferte Bild erneut verändern.') : '');
  }
  task('profile', () => { applyProfile(); const profile=colorProfileEditor.current();message(t('Displaygröße und Farbpalette übernommen.')+($('takeColorProfile').checked?' '+(profile?t('Berechnung mit Farbprofil: {name}',{name:t(profile.name)}):t('Kein aktives Farbprofil; idealisierte Farben werden verwendet.')):'')); });
  async function rawData() { if (!selectedTag) throw Error(t('Bitte ein Display auswählen.')); const response = await EPAP.request(selectedBase(), '/current/' + EPAP.mac(selectedTag.mac) + '.raw'); return response.arrayBuffer(); }
  task('raw', async () => { const name = EPAP.mac(selectedTag.mac); download(new Blob([await rawData()], {type: 'application/octet-stream'}), name + '.raw'); });
  task('read', async () => {
    const meta = selectedMeta, tag = selectedTag, selection = selectionVersion, token = ++loadVersion;
    if (!meta || !tag) throw Error(t('Bitte ein Display mit Profil auswählen.'));
    const address = selectedBase();
    const decoded = await EPAP.decodeRaw(await rawData(), meta, Number(tag.ver || 0), (bytes, w, h) => EPAP.decodeG5(address, bytes, w, h));
    if (selection !== selectionVersion || token !== loadVersion) return;
    const canvas = document.createElement('canvas'); canvas.width = decoded.width; canvas.height = decoded.height;
    canvas.getContext('2d').putImageData(new ImageData(decoded.data, decoded.width, decoded.height), 0, 0);
    const oriented = document.createElement('canvas'); oriented.width = Number(meta.width); oriented.height = Number(meta.height);
    const ctx = oriented.getContext('2d'); ctx.translate(oriented.width / 2, oriented.height / 2); ctx.rotate(Number(meta.rotatebuffer || 0) * Math.PI / 2); ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    applyProfile(); $('rotation').value = 0; useImage(oriented, EPAP.mac(tag.mac) + '.png'); message(t('Gespeichertes AP-Bild geladen. Das ist keine Rücklesung des physischen Displays.'));
  });
  task('send', async () => {
    if (!result) throw Error(t('Bitte zuerst ein Bild vorbereiten.'));
    const address = base(), targetMAC = EPAP.mac($('mac').value);
    if (selectedTag && EPAP.mac(selectedTag.mac) === targetMAC && selectedMeta && (result.width !== Number(selectedMeta.width) || result.height !== Number(selectedMeta.height))) throw Error(t('Bildgröße passt nicht zum Display. Bitte zuerst das Profil übernehmen.'));
    const blob = jpegBlob(result);
    message(t('Sende JPEG (') + I18N.number(blob.size / 1024, 1) + t(' KiB) an ') + targetMAC + ' …');
    const upload = await EPAP.upload(address, targetMAC, blob, message, {dither:continuousOutput()?val('apDither'):0});
    message(t('AP hat den Upload angenommen') + (upload.via === 'filesystem' ? t(' · Größenlimit über Dateiverwaltung umgangen, JPEG unverändert') : '') + t('. Das Display übernimmt das Bild beim nächsten Abruf.'));
  });
  document.addEventListener('languagechange', () => {
    resetHint = t('Doppelklick: auf Standardwert zurücksetzen');
    document.querySelectorAll('input[type="range"]').forEach(range => { range.title = resetHint; });
    updateColorLegend();updateMethodGuide();populatePatternColors();drawing?.populate();
    document.querySelectorAll('#colors .swatch').forEach((node,i)=>node.title=ColorInfo.label(colors()[i]));
    schedule();
    if (!selectedTag) $('tagInfo').textContent = t('Noch kein Display ausgewählt.');
    else if (selectedMeta) updateTagInfo();
    if (!Activity.isActive('image')) message(t('Sprache geändert.'));
  });
  knownOptions(); if (known[0]) $('apAddress').value = known[0];
  if (['http:', 'https:'].includes(location.protocol) && !['localhost', '127.0.0.1'].includes(location.hostname) && !known[0]) $('apAddress').value = location.origin;
  colorProfileEditor=new ColorProfileEditor({colors,readStore,saveStore,message,download,t,onChange:()=>{updateMethodGuide();schedule();},onPreview:()=>{paintTargetPreview();updateMethodGuide();}});
  populatePresets();$('testPatternMode').onchange();
  drawing=new DrawingEditor({target,colors,onChange:updateDrawing,message,blank:()=>{},quantizeOptions:()=>({...colorProfileEditor.calculation,exactNominal:true}),preview:ctx=>{const refs=continuousOutput()?undefined:colorProfileEditor.previewColors;if(!refs&&val('targetBlur')<=0)return;const pixels={data:ctx.getImageData(0,0,target.width,target.height).data,width:target.width,height:target.height,continuous:continuousOutput()};targetPreview.paint(ctx,ColorProfiles.preview(pixels,colors(),refs,colorProfileEditor.previewReflectance),val('targetBlur'));}});
  task('drawingBlank',()=>{
    const odd=val('viewRotation')%180,w=val(odd?'height':'width'),h=val(odd?'width':'height');EP.dimensions(w,h);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);
    ++loadVersion;useImage(canvas,'Zeichenflaeche.png');$('drawingEnabled').checked=true;$('drawingVisible').checked=true;drawing.refresh();
  });
  new PreviewNavigation({canvases:[source,target],mode:()=>$('previewInteraction').value,
    editing:canvas=>canvas===source?$('cropMode').checked:drawing?.active||['native','free'].includes($('fit').value),
    nativeSize:canvas=>canvas===source&&image?{width:image.width,height:image.height}:{width:canvas.width,height:canvas.height},
    zoom:(canvas,scale)=>{const select=$(canvas===source?'zoom':'targetZoom');select.querySelectorAll('[data-navigation-zoom]').forEach(o=>o.remove());const exact=Array.from(select.options).find(o=>o.value!=='fit'&&Math.abs(Number(o.value)-scale)<.0001);if(exact)select.value=exact.value;else{const o=new Option(I18N.number(scale*100,1)+' %',String(scale));o.dataset.navigationZoom='true';select.append(o);select.value=o.value;}refreshPreviewViews();},
    cancel:()=>{drawing?.cancel();if(drag){writeCrop(drag.rect);drag=null;schedule();}placementDrag=null;updateDrawing();}
  });
  $('previewInteraction').onchange=()=>document.querySelector('.stage').classList.toggle('previewPanMode',$('previewInteraction').value==='pan');
  buttons();
})();

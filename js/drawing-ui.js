/* Independent drawing layer; pointer previews never modify the source image. */
(function(root){
 'use strict';
 class DrawingEditor{
  constructor({target,colors,onChange,message,blank,preview,quantizeOptions=()=>({})}){
   this.quantizeOptions=quantizeOptions;
   this.target=target;this.preview=preview;this.colors=colors;this.onChange=onChange;this.message=message;this.history=new DrawingLayer.History();this.state=null;this.pending=null;this.gesture=null;this.stamp=null;this.cache=null;this.loadVersion=0;this.selectedId=null;this.nextId=0;
   const $=id=>document.getElementById(id);this.$=$;
   $('drawingEnabled').onchange=()=>{if(this.active&&!this.state)this.message(I18N.t('Bitte zuerst ein Bild laden oder eine leere Zeichenfläche anlegen.'),true);this.cancel();this.refresh();onChange();};
   $('drawingVisible').onchange=()=>{this.cancel();this.refresh();onChange();};
   $('drawingColor').onchange=()=>{this.updateColorSwatch();this.editSelected({color:$('drawingColor').value});};
   $('drawingTool').onchange=()=>{this.cancel();this.refresh();onChange();};
   for(const id of ['drawingWidth','drawingSize'])$(id).oninput=()=>{$(id+'Value').value=$(id).value;};
   $('drawingWidth').onchange=()=>this.editSelected({width:Number($('drawingWidth').value)});
   $('drawingSize').onchange=()=>this.editSelected({size:Number($('drawingSize').value)});
   $('drawingText').onchange=()=>this.editSelected({text:$('drawingText').value.slice(0,1000)});
   $('drawingFont').onchange=()=>this.editSelected({font:$('drawingFont').value});
   $('drawingBold').onchange=()=>this.editSelected({bold:$('drawingBold').checked,font:$('drawingFont').value});
   $('drawingFill').onchange=()=>this.editSelected({fill:$('drawingFill').checked});
   $('drawingImageWidth').onchange=()=>{const width=Number($('drawingImageWidth').value);if(Number.isInteger(width)&&width>=1&&width<=4096)this.editSelected({imageWidth:width});};
   $('drawingObjects').onchange=()=>{this.selectedId=$('drawingObjects').value||null;$('drawingTool').value='select';$('drawingEnabled').checked=true;$('drawingVisible').checked=true;this.refresh();onChange();};
   $('drawingDelete').onclick=()=>{if(this.selected()){this.history.add({type:'delete',targetId:this.selectedId});this.selectedId=null;this.changed();}};
   $('drawingUndo').onclick=()=>{this.cancel();if(this.history.undo())this.changed();};
   $('drawingRedo').onclick=()=>{this.cancel();if(this.history.redo())this.changed();};
   $('drawingClear').onclick=()=>{this.cancel();this.history.add({type:'clear'});this.changed();};
   $('drawingBlank').onclick=blank;
   $('drawingFile').onchange=event=>this.loadImage(event.target.files[0]);
   for(const kind of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])target.addEventListener(kind,event=>this.pointer(kind,event),true);
   document.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.gesture){event.preventDefault();this.cancel();this.onChange();}});
   document.addEventListener('languagechange',()=>this.refresh());this.populate();this.refresh();
   for(const option of $('drawingFont').options)option.style.fontFamily=DrawingLayer.fontFamily(option.value);
  }
  get active(){return this.$('drawingEnabled').checked&&this.$('drawingVisible').checked;}
  get visible(){return this.$('drawingVisible').checked;}
  populate(){const select=this.$('drawingColor'),previous=select.value;select.replaceChildren(...this.colors().map(color=>new Option(ColorInfo.label(color),color)));select.value=this.colors().includes(previous)?previous:ColorInfo.extremes(this.colors()).dark;this.cache=null;this.updateColorSwatch();}
  updateColorSwatch(){const color=this.$('drawingColor').value,swatch=this.$('drawingColorSwatch');swatch.style.backgroundColor=color;swatch.title=ColorInfo.label(color);}
  refresh(){
   const $=this.$,tool=$('drawingTool').value;
   const selected=this.selected();if(!selected)this.selectedId=null;
   $('drawingTextOptions').hidden=tool!=='text'&&!(tool==='select'&&selected?.type==='text');$('drawingImageOptions').hidden=tool!=='image'&&!(tool==='select'&&selected?.type==='image');
   this.refreshSelection();
   $('drawingUndo').disabled=this.history.position===0;$('drawingRedo').disabled=this.history.position===this.history.items.length;$('drawingClear').disabled=this.history.position===0;
   $('drawingCount').textContent=I18N.t('{count} Zeichenschritte',{count:this.history.position});
   this.target.style.cursor=this.active?'crosshair':['native','free'].includes($('fit').value)?'move':'';
  }
  changed(){this.cache=null;this.refresh();this.onChange();}
  sync(base,w,h,rotation){
   if(this.state&&(this.state.w!==w||this.state.h!==h||this.state.rotation!==rotation))this.cancel();
   this.state={base,w,h,rotation};
  }
  invalidate(){this.cancel();this.state=null;}
  raster(w,h){
   if(!this.visible||!this.history.position)return null;
   const options=this.quantizeOptions(),key=JSON.stringify([w,h,this.history.version,this.colors(),options]);if(this.cache?.key===key)return this.cache.pixels;
   const canvas=DrawingLayer.render(w,h,this.history.operations),data=canvas.getContext('2d').getImageData(0,0,w,h).data;
   for(let i=3;i<data.length;i+=4)data[i]=data[i]>=128?255:0;
   const pixels=EP.quantize(data,w,h,this.colors(),{...options,dither:'none'});this.cache={key,pixels};return pixels;
  }
  point(event){const r=this.target.getBoundingClientRect();const x=Math.max(0,Math.min(this.target.width-1,Math.floor((event.clientX-r.left)*this.target.width/r.width)))+.5,y=Math.max(0,Math.min(this.target.height-1,Math.floor((event.clientY-r.top)*this.target.height/r.height)))+.5;return {x,y};}
  operation(point){
   const $=this.$,s=this.state,type=$('drawingTool').value;
   const op={id:String(++this.nextId),type,a:DrawingLayer.nativePoint(point,s.w,s.h,s.rotation),b:DrawingLayer.nativePoint(point,s.w,s.h,s.rotation),color:$('drawingColor').value,width:Number($('drawingWidth').value),fill:$('drawingFill').checked,rotation:s.rotation};
   if(type==='text')Object.assign(op,{text:$('drawingText').value.slice(0,1000),size:Number($('drawingSize').value),bold:$('drawingBold').checked,font:$('drawingFont').value});
   if(type==='image')Object.assign(op,{image:this.stamp,imageWidth:Number($('drawingImageWidth').value),smooth:$('drawingSmooth').checked});
   if(type==='eraser')op.points=[op.a];return op;
  }
  pointer(kind,event){
   if(!this.active&&!this.gesture)return;
   if(kind==='pointerdown'){
    if(event.button!==0||!this.state||this.gesture)return;event.preventDefault();event.stopImmediatePropagation();
    if(this.$('drawingTool').value==='select'){this.beginSelection(event);return;}
    this.selectedId=null;const start=this.point(event),op=this.operation(start);
    if(op.type==='image'&&!op.image){this.message(I18N.t('Bitte zuerst ein Bild für die Zeichenebene öffnen.'),true);return;}
    if(op.type==='text'&&!op.text.trim()){this.message(I18N.t('Bitte einen Text eingeben.'),true);return;}
    if(op.type==='image'&&(!Number.isInteger(op.imageWidth)||op.imageWidth<1||op.imageWidth>4096)){this.message(I18N.t('Bildbreite: 1–4096 Pixel.'),true);return;}
    this.gesture={id:event.pointerId,start};this.pending=op;this.target.setPointerCapture(event.pointerId);this.paint();
   }else if(this.gesture&&event.pointerId===this.gesture.id){
    event.preventDefault();event.stopImmediatePropagation();
    if(this.gesture.edit){this.updateSelection(kind,event);return;}
    if(kind==='pointermove'||kind==='pointerup'){
     let point=this.point(event);const op=this.pending;
     if(op.type==='square'||(['rectangle','ellipse'].includes(op.type)&&(event.shiftKey||event.altKey||this.$('drawingAspect').checked))){const dx=point.x-this.gesture.start.x,dy=point.y-this.gesture.start.y,side=Math.max(Math.abs(dx),Math.abs(dy));point={x:this.gesture.start.x+Math.sign(dx||1)*side,y:this.gesture.start.y+Math.sign(dy||1)*side};}
     op.b=DrawingLayer.nativePoint(point,this.state.w,this.state.h,this.state.rotation);
     if(op.type==='eraser'&&op.points.length<20000)op.points.push(op.b);
     this.paint();
     if(kind==='pointerup'){this.history.add(op);this.selectedId=op.type==='eraser'?null:op.id;this.cancel();this.changed();}
    }else if(kind==='pointercancel'||kind==='lostpointercapture'){this.cancel();this.onChange();}
   }
  }
  cancel(){const id=this.gesture?.id;this.pending=null;this.gesture=null;if(id!==undefined&&this.target.hasPointerCapture(id))this.target.releasePointerCapture(id);}
  paint(){
   if(!this.state)return;const {base,w,h,rotation}=this.state,ctx=this.target.getContext('2d');ctx.putImageData(new ImageData(base.data,base.width,base.height),0,0);
   if(this.visible){const canvas=DrawingLayer.render(w,h,this.history.operations.concat(this.pending?[this.pending]:[]));ctx.save();ctx.translate(base.width/2,base.height/2);ctx.rotate(rotation*Math.PI/180);ctx.drawImage(canvas,-w/2,-h/2);ctx.restore();}
   this.preview?.(ctx);this.decorate();
  }
  selected(preview=false){return DrawingLayer.objects(this.history.operations.concat(preview&&this.pending?[this.pending]:[])).find(op=>op.id===this.selectedId&&op.type!=='eraser')||null;}
  refreshSelection(){
   const $=this.$,selected=this.selected(),items=DrawingLayer.objects(this.history.operations).filter(op=>op.type!=='eraser'),names={line:'Linie',rectangle:'Rechteck',square:'Quadrat',circle:'Kreis',ellipse:'Ellipse',text:'Text',image:'Bild einfügen'};
   $('drawingObjects').replaceChildren(new Option(I18N.t('Kein Element ausgewählt'),''),...items.map((op,i)=>new Option((i+1)+': '+I18N.t(names[op.type]||op.type)+(op.type==='text'?' · '+op.text.replace(/\n/g,' ').slice(0,30):''),op.id)));
   $('drawingObjects').value=this.selectedId||'';$('drawingDelete').disabled=!selected;
   if(selected&&$('drawingTool').value==='select'){
    if(this.colors().includes(selected.color))$('drawingColor').value=selected.color;this.updateColorSwatch();
    $('drawingWidth').value=selected.width||1;$('drawingWidthValue').value=$('drawingWidth').value;$('drawingFill').checked=!!selected.fill;
    if(selected.type==='text'){$('drawingText').value=selected.text;$('drawingSize').value=selected.size;$('drawingSizeValue').value=selected.size;$('drawingBold').checked=!!selected.bold;$('drawingFont').value=Object.hasOwn(DrawingLayer.fonts,selected.font)?selected.font:'sans';}
    if(selected.type==='image')$('drawingImageWidth').value=selected.imageWidth;
   }
  }
  editSelected(patch){if(this.$('drawingTool').value!=='select'||!this.selected())return;this.cancel();this.history.add({type:'edit',targetId:this.selectedId,patch});this.changed();}
  viewBox(object){const s=this.state;return DrawingLayer.mapBox(DrawingLayer.box(object),p=>DrawingLayer.viewPoint(p,s.w,s.h,s.rotation));}
  decorate(){
   if(!this.active||this.$('drawingTool').value!=='select'||!this.state)return;const object=this.selected(true);if(!object)return;
   const b=this.viewBox(object),ctx=this.target.getContext('2d'),ratio=this.target.width/Math.max(1,this.target.getBoundingClientRect().width),size=7*ratio;
   ctx.save();ctx.strokeStyle='#2466b4';ctx.lineWidth=ratio;ctx.setLineDash([4*ratio,3*ratio]);ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.setLineDash([]);
   for(const [x,y]of [[b.x,b.y],[b.x+b.w,b.y],[b.x,b.y+b.h],[b.x+b.w,b.y+b.h]]){ctx.fillStyle='#ffffff';ctx.fillRect(x-size/2,y-size/2,size,size);ctx.strokeRect(x-size/2,y-size/2,size,size);}
   ctx.restore();
  }
  beginSelection(event){
   const p=this.point(event),selected=this.selected(),s=this.state;let handle=null;
   if(selected){const b=this.viewBox(selected),tolerance=9*this.target.width/Math.max(1,this.target.getBoundingClientRect().width);for(const [key,x,y]of [['nw',b.x,b.y],['ne',b.x+b.w,b.y],['sw',b.x,b.y+b.h],['se',b.x+b.w,b.y+b.h]])if(Math.hypot(p.x-x,p.y-y)<=tolerance){handle=key;break;}}
   let object=selected;
   if(!handle){const point=DrawingLayer.nativePoint(p,s.w,s.h,s.rotation);object=DrawingLayer.objects(this.history.operations).slice().reverse().find(op=>{const b=DrawingLayer.box(op);return b&&point.x>=b.x-2&&point.y>=b.y-2&&point.x<=b.x+b.w+2&&point.y<=b.y+b.h+2;});this.selectedId=object?.id||null;}
   this.refresh();
   if(!object){this.onChange();return;}
   this.gesture={id:event.pointerId,edit:true,object,start:p,handle,box:this.viewBox(object),nativeBox:DrawingLayer.box(object),moved:false};this.target.setPointerCapture(event.pointerId);this.paint();
  }
  updateSelection(kind,event){
   if(kind==='pointercancel'||kind==='lostpointercapture'){this.cancel();this.onChange();return;}
   if(kind!=='pointermove'&&kind!=='pointerup')return;
   const g=this.gesture,p=this.point(event),s=this.state;let next;
   g.moved=g.moved||Math.hypot(p.x-g.start.x,p.y-g.start.y)>=1;
   if(!g.handle){const a=DrawingLayer.nativePoint(g.start,s.w,s.h,s.rotation),b=DrawingLayer.nativePoint(p,s.w,s.h,s.rotation);next=DrawingLayer.shift(g.object,b.x-a.x,b.y-a.y);}
   else{
    const left=g.handle.includes('w'),top=g.handle.includes('n'),anchor={x:left?g.box.x+g.box.w:g.box.x,y:top?g.box.y+g.box.h:g.box.y};
    let width=Math.max(2,(p.x-anchor.x)*(left?-1:1)),height=Math.max(2,(p.y-anchor.y)*(top?-1:1));
    if(event.altKey&&['rectangle','ellipse'].includes(g.object.type)){width=height=Math.max(width,height);}
    else if(['circle','square','image','text'].includes(g.object.type)||event.shiftKey||this.$('drawingAspect').checked){const scale=Math.max(width/g.box.w,height/g.box.h);width=g.box.w*scale;height=g.box.h*scale;}
    const view={x:left?anchor.x-width:anchor.x,y:top?anchor.y-height:anchor.y,w:width,h:height},native=DrawingLayer.mapBox(view,p=>DrawingLayer.nativePoint(p,s.w,s.h,s.rotation));
    next=DrawingLayer.transform(g.object,g.nativeBox,native);
   }
   this.pending={type:'edit',targetId:this.selectedId,patch:next};this.paint();
   if(kind==='pointerup'){const edit=this.pending,moved=g.moved;this.cancel();if(moved)this.history.add(edit);this.changed();}
  }
  async loadImage(file,{place=false}={}){
   if(!file)return;const token=++this.loadVersion,url=URL.createObjectURL(file),activity=Activity.begin('image',I18N.t('Bild für Zeichenebene wird geladen …'));
   try{const img=new Image();img.src=url;await img.decode();if(token!==this.loadVersion)return;
    if(img.width*img.height>4000000)throw Error(I18N.t('Eingefügte Bilder dürfen höchstens 4 Millionen Pixel haben.'));
    const previous=this.history.items.filter(op=>op.type==='image').map(op=>op.image);const unique=new Set(previous);unique.add(img);
    if([...unique].reduce((sum,image)=>sum+image.width*image.height,0)>12000000)throw Error(I18N.t('Zu viele eingefügte Bilddaten in dieser Sitzung.'));
    this.selectedId=null;this.stamp=img;this.$('drawingImageName').removeAttribute('data-i18n');this.$('drawingImageName').textContent=file.name;this.$('drawingImageWidth').value=Math.min(img.width,this.state?.base.width||200);this.$('drawingTool').value='image';this.$('drawingEnabled').checked=true;this.$('drawingVisible').checked=true;this.refresh();
    if(place&&this.state){
      const view=this.state.base,width=Math.max(1,Math.floor(Math.min(img.width,view.width,view.height*img.width/img.height)));
      this.$('drawingImageWidth').value=width;
      const op=this.operation({x:Math.floor((view.width-width)/2),y:Math.floor((view.height-width*img.height/img.width)/2)});
      this.history.add(op);this.selectedId=op.id;this.$('drawingTool').value='select';this.changed();this.message(I18N.t('Bild aus Zwischenablage als Element eingefügt.'));
    }else this.message(I18N.t('Bild bereit. Zum Einfügen in die Zielvorschau klicken.'));
    await Activity.nextPaint();
   }catch(error){if(token===this.loadVersion)this.message(error.message||I18N.t('Bild konnte nicht geladen werden.'),true);}
   finally{URL.revokeObjectURL(url);Activity.end(activity);this.$('drawingFile').value='';}
  }
 }
 root.DrawingEditor=DrawingEditor;
})(window);

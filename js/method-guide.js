/* Locally generated data-URL examples, using the actual conversion functions. */
(function(root){
 'use strict';
 function render(container,colors,t){
  container.replaceChildren();const source=document.createElement('canvas');source.width=480;source.height=270;const c=source.getContext('2d');c.fillStyle='white';c.fillRect(0,0,480,270);
  const accent=colors.find(x=>!['#ffffff','#000000'].includes(x))||'#000000';
  for(const [x,a,b]of [[12,'#000000','#ffffff'],[250,'#ffffff',accent]]){const gradient=c.createLinearGradient(x,0,x+210,0);gradient.addColorStop(0,a);gradient.addColorStop(1,b);c.fillStyle=gradient;c.fillRect(x,15,210,120);}
  c.fillStyle='#40b0c0';c.fillRect(320,190,140,55);
  c.strokeStyle='black';c.lineWidth=2;c.beginPath();c.moveTo(15,205);c.lineTo(460,140);c.stroke();c.fillStyle='black';c.font='24px sans-serif';c.fillText('Aa 0123 · Test',15,250);
  const image=(data,w,h)=>{const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').putImageData(new ImageData(data,w,h),0,0);return canvas;};
  const shrink=canvas=>{const out=document.createElement('canvas');out.width=160;out.height=90;const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(canvas,0,0,160,90);return ctx.getImageData(0,0,160,90).data;};
  const input=shrink(source),grid=document.createElement('div');grid.className='methodExampleGrid';container.append(grid);
  function card(label,description,pixels){const figure=document.createElement('figure'),img=new Image(),caption=document.createElement('figcaption'),name=document.createElement('b'),detail=document.createElement('p');name.textContent=t(label);caption.append(name);detail.textContent=t(description);detail.className='hint';img.src=image(pixels,160,90).toDataURL('image/png');img.alt=t(label);img.width=160;img.height=90;figure.append(caption,img,detail);grid.append(figure);}
  for(const [mode,label,description]of [
   ['none','Ohne Dithering','Jeder Bildpunkt wird einer reinen Palettenfarbe zugeordnet.'],
   ['floyd','Floyd–Steinberg','Fehlerverteilung erzeugt feine, unregelmäßige Mischmuster.'],
   ['ordered','Bayer 4 × 4','Regelmäßiges Raster mit abgestuften Farbanteilen.'],
   ['fixed','Feste Mischfarben','Nur reine Farben und feste 1:1-Zweiermischungen in diesem Beispiel.'],
   ['rgb','RGB-Farbstufen','Zwischenfarben bleiben für die spätere Verarbeitung erhalten.'],
   ['gamut','Palettenfarbraum','Verläufe bleiben erhalten, begrenzt auf Mischfarben der Palette.']])card(label,description,EP.quantize(input,160,90,colors,{dither:mode,strength:1,mixColors:2}).data);
  const options={dark:50,text:50,smooth:35},prepared=Illustration.prepare(c.getImageData(0,0,480,270).data,480,270,colors,options),base=EP.quantize(input,160,90,colors,{dither:'fixed',mixColors:2});
  card('Konturenschutz aus','Dünne schwarze Striche werden wie Farbflächen konvertiert.',base.data);
  const processed=EP.quantize(shrink(image(prepared.data,480,270)),160,90,colors,{dither:'fixed',mixColors:2});card('Konturen und Text geschützt','Originalstriche werden getrennt verkleinert und rein ausgegeben.',Illustration.apply(processed,Illustration.resizeMasks(prepared,160,90,0,0,160,90),colors,options).data);
 }
 root.MethodGuide={render};
})(window);

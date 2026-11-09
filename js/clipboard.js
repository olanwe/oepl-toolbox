/* Clipboard images only; plain text/HTML and URLs are never fetched or imported. */
(function(root){
 'use strict';
 const types=['image/png','image/jpeg','image/webp','image/bmp','image/x-ms-bmp','image/gif','image/avif'];
 const t=key=>root.I18N?root.I18N.t(key):key;
 function supported(file){return file&&(types.includes(String(file.type).toLowerCase())||(!file.type&&/\.(?:png|jpe?g|webp|bmp|gif|avif)$/i.test(file.name||'')));}
 function normalize(file){if(file.name)return file;const extension={'image/jpeg':'jpg','image/x-ms-bmp':'bmp'}[file.type]||file.type.split('/')[1]||'png';return new File([file],t('Zwischenablage')+'.'+extension,{type:file.type});}
 function fromTransfer(data){
  if(!data)return null;
  for(const item of Array.from(data.items||[])){if(item.kind!=='file')continue;const file=item.getAsFile?.();if(supported(file))return normalize(file);}
  for(const file of Array.from(data.files||[]))if(supported(file))return normalize(file);
  return null;
 }
 function textTarget(target){
  if(target?.isContentEditable||target?.closest?.('textarea'))return true;
  const input=target?.closest?.('input');return !!input&&!/^(?:checkbox|radio|button|submit|reset|file|range|color|image)$/i.test(input.type);
 }
 async function readImage(){
  if(!root.navigator?.clipboard?.read)throw Error(t('Direktes Einfügen ist hier nicht verfügbar. Bitte Strg+V oder Cmd+V verwenden.'));
  let items;try{items=await root.navigator.clipboard.read();}catch{throw Error(t('Kein Zugriff auf die Zwischenablage. Bitte Strg+V oder Cmd+V verwenden.'));}
  for(const type of types)for(const item of items)if(item.types.includes(type))return normalize(await item.getType(type));
  throw Error(t('Die Zwischenablage enthält kein unterstütztes Bild. Bitte ein Bild oder einen Screenshot kopieren.'));
 }
 root.ClipboardImage={fromTransfer,textTarget,readImage,supported};if(typeof module!=='undefined')module.exports=root.ClipboardImage;
})(globalThis);

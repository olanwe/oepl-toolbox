/* Pure image operations, shared by the browser and the regression tests. */
(function (root) {
  'use strict';
  const kernel=root.OEPLImage || (typeof module!=='undefined'?require('./image-converter.js'):null);
  const {palettes,rgb,rgbToLab,dimensions,quantize}=kernel;
  const t = (key, values) => root.I18N ? root.I18N.t(key, values) : key;
  function cropImage(image, rect) {
    const {x,y,w,h} = rect;
    if (![x,y,w,h].every(Number.isInteger) || x<0 || y<0 || w<1 || h<1 || x+w>image.width || y+h>image.height)
      throw Error(t('Ungültiger Bildausschnitt.'));
    if (!x && !y && w===image.width && h===image.height) return image;
    const data = new Uint8ClampedArray(w*h*4), indices = new Uint8Array(w*h);
    for (let row=0;row<h;row++) {
      const start=(y+row)*image.width+x;
      data.set(image.data.subarray(start*4,(start+w)*4),row*w*4);
      indices.set(image.indices.subarray(start,start+w),row*w);
    }
    return {...image,data,indices,width:w,height:h};
  }
  function fontColors(colors){const white=colors.findIndex(c=>c.toLowerCase()==='#ffffff');return colors.map((color,paletteIndex)=>({color,paletteIndex})).filter(m=>m.paletteIndex!==white).concat(white<0?[]:[{color:colors[white],paletteIndex:white}]);}
  function vlw(image, colors, patch = false, includeAlpha = true) {
    if(image.continuous)throw Error(t('VLW benötigt feste Palettenfarben. Bitte einen quantisierten Ausgabemodus wählen.'));
    const {width: w, height: h, indices} = image;
    const mapping = fontColors(colors);
    mapping.forEach((m, i) => { m.char = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]; });
    const planes = mapping.map(m => Uint8Array.from(indices, (v, p) => v === m.paletteIndex ? image.data[p * 4 + 3] : 0));
    let order = planes.map((_, i) => i), patched = false;
    if (patch && planes.length > 1) {
      if (image.data.some((v, i) => i % 4 === 3 && v > 0 && v < 255)) throw Error(t('Der x-Position-0-Patch benötigt harte Transparenz (Alpha 0 oder 255).'));
      let left = w, anchor = -1;
      for (let p = 0; p < indices.length; p++) if (image.data[p * 4 + 3] && p % w < left) { left = p % w; anchor = p; }
      if (anchor >= 0) {
        const owner = mapping.findIndex(m => m.paletteIndex === indices[anchor]);
        planes.forEach((plane, i) => { if (i !== owner && plane.some(v => v) && !plane.some((v, p) => v && p % w === left)) { plane[anchor] = 255; patched = true; } });
        order = order.filter(i => i !== owner).concat(owner);
      }
    }
    if (includeAlpha) {
      mapping.push({color: null, char: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[mapping.length], mask: true});
      planes.push(Uint8Array.from(indices, (_, p) => image.data[p * 4 + 3]));
    }
    const crops = planes.map(plane => {
      let l = w, t = h, r = -1, b = -1;
      plane.forEach((v, p) => { if (v) { l = Math.min(l, p % w); r = Math.max(r, p % w); t = Math.min(t, Math.floor(p / w)); b = Math.max(b, Math.floor(p / w)); } });
      if (r < 0) return {l: 0, t: 0, w: 0, h: 0, data: new Uint8Array()};
      const data = new Uint8Array((r - l + 1) * (b - t + 1));
      for (let y = t; y <= b; y++) data.set(plane.subarray(y * w + l, y * w + r + 1), (y - t) * (r - l + 1));
      return {l, t, w: r - l + 1, h: b - t + 1, data};
    });
    const bytes = new Uint8Array(24 + 28 * planes.length + crops.reduce((n, c) => n + c.data.length, 0) + 17);
    const view = new DataView(bytes.buffer); let pos = 0;
    const int = n => { view.setInt32(pos, n); pos += 4; };
    [planes.length, 11, h, 0, h, 0].forEach(int);
    crops.forEach((c, i) => [mapping[i].char.charCodeAt(0), c.h, c.w, w, h - c.t, c.l, 0].forEach(int));
    crops.forEach(c => { bytes.set(c.data, pos); pos += c.data.length; });
    // Processing VLW v11: two Java writeUTF names followed by smooth boolean.
    bytes.set([0, 5, 73, 109, 97, 103, 101, 0, 5, 73, 109, 97, 103, 101, 0], pos);
    return {bytes: bytes.slice(0, pos + 15), mapping, order, patched, oversized: crops.some(c => c.w > 255 || c.h > 255)};
  }
  function rotate(image, degrees) {
    const turns = ((degrees / 90) % 4 + 4) % 4;
    if (!Number.isInteger(turns)) throw Error(t('Drehung muss ein Vielfaches von 90° sein.'));
    const width = turns % 2 ? image.height : image.width, height = turns % 2 ? image.width : image.height;
    const data = new Uint8ClampedArray(image.data.length), indices = image.indices ? new Uint8Array(width * height) : undefined;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const dx = turns === 1 ? image.height - 1 - y : turns === 2 ? image.width - 1 - x : turns === 3 ? y : x;
      const dy = turns === 1 ? x : turns === 2 ? image.height - 1 - y : turns === 3 ? image.width - 1 - x : y;
      const from = y * image.width + x, to = dy * width + dx;
      data.set(image.data.subarray(from * 4, from * 4 + 4), to * 4);
      if (indices) indices[to] = image.indices[from];
    }
    return {...image, data, indices, width, height};
  }
  function invert(image, colors) {
    if(image.continuous){
      const data=new Uint8ClampedArray(image.data);
      for(let p=0;p<data.length;p+=4)for(let k=0;k<3;k++)data[p+k]=255-data[p+k];
      return {...image,data};
    }
    const white = colors.findIndex(c => c.toLowerCase() === '#ffffff'), black = colors.findIndex(c => c.toLowerCase() === '#000000');
    if (white < 0 || black < 0) throw Error(t('Invertieren benötigt Weiß und Schwarz in der Palette.'));
    const data = new Uint8ClampedArray(image.data), indices = new Uint8Array(image.indices);
    indices.forEach((v, p) => {
      const next = v === white ? black : v === black ? white : v; indices[p] = next;
      data.set(rgb(colors[next]), p * 4);
    });
    return {...image, data, indices};
  }
  function template(font, path, x = 1, y = 0) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 32767 || Math.abs(y) > 32767) throw Error(t('Position muss ganzzahlig zwischen −32767 und 32767 liegen.'));
    if (!/^\/fonts\/[A-Za-z0-9._-]+\.vlw(?:\.gz)?$/i.test(path)) throw Error(t('VLW-Pfad muss /fonts/DATEI.vlw oder /fonts/DATEI.vlw.gz entsprechen.'));
    const logicalPath=path.replace(/\.gz$/i,'');
    return font.order.filter(i => !font.mapping[i].mask).map(i => ({text: [x, y, font.mapping[i].char, logicalPath, font.mapping[i].color, 0, 0]}));
  }
  function readVlw(buffer, colors, metadata = null) {
    const bytes = new Uint8Array(buffer), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    if (bytes.length < 24) throw Error(t('VLW-Datei ist zu kurz.'));
    const count = view.getInt32(0), version = view.getInt32(4), height = view.getInt32(8), ascent = view.getInt32(16);
    if (version !== 11 || count < 1 || count > 18 || 24 + count * 28 > bytes.length) throw Error(t('Kein unterstützter img2vlw-Bildfont (VLW v11).'));
    const width = view.getInt32(36); dimensions(width, height);
    const palette = fontColors(colors).map(m=>m.color);
    const fallback = palette.map((color, i) => ({char: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i], color}));
    fallback.push({char: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'[palette.length], mask: true});
    const mapping = metadata?.layers || fallback, order = metadata?.drawOrder || mapping.filter(m => !m.mask).map(m => m.char);
    const layers = new Map(); let pos = 24 + count * 28;
    for (let i = 0; i < count; i++) {
      const at = 24 + i * 28, char = String.fromCharCode(view.getInt32(at)), h = view.getInt32(at + 4), w = view.getInt32(at + 8), top = ascent - view.getInt32(at + 16), left = view.getInt32(at + 20);
      if (![w,h,top,left].every(Number.isInteger) || w < 0 || h < 0 || top < 0 || left < 0 || left + w > width || top + h > height || pos + w * h > bytes.length || !mapping.some(m => m.char === char)) throw Error(t('VLW-Ebene oder Farbzuordnung ist ungültig.'));
      layers.set(char, {w,h,top,left,bytes:bytes.subarray(pos,pos+w*h)}); pos += w*h;
    }
    const data = new Uint8ClampedArray(width * height * 4);
    for (const char of order) {
      const m = mapping.find(m => m.char === char), layer = layers.get(char);
      if (!layer || !m || m.mask) continue;
      if (!/^#[0-9a-f]{6}$/i.test(m.color)) throw Error(t('Ungültige VLW-Farbe im Ebenenplan.'));
      const color = rgb(m.color);
      layer.bytes.forEach((alpha,p) => { if (alpha) data.set([...color,alpha], ((layer.top + Math.floor(p/layer.w)) * width + layer.left + p%layer.w)*4); });
    }
    return {data,width,height};
  }
  root.EP = {palettes, rgb, rgbToLab, dimensions, quantize, cropImage, vlw, rotate, invert, template, readVlw};
  if (typeof module !== 'undefined') module.exports = root.EP;
})(globalThis);

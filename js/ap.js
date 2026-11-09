(function (root) {
  'use strict';
  const t = (key, values) => root.I18N ? root.I18N.t(key, values) : key;
  function normalize(value) {
    const url = new URL(value.includes('://') ? value : 'http://' + value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw Error(t('Bitte eine HTTP(S)-Adresse ohne Zugangsdaten eingeben.'));
    return url.origin;
  }
  async function request(base, path, options = {}) {
    const {timeoutMs = 12000, ...fetchOptions} = options;
    const response = await fetch(normalize(base) + path, {...fetchOptions, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store'});
    if (!response.ok) { const detail = (await response.text()).slice(0,180); const error = new Error(t('AP antwortet mit HTTP ') + response.status + (detail ? ': ' + detail : '')); error.status = response.status; throw error; }
    return response;
  }
  async function tags(base) {
    let pos = 0; const result = [], seen = new Set();
    for (let page = 0; page < 256; page++) {
      const data = await (await request(base, '/get_db?pos=' + pos)).json();
      if (!Array.isArray(data.tags)) throw Error(t('Keine OEPL-Displayliste erhalten.'));
      result.push(...data.tags);
      if (!data.continu || data.continu <= pos) return result;
      if (seen.has(data.continu)) throw Error(t('Ungültige AP-Seitenfolge.'));
      seen.add(data.continu); pos = data.continu;
    }
    throw Error(t('AP-Displayliste zu umfangreich.'));
  }
  async function type(base, hw) {
    if (!Number.isInteger(Number(hw)) || Number(hw) < 0) throw Error(t('Unbekannter Displaytyp.'));
    return (await request(base, '/tagtypes/' + Number(hw).toString(16).padStart(2, '0').toUpperCase() + '.json')).json();
  }
  const mac = value => {
    const clean = value.replace(/[:-]/g, '').toUpperCase();
    if (!/^(?:[0-9A-F]{12}|[0-9A-F]{16})$/.test(clean)) throw Error(t('Display-MAC muss 12 oder 16 Hex-Zeichen enthalten.'));
    return clean;
  };
  async function upload(base, target, blob, onProgress = () => {}, options = {}) {
    const dither=String(options.dither ?? 0);
    if(!['0','1','2'].includes(dither))throw Error(t('Ungültige AP-Dithering-Auswahl.'));
    const body = new FormData();
    body.append('mac', mac(target)); body.append('dither', dither); body.append('contentmode', '22'); body.append('file', blob, 'image.jpg');
    try {
      await request(base, '/imgupload', {method: 'POST', body, timeoutMs: 120000});
      return {via: 'direct'};
    } catch (error) {
      if (error.status !== 413) throw error;
    }
    onProgress(t('Der AP lehnt die Uploadgröße ab (HTTP 413). Übertrage dasselbe JPEG unverändert über die Dateiverwaltung; das kann länger dauern …'));
    const token = root.crypto?.randomUUID ? root.crypto.randomUUID().replace(/-/g, '').slice(0,16) : Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const path = '/images/i2v-' + token + '.jpg';
    try {
      await putFile(base, path, blob);
      onProgress(t('JPEG geprüft. Aktiviere das Bild auf dem AP …'));
      const config = new FormData(); config.append('mac', mac(target)); config.append('contentmode', '22');
      config.append('modecfgjson', JSON.stringify({filename: path, timetolive: '0', dither, delete: '1', preload: '0', preload_lut: '0', preload_type: '0'}));
      const reply = await (await request(base, '/save_cfg', {method: 'POST', body: config})).text();
      if (!/^ok(?:\b|,)/i.test(reply.trim())) throw Error(t('AP hat den Bildauftrag nicht bestätigt: ') + reply.slice(0,180));
      return {via: 'filesystem', path};
    } catch (error) {
      throw Error(t('Direktupload zu groß (HTTP 413); Ausweichweg fehlgeschlagen: ') + error.message + t(' Falls bereits angelegt, liegt die Datei unter ') + path + '.');
    }
  }
  function filePath(value) {
    if (typeof value !== 'string' || !value.startsWith('/') || value.includes('\\') || /[\x00-\x1f?#]/.test(value) || value.split('/').some(p => p === '..' || p === '.') || value.includes('//')) throw Error(t('Ungültiger absoluter AP-Dateipfad.'));
    return value;
  }
  async function files(base, directory = '/') {
    const data = await (await request(base, '/edit?list=' + encodeURIComponent(filePath(directory)))).json();
    if (!Array.isArray(data)) throw Error(t('Keine gültige AP-Dateiliste erhalten.'));
    return data.filter(entry => entry && ['file','dir'].includes(entry.type) && typeof entry.name === 'string');
  }
  async function getFile(base, path) {
    return request(base, '/edit?download=' + encodeURIComponent(filePath(path).slice(1)), {timeoutMs: 120000});
  }
  function writablePath(path) {
    filePath(path);
    if (!/^\/(?:fonts|images)\/[A-Za-z0-9._-]+\.(?:vlw(?:\.gz)?|jpg|jpeg|png|json)$/i.test(path)) throw Error(t('Ablage nur als Bild/Font unter /images oder /fonts mit einfachem Dateinamen möglich.'));
    if (path.split('/').at(-1).length > 31) throw Error(t('AP-Dateiname darf höchstens 31 Zeichen haben, einschließlich Endung. Für VLW auch Platz für .layers.json lassen.'));
    return path;
  }
  async function putFile(base, path, blob, overwrite = false) {
    writablePath(path);
    const slash = path.lastIndexOf('/'), dir = path.slice(0,slash), name = path.slice(slash+1);
    const listing = await files(base,dir);
    if (!overwrite && listing.some(file => file.type === 'file' && file.name.split('/').at(-1) === name)) throw Error(t('Datei existiert bereits: ') + path + t('. Neuen Namen wählen oder Überschreiben aktivieren.'));
    const body = new FormData(); body.append('path', path); body.append('file', blob, name);
    await request(base, '/littlefs_put', {method:'POST', body, timeoutMs: 120000});
    const stored = new Uint8Array(await (await getFile(base,path)).arrayBuffer()), expected = new Uint8Array(await blob.arrayBuffer());
    if (stored.length !== expected.length || stored.some((v,i) => v !== expected[i])) throw Error(t('Die gespeicherte Datei stimmt nicht mit dem Upload überein: ') + path);
  }
  async function sendTemplate(base, target, template) {
    if (!Array.isArray(template) || !template.length) throw Error(t('Leeres Template.'));
    const body = new FormData(); body.append('mac',mac(target)); body.append('json',JSON.stringify(template));
    await request(base,'/jsonupload',{method:'POST',body});
  }
  async function sendLED(base,target,pattern) {
    if(!/^[0-9a-f]{24}$/i.test(pattern)||![0,1].includes(parseInt(pattern.slice(0,2),16)&15)||pattern.slice(-2)!=='00') throw Error(t('Ungültiges 12-Byte-LED-Muster.'));
    return (await request(base,'/led_flash?mac='+mac(target)+'&pattern='+pattern.toUpperCase())).text();
  }
  async function decodeG5(base, bytes, width, height) {
    // Use the decoder already supplied by the user's AP, isolated in a short-lived
    // worker. No third-party Group5 code is redistributed with this application.
    const scriptURL = normalize(base) + '/g5decoder.js';
    const code = `importScripts(${JSON.stringify(scriptURL)});\nself.onmessage = e => { try { const r = processG5(new Uint8Array(e.data.bytes), e.data.width, e.data.height); if (!r) throw Error(${JSON.stringify(t('Group5-Dekodierung fehlgeschlagen.'))}); self.postMessage({bytes:r}, [r.buffer]); } catch(error) { self.postMessage({error:error.message}); } };`;
    const url = URL.createObjectURL(new Blob([code], {type: 'application/javascript'}));
    const worker = new Worker(url);
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error(t('Group5-Decoder des APs antwortet nicht.'))), 12000);
        worker.onmessage = event => { clearTimeout(timer); event.data.error ? reject(Error(event.data.error)) : resolve(new Uint8Array(event.data.bytes)); };
        worker.onerror = () => { clearTimeout(timer); reject(Error(t('Group5-Decoder konnte nicht vom AP geladen werden. RAW-Download bleibt verfügbar.'))); };
        worker.postMessage({bytes, width, height});
      });
    } finally { worker.terminate(); URL.revokeObjectURL(url); }
  }
  async function decodeRaw(buffer, meta, version = 0, group5Decoder = null) {
    const threshold = value => parseInt(value || '0', 16);
    let data = new Uint8Array(buffer);
    const zlibHeader = data.length >= 6 && (data[4] & 15) === 8 && ((data[4] << 8) | data[5]) % 31 === 0;
    if (threshold(meta.zlib_compression) && version >= threshold(meta.zlib_compression) && zlibHeader) {
      if (typeof DecompressionStream === 'undefined') throw Error(t('Dieser Browser unterstützt keine zlib-Dekompression.'));
      const stream = new Blob([data.slice(4)]).stream().pipeThrough(new DecompressionStream('deflate'));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
      if (data[0] < 6 || data[0] > data.length) throw Error(t('Ungültiger zlib-Bildheader.'));
      data = data.slice(data[0]);
    }
    if (threshold(meta.g5_compression) && version >= threshold(meta.g5_compression)) {
      const headerWidth = data[1] | (data[2] << 8), headerHeight = data[3] | (data[4] << 8);
      if (data[0] >= 6 && data[0] <= data.length && headerWidth * headerHeight === Number(meta.width) * Number(meta.height) && [Number(meta.width), Number(meta.height)].includes(headerWidth) && data[5] <= 3) {
        if (!group5Decoder) throw Error(t('Group5-Decoder des APs wird benötigt. Bitte RAW herunterladen.'));
        const decodedHeight = headerHeight * (data[5] === 2 ? 2 : 1);
        const decoded = await group5Decoder(data.slice(data[0]), headerWidth, decodedHeight);
        if (decoded.length !== Math.ceil(headerWidth / 8) * decodedHeight) throw Error(t('Group5-Ergebnis hat eine ungültige Länge.'));
        // G5 rows have byte padding; normalize to tightly packed planes.
        data = new Uint8Array(Math.ceil(headerWidth * decodedHeight / 8));
        for (let y = 0; y < decodedHeight; y++) for (let x = 0; x < headerWidth; x++) {
          const bit = (decoded[y * Math.ceil(headerWidth / 8) + (x >> 3)] >> (7 - (x & 7))) & 1;
          const p = y * headerWidth + x; data[p >> 3] |= bit << (7 - (p & 7));
        }
      }
    }
    let w = Number(meta.width), h = Number(meta.height);
    EP.dimensions(w, h);
    if (meta.rotatebuffer % 2) [w, h] = [h, w];
    const n = w * h, bpp = Number(meta.bpp), palette = Object.values(meta.colortable || {}), out = new Uint8ClampedArray(n * 4);
    const packed = [3, 4, 5].includes(bpp), bits = bpp === 5 ? 2 : bpp, plane = Math.ceil(n / 8);
    if (bpp === 16) {
      if (![n, n * 2].includes(data.length)) throw Error(t('RGB-RAW-Länge passt nicht zum Displaytyp.'));
      const full = data.length === n * 2;
      for (let p = 0; p < n; p++) {
        const value = full ? (data[p * 2] << 8) | data[p * 2 + 1] : data[p];
        out.set(full ? [((value >> 11) & 31) * 255 / 31, ((value >> 5) & 63) * 255 / 63, (value & 31) * 255 / 31, 255] : [((value >> 5) & 7) * 255 / 7, ((value >> 2) & 7) * 255 / 7, (value & 3) * 255 / 3, 255], p * 4);
      }
      return {data: out, width: w, height: h};
    }
    if (![1, 2, 3, 4, 5].includes(bpp)) throw Error(t('RAW-Farbformat wird noch nicht unterstützt.'));
    if (packed ? data.length !== Math.ceil(n * bits / 8) : ![plane, plane * 2].includes(data.length)) throw Error(t('RAW-Länge passt nicht zum Displaytyp; möglicherweise komprimiert.'));
    for (let p = 0; p < n; p++) {
      let index;
      if (packed) {
        const bit = p * bits, at = bit >> 3;
        index = (((data[at] << 8) | (data[at + 1] || 0)) >> (16 - bits - (bit & 7))) & ((1 << bits) - 1);
      } else {
        index = (data[p >> 3] >> (7 - (p & 7))) & 1;
        if (data.length === plane * 2) index |= ((data[plane + (p >> 3)] >> (7 - (p & 7))) & 1) << 1;
      }
      const color = palette[index];
      if (!color || color.length !== 3) throw Error(t('Farbindex fehlt in der AP-Farbtabelle.'));
      out.set([...color, 255], p * 4);
    }
    return {data: out, width: w, height: h, rotation: Number(meta.rotatebuffer || 0) >= 2 ? 180 : 0};
  }
  root.EPAP = {normalize, request, tags, type, mac, upload, decodeRaw, decodeG5, filePath, writablePath, files, getFile, putFile, sendTemplate, sendLED};
  if (typeof module !== 'undefined') module.exports = root.EPAP;
})(globalThis);

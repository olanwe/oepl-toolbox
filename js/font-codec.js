/* Native, offline gzip for VLW files. Keep decompression bounded before parsing. */
(function(root) {
  'use strict';
  const limit=80*1024*1024;
  const t=key=>root.I18N?root.I18N.t(key):key;
  async function read(stream) {
    const reader=stream.getReader(),chunks=[];let length=0;
    try {
      for (;;) {
        const {value,done}=await reader.read();if(done)break;
        length+=value.byteLength;
        if(length>limit){await reader.cancel();throw Error(t('VLW-Datei überschreitet das Größenlimit von 80 MiB.'));}
        chunks.push(value);
      }
    } finally {reader.releaseLock();}
    const bytes=new Uint8Array(length);let offset=0;
    for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return bytes;
  }
  async function pack(bytes,compressed=true) {
    if(bytes.byteLength>limit)throw Error(t('VLW-Datei überschreitet das Größenlimit von 80 MiB.'));
    if(!compressed)return new Blob([bytes],{type:'application/octet-stream'});
    if(!root.CompressionStream)throw Error(t('Dieser Browser unterstützt kein Gzip-Packen. Gzip deaktivieren oder einen aktuellen Browser verwenden.'));
    const encoded=await read(new Blob([bytes]).stream().pipeThrough(new root.CompressionStream('gzip')));
    return new Blob([encoded],{type:'application/gzip'});
  }
  async function unpack(blob,name='') {
    if(blob.size>limit)throw Error(t('VLW-Datei überschreitet das Größenlimit von 80 MiB.'));
    const header=new Uint8Array(await blob.slice(0,8).arrayBuffer()),gzip=header[0]===31&&header[1]===139;
    if(!gzip){
      const rawVlw=header.length>=8&&new DataView(header.buffer).getInt32(4)===11;
      if(/\.gz$/i.test(name)&&!rawVlw)throw Error(t('Die Datei hat keine gültige Gzip-Kennung.'));
      return new Uint8Array(await blob.arrayBuffer());
    }
    if(!root.DecompressionStream)throw Error(t('Dieser Browser unterstützt kein Gzip-Entpacken. Einen aktuellen Browser verwenden.'));
    try{return await read(blob.stream().pipeThrough(new root.DecompressionStream('gzip')));}
    catch(error){throw Error(t('Gzip-Datei konnte nicht entpackt werden: ')+error.message);}
  }
  function fileName(name,compressed) {
    return name.replace(/\.vlw(?:\.gz)?$/i,'')+(compressed?'.vlw.gz':'.vlw');
  }
  function logicalPath(path) {return path.replace(/\.gz$/i,'');}
  root.FontCodec={pack,unpack,fileName,logicalPath};
  if(typeof module!=='undefined')module.exports=root.FontCodec;
})(globalThis);

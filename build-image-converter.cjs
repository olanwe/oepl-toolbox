// Bundle the shared pure converter for Node.js, browsers and an embeddable factory.
const fs=require('node:fs'),path=require('node:path');
function factory(){
 const names=['gamut.js','fixed-mix.js','image-converter.js','illustration.js','image-api.js'];
 return `function createOeplImageConverterV1(){\n'use strict';\nconst window={},modules=Object.create(null),cache=Object.create(null);\nconst load=id=>{id=id.replace(/^\\.\\//,'');if(cache[id])return cache[id].exports;if(!modules[id])throw Error('Unknown converter module: '+id);const module={exports:{}};cache[id]=module;modules[id](module,module.exports,load);return module.exports;};\n`+names.map(name=>`modules[${JSON.stringify(name)}]=function(module,exports,require){\n${fs.readFileSync(path.join(__dirname,'js',name),'utf8').replace(/^\uFEFF/,'')}\n};`).join('\n')+`\nreturn load('image-api.js');\n}\n`;
}
function bundle(){return `/* OEPL Image Converter 1.1.0; GPL-3.0. See LICENSE. */\n(function(root){\n${factory()}\nconst api=createOeplImageConverterV1();\nif(typeof module!=='undefined'&&module.exports)module.exports=api;else root.OEPLImage=api;\n})(globalThis);\n`;}
if(require.main===module){const destination=process.argv[2]||path.join(__dirname,'dist','oepl-image-converter.js');fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bundle(),'utf8');console.log('Saved: '+path.resolve(destination));}
module.exports={factory,bundle};

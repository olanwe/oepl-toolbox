// Legacy custom-profile fixtures: not shipped as selectable presets.
const colorimetry=require('../js/colorimetry'),{validate}=require('../js/color-profiles');
 const builtins=[validate({name:'BWRY · OEPL-Näherung (Gelb #c8c800)',nominal:['#ffffff','#000000','#ff0000','#ffff00'],renderColors:['#ffffff','#000000','#ff0000','#c8c800'],kind:'approximate',source:'https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/resources/tagtypes/2B.json'})];
 function manufacturer(name,nominal,values,source){
  const sourceLab={whitePoint:'D65',assumedWhitePoint:true,values};
  return validate({name,nominal,renderColors:values.map(v=>colorimetry.labHex(v,'D65')),sourceLab,kind:'approximate',source});
 }
 builtins.push(manufacturer('BWRY · Spectra 3100 – Hersteller-Näherung',['#ffffff','#000000','#ff0000','#ffff00'],[[66.3,-2,2.1],[10.77,6.1,-3.1],[31,40.9,29.9],[60.3,12.4,68.5]],'https://ba-sid.org/wp-content/uploads/2022/06/BASID-Mar-2022-E-Ink-Karen-Du.pdf'));
 builtins.push(manufacturer('BWRYGB · Waveshare 4″ – Hersteller-Näherung',['#ffffff','#000000','#ff0000','#ffff00','#0000ff','#00ff00'],[[66.5,-4,0],[12,7,-11],[26.5,41,30],[62,-11,65],[34,3.5,-37],[35,-22,15]],'https://files.waveshare.com/wiki/4inch-e-Paper-HAT%2B-%28E%29/4-inch-e-paper-user-manual.pdf#page=17'));

module.exports=builtins;

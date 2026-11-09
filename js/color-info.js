/* Exact RGB color labels for the UI; custom colors retain their hex identifier. */
(function(root){
 'use strict';
 const entries={
 '#ffffff':['W','Weiß'],'#000000':['K','Schwarz'],'#ff0000':['R','Rot'],'#00ff00':['G','Grün'],'#0000ff':['B','Blau'],'#ffff00':['Y','Gelb'],'#ff8000':['O','Orange'],'#ffa500':['O','Orange'],
 '#00ffff':['C','Cyan'],'#40e0d0':['T','Türkis'],'#ff00ff':['M','Magenta'],'#8000ff':['V','Violett'],'#8f00ff':['V','Violett'],'#800080':['P','Purpur'],'#ffc0cb':['PK','Rosa'],'#808080':['GY','Grau'],'#a52a2a':['BN','Braun'],'#008000':['DG','Dunkelgrün'],'#000080':['N','Dunkelblau'],'#008080':['TL','Blaugrün']
 };
 const info=hex=>entries[String(hex).toLowerCase()];
 const code=hex=>info(hex)?.[0]||hex;
 const name=hex=>{const key=info(hex)?.[1];return key?(root.I18N?root.I18N.t(key):key):hex;};
 const label=hex=>info(hex)?code(hex)+' · '+name(hex)+' ('+hex+')':hex;
 function valid(colors){return Array.isArray(colors)&&colors.length>=2&&colors.length<=16&&colors.every(c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c))&&new Set(colors.map(c=>c.toLowerCase())).size===colors.length;}
 function brightness(hex){return hex.slice(1).match(/../g).map(v=>parseInt(v,16)).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0)/255;}
 function extremes(colors){const sorted=colors.slice().sort((a,b)=>brightness(a)-brightness(b));return {dark:sorted[0],light:sorted.at(-1)};}
 function textColor(background,colors){const {dark,light}=extremes(colors),chosen=brightness(background)<.5?light:dark;return chosen.toLowerCase()===background.toLowerCase()?(chosen===light?dark:light):chosen;}
 root.ColorInfo={code,name,label,valid,extremes,brightness,textColor};if(typeof module!=='undefined')module.exports=root.ColorInfo;
})(typeof window!=='undefined'?window:globalThis);

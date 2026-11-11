const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ColorProfiles=require('../js/color-profiles');

test('only the generic BWRY correction is bundled; legacy custom profiles remain importable',()=>{
 assert.equal(ColorProfiles.builtins.length,1);
 assert.equal(ColorProfiles.builtins[0].mixing.model,'power-xyz');
 for(const profile of require('./legacy-profile-fixtures.cjs'))assert.deepEqual(ColorProfiles.validate(JSON.parse(JSON.stringify(profile))),profile);
});

test('AP adoption restores saved profiles even when the previous palette had different entries',()=>{
 const context={window:{},ColorProfiles,Option:class {constructor(text,value){Object.assign(this,{text,value});}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/color-profile-ui.js'),'utf8'),context);
 const prototype=context.window.ColorProfileEditor.prototype,generic=ColorProfiles.builtins[0],custom=ColorProfiles.validate({...generic,name:'My panel'}),meta={colortable:{w:[255,255,255],k:[0,0,0],r:[255,0,0],y:[255,255,0]},perceptual:{y:[180,160,0]}};
 for(const [choice,expected]of [['custom:My panel','custom:My panel'],['builtin:3','builtin:bwry-generic'],['ideal','ideal'],['builtin:0','ideal'],[undefined,'ap']]){
  const select={replaceChildren(){},append(){}},editor={colors:()=>generic.nominal,$:()=>select,t:s=>s,own:{[custom.name]:custom},entries:new Map(),choices:{'ap:test':choice},fill(){},populate:prototype.populate};
  prototype.applyAP.call(editor,meta,'ap:test');assert.equal(select.value,expected);
 }
});

test('removed preset choices fall back safely while generic and custom choices survive',()=>{
 const context={window:{},ColorProfiles,Option:class {constructor(text,value){Object.assign(this,{text,value});}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/color-profile-ui.js'),'utf8'),context);
 const generic=ColorProfiles.builtins[0],custom=ColorProfiles.validate({...generic,name:'My measured panel'});
 for(const [saved,expected]of [['builtin:0','ideal'],['builtin:1','ideal'],['builtin:2','ideal'],['builtin:3','builtin:bwry-generic'],['builtin:bwry-generic','builtin:bwry-generic'],['custom:My measured panel','custom:My measured panel'],['ideal','ideal']]){
  const select={replaceChildren(...options){this.options=options;},append(option){this.options.push(option);}};
  const editor={colors:()=>generic.nominal,$:()=>select,t:s=>s,own:{[custom.name]:custom},choices:{[ColorProfiles.key(generic.nominal)]:saved},fill(){}};
  context.window.ColorProfileEditor.prototype.populate.call(editor);
  assert.equal(select.value,expected,saved);
  assert.equal(select.options.length,3);
  assert.ok(!select.options.some(o=>/^builtin:[0-9]+$/.test(o.value)));
 }
});

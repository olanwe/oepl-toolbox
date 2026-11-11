const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../js/i18n.js'),'utf8');
const english=fs.readFileSync(path.join(__dirname,'../js/locales/en.js'),'utf8');
function setup(languages,saved,blocked=false){const writes=[];const context=vm.createContext({navigator:{languages},Intl,localStorage:{getItem(){if(blocked)throw Error('blocked');return saved;},setItem(k,v){if(blocked)throw Error('blocked');writes.push([k,v]);}}});vm.runInContext(english,context);vm.runInContext(source,context);return {api:context.I18N,context,writes};}
test('locale detection uses saved supported choice, then browser preferences, then English',()=>{
 const {api}=setup(['en-GB']);assert.equal(api.detect(['de-AT','en-US']),'de');assert.equal(api.detect(['fr-FR','en-GB']),'en');assert.equal(api.detect(['fr'],'de'),'de');assert.equal(api.detect(['de'],'invalid'),'de');assert.equal(api.detect(['ja']),'en');assert.equal(api.detect([undefined]),'en');
});
test('language changes are validated, persisted and format numbers for the selected locale',()=>{
 const {api,writes}=setup(['en-GB']);assert.equal(api.t('Bild geladen.'),'Image loaded.');assert.equal(api.number(1.5),'1.5');assert.equal(api.setLanguage('de'),true);assert.equal(api.t('Bild geladen.'),'Bild geladen.');assert.equal(api.number(1.5),'1,5');assert.deepEqual(writes,[['oepl-toolbox-language','de']]);assert.equal(api.setLanguage('fr'),false);assert.equal(api.language,'de');
});
test('blocked storage does not prevent localization and unknown keys fall back to source text',()=>{
 const {api,context}=setup(['en-US'],null,true);assert.equal(api.t('unknown key'),'unknown key');context.ToolboxLocales.en['Test {value}']='Value: {value}';assert.equal(api.t('Test {value}',{value:'<script>'}),'Value: <script>');assert.equal(api.setLanguage('de'),true);assert.equal(api.language,'de');
});
test('all declarative HTML translation keys have English catalog entries',()=>{
 const catalog=require('../js/locales/en.js'),html=fs.readFileSync(path.join(__dirname,'../img2vlw.html'),'utf8');let count=0;
 for(const match of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]*)"/g)){const key=match[1].replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');assert.ok(Object.hasOwn(catalog,key),'Missing English translation: '+key);count++;}
 assert.ok(count>150);
});

test('English translation keys are unique rather than silently overriding earlier entries',()=>{
 const keys=new Set();
 for(const line of english.split(/\r?\n/)){
  const match=line.match(/^\s*("(?:[^"\\]|\\.)*")\s*:/);if(!match)continue;
  const key=JSON.parse(match[1]);assert.ok(!keys.has(key),'Duplicate translation: '+key);keys.add(key);
 }
});

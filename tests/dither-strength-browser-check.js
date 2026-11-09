async(page)=>{
const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};await page.addInitScript(()=>localStorage.setItem('oepl-toolbox-language','en'));await page.goto('http://127.0.0.1:8766/img2vlw.html');
const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='rgb(120,120,120)';ctx.fillRect(0,0,128,32);ctx.fillStyle='rgb(85,95,60)';ctx.fillRect(0,32,128,32);return c.toDataURL().split(',')[1];});await page.locator('#file').setInputFiles({name:'strength-sweep.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});await page.locator('#width').fill('128');await page.locator('#height').fill('64');await page.locator('#palette').selectOption('ACeP7');await page.locator('#dither').selectOption('none');await page.waitForFunction(()=>!document.getElementById('png').disabled);const direct=await page.locator('#target').evaluate(c=>c.toDataURL());
for(const method of ['ordered','floyd']){await page.locator('#dither').selectOption(method);let previous=0;for(const strength of ['1','0.75','0.5','0.25','0.1','0.05','0']){
 await page.locator('#strength').fill(strength);await page.waitForFunction(()=>!document.getElementById('png').disabled);
 const stats=await page.locator('#target').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,128,64).data;let gray=0,neutral=true;const olive=[0,0,0];for(let y=0;y<64;y++)for(let x=0;x<128;x++){const p=(y*128+x)*4;if(y<32){gray+=data[p];if(data[p]!==data[p+1]||data[p+1]!==data[p+2])neutral=false;}else for(let k=0;k<3;k++)olive[k]+=data[p+k];}return {gray:gray/4096,neutral,olive:olive.map(v=>v/4096)};});
 ensure(stats.neutral&&stats.gray>=previous-1,method+' strength '+strength+' fades neutral gray toward None');previous=stats.gray;
 ensure(stats.olive[0]<=stats.olive[1]+8,method+' strength '+strength+' has no olive-to-orange cast');
 if(strength==='0.05')ensure(stats.gray>245&&stats.olive.every(v=>v<10),method+' weak raster is already close to the direct endpoint');
 if(strength==='0')ensure(await page.locator('#target').evaluate(c=>c.toDataURL())===direct,method+' zero matches the direct endpoint');
 }}
ensure(errors.length===0,'no browser errors');return {checks};}

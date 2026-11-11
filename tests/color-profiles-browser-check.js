async(page)=>{
 const checks=[],errors=[],requests=[];const ok=(value,name)=>{if(!value)throw Error(name);checks.push(name);};
 page.on('pageerror',error=>errors.push(error.message));page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8769/')&&!r.url().startsWith('data:')&&!r.url().startsWith('blob:'))requests.push(r.url());});
 await page.setViewportSize({width:1600,height:1100});
 await page.goto('http://127.0.0.1:8769/oepl-toolbox.html');await page.evaluate(()=>{localStorage.clear();localStorage.setItem('oepl-toolbox-language','de');});await page.reload();
 const ready=()=>page.waitForFunction(()=>!document.getElementById('png').disabled&&!Activity.isActive('preview')&&!Activity.isActive('image'));
 await page.locator('#palette').selectOption('BWRY');ok(await page.locator('#colorProfile option').count()===2,'matching built-in profile offered');
 await page.locator('#testPatternPanel > summary').click();await page.locator('#demo').click();await ready();
 await page.locator('#dither').selectOption('floyd');await ready();
 await page.evaluate(()=>{window.conversions=0;const original=EP.quantize;EP.quantize=(...args)=>{conversions++;const output=original(...args);window.lastProfileResult=output;return output;};});
 await page.locator('#colorProfile').selectOption('builtin:bwry-generic');await ready();
 ok(await page.evaluate(()=>lastProfileResult.data.every((v,i)=>i%4===3||v===0||v===255)),'profile computation exports nominal bytes');
 const pixelHash=()=>page.locator('#target').evaluate(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;return data.reduce((sum,v,i)=>(sum+v*(i%113+1))>>>0,0);});
 const actual=await pixelHash(),calls=await page.evaluate(()=>conversions);
 await page.locator('#profilePreview').selectOption('ideal');const ideal=await pixelHash();
 ok(actual!==ideal,'profile preview differs from ideal preview');ok(await page.evaluate(()=>conversions)===calls,'preview switch does not reconvert');
 await page.locator('#profilePreview').selectOption('profile');await page.locator('#colorProfileEditor').evaluate(node=>node.open=true);
 await page.locator('#colorProfileName').fill('Panel-Test');await page.locator('#colorProfileSource').fill('Local fixture');
 for(const [i,color]of ['#e0dfd3','#232323','#b02010','#dfbf20'].entries())await page.locator('#colorProfileRows input[type=text]').nth(i).fill(color);
 await page.locator('#saveColorProfile').click();await ready();ok(await page.locator('#colorProfile').inputValue()==='custom:Panel-Test','custom profile saved and activated');
 async function download(id){const wait=page.waitForEvent('download');await page.locator('#'+id).click();const d=await wait,stream=await d.createReadStream(),parts=[];for await(const part of stream)parts.push(part);return Buffer.concat(parts);}
 const exported=JSON.parse((await download('exportColorProfile')).toString());ok(exported.profile.renderColors[3]==='#dfbf20'&&exported.profile.source==='Local fixture','profile JSON includes references and provenance');
 const png=await download('png');ok(await page.evaluate(async base64=>{
  const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return bytes.every((v,i)=>i%4===3||v===0||v===255);
 },png.toString('base64')),'PNG export remains nominal despite physical preview');
 await page.reload();await page.locator('#palette').selectOption('BWRY');ok(await page.locator('#colorProfile').inputValue()==='custom:Panel-Test','profile and palette association survive reload');
 await page.locator('#colorProfileEditor').evaluate(node=>node.open=true);await page.locator('#deleteColorProfile').click();ok(await page.locator('#colorProfile').inputValue()==='ideal','custom profile deletion returns to ideal');
 await page.locator('#importColorProfile').setInputFiles({name:'profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>document.getElementById('colorProfile').value==='custom:Panel-Test');ok(true,'JSON import round trip');
 await page.locator('#palette').selectOption('BWR');ok(await page.locator('#colorProfile option').count()===1,'incompatible profiles hidden');
 await page.locator('#importColorProfile').setInputFiles({name:'profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>document.getElementById('notice').classList.contains('error'));ok(await page.locator('#palette').inputValue()==='BWR','incompatible import does not change output palette');
 await page.locator('#palette').selectOption('BWRY');await page.locator('#testPatternPanel > summary').click();await page.locator('#demo').click();await ready();
 await page.locator('#dither').selectOption('rgb');await ready();ok(await page.locator('#profileContinuousHint').isVisible()&&await page.locator('#profilePreview').isDisabled(),'continuous output explains AP responsibility');
 await page.locator('#dither').selectOption('floyd');await ready();
 await page.evaluate(()=>{
  EPAP.tags=async()=>[{mac:'0011223344556677',alias:'Simulated display',hwType:43},{mac:'0011223344556688',alias:'Second simulated display',hwType:43}];
  EPAP.type=async()=>({name:'Simulated M3',width:400,height:300,colortable:{yellow:[255,255,0],white:[255,255,255],red:[255,0,0],black:[0,0,0]},perceptual:{yellow:[190,180,10]}});
 });
 await page.locator('#apAddress').fill('http://simulated-ap.test');await page.locator('#connect').click();await page.waitForFunction(()=>document.getElementById('tags').options.length===3);await page.locator('#tags').selectOption('0');await page.waitForFunction(()=>!document.getElementById('profile').disabled);
 await page.locator('#profile').click();await page.waitForFunction(()=>document.getElementById('palette').value==='custom:AP-Display');await ready();ok(await page.locator('#colorProfile').inputValue()==='ap','AP adoption selects its own perceptual profile');ok(await page.locator('#colorProfile option[value=ap]').count()===1,'AP perceptual profile is available');
 await page.locator('#colorProfile').selectOption('custom:Panel-Test');await ready();await page.locator('#profile').click();await page.waitForFunction(()=>!document.getElementById('profile').disabled);await ready();ok(await page.locator('#colorProfile').inputValue()==='custom:Panel-Test','saved per-display association takes priority over AP profile');
 await page.locator('#tags').selectOption('1');await page.waitForFunction(()=>!document.getElementById('profile').disabled);await page.locator('#profile').click();await page.waitForFunction(()=>!document.getElementById('profile').disabled);await ready();ok(await page.locator('#colorProfile').inputValue()==='ap','different display does not inherit another panels custom calibration');
 await page.locator('#tags').selectOption('0');await page.waitForFunction(()=>!document.getElementById('profile').disabled);await page.locator('#profile').click();await page.waitForFunction(()=>!document.getElementById('profile').disabled);await ready();ok(await page.locator('#colorProfile').inputValue()==='custom:Panel-Test','returning to first display restores its own association');
 await page.locator('#colorProfile').selectOption('ap');await ready();await page.locator('#colorProfileEditor').evaluate(node=>node.open=true);ok(await page.locator('#colorProfileRows input[type=text]').nth(2).inputValue()==='#beB40a'.toLowerCase(),'AP colors aligned by name after palette reorder');
 await page.locator('#takeColorProfile').uncheck();await page.locator('#profile').click();await ready();ok(await page.locator('#colorProfile option[value=ap]').count()===0&&await page.locator('#colorProfile').inputValue()==='ideal','disabling AP adoption clears the previous AP profile even with an identical palette');
 await page.locator('#colorProfile').selectOption('custom:Panel-Test');await ready();await page.locator('#takeColorProfile').check();await page.locator('#profile').click();await ready();ok(await page.locator('#colorProfile').inputValue()==='ap','detached profile edits do not overwrite the previous display association');
 await page.locator('#takeColorProfile').uncheck();await page.locator('#palette').selectOption('BWR');await page.locator('#profile').click();await page.waitForFunction(()=>document.getElementById('palette').value==='custom:AP-Display');await ready();ok(await page.locator('#colorProfile option[value=ap]').count()===0,'AP profile adoption can be disabled');
 await page.locator('#language').selectOption('en');ok(await page.locator('label:has(#colorProfile) > span').textContent()==='Calculation color profile','profile controls translated');
 await page.locator('#palette').selectOption('BWRY');await page.locator('#colorProfile').selectOption('builtin:bwry-generic');await ready();
 await page.locator('#colorProfileEditor').evaluate(node=>node.open=true);await page.locator('#colorProfileName').fill('<img src=x onerror=alert(1)>');await page.locator('#saveColorProfile').click();await ready();ok(await page.locator('#colorProfile option img').count()===0,'custom names remain plain text');
 await page.locator('#colorProfile').selectOption('builtin:bwry-generic');await ready();await page.locator('#methodGuide > summary').click();await page.waitForFunction(()=>document.querySelectorAll('#methodExamples img').length===8);ok(true,'method guide supports calculation and preview profiles');
 await page.locator('#methodGuide > summary').click();await page.locator('#colorProfileEditor').evaluate(node=>node.open=false);await page.locator('#colorProfile').scrollIntoViewIfNeeded();await page.screenshot({path:'outputs/color-profiles-local.png',fullPage:false});ok(errors.length===0,'no browser exceptions');ok(requests.length===0,'no remote or AP requests');
 return {checks,errors,requests};
}

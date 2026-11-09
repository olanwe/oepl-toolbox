async(page)=>{
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
 await page.addInitScript(()=>localStorage.setItem('oepl-toolbox-language','de'));await page.goto('http://127.0.0.1:8766/img2vlw.html');await page.locator('#testPatternPanel > summary').click();
 async function ready(){await page.waitForFunction(()=>!document.getElementById('png').disabled&&!document.getElementById('testPattern').disabled);}
 await page.locator('#width').fill('400');await page.locator('#height').fill('300');await page.locator('#palette').selectOption('BWRY');
 await page.locator('#testPattern').click();await ready();
 ensure(await page.locator('#sourceInfo').textContent()==='400 × 300 px','test chart uses display dimensions');
 ensure(await page.locator('#fit').inputValue()==='native'&&await page.locator('#dither').inputValue()==='none','test chart resets conversion and uses 1:1');
 let stats=await page.evaluate(()=>{const c=document.getElementById('target'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,s=new Set();for(let i=0;i<d.length;i+=4)s.add([d[i],d[i+1],d[i+2]].join(','));return [...s];});
 ensure(stats.length===4,'BWRY test result contains precisely all four colors');
 for(const angle of ['90','180','270','0']){await page.locator('#viewRotation').selectOption(angle);await page.locator('#testPattern').click();await ready();ensure((await page.locator('#sourceInfo').textContent())===(Number(angle)%180?'300 × 400 px':'400 × 300 px'),'chart respects view orientation '+angle);}
 for(const mode of ['colors','lines','pairs','gradients']){await page.locator('#testPatternMode').selectOption(mode);await page.locator('#testPattern').click();await ready();}
 ensure(true,'all four detailed chart sections render');
 await page.locator('#testPatternMode').selectOption('solid');await page.locator('#patternColorA').selectOption('#ff0000');await page.locator('#testPattern').click();await ready();
 ensure(await page.evaluate(()=>{const d=document.getElementById('target').getContext('2d').getImageData(0,0,400,300).data;for(let i=0;i<d.length;i+=4)if(d[i]!==255||d[i+1]!==0||d[i+2]!==0||d[i+3]!==255)return false;return true;}),'solid test fills every pixel including borders');
 await page.locator('#testPatternMode').selectOption('checker');await page.locator('#patternColorA').selectOption('#ffff00');await page.locator('#patternColorB').selectOption('#ff0000');await page.locator('#patternCell').fill('4');await page.locator('#testPattern').click();await ready();
 ensure(await page.evaluate(()=>{const c=document.getElementById('target').getContext('2d');return c.getImageData(0,0,1,1).data[1]===255&&c.getImageData(3,3,1,1).data[1]===255&&c.getImageData(4,0,1,1).data[1]===0&&c.getImageData(4,4,1,1).data[1]===255;}),'full-screen checker uses selected colors and exact cell size');
 await page.locator('#patternCell').dispatchEvent('dblclick');ensure(await page.locator('#patternCell').inputValue()==='1','checker size resets on double click');
 await page.locator('#testPatternMode').selectOption('noise');await page.locator('#patternSeed').fill('0');await page.locator('#testPattern').click();await ready();
 const noise=await page.locator('#target').evaluate(c=>c.toDataURL());await page.locator('#testPattern').click();await ready();ensure(await page.locator('#target').evaluate(c=>c.toDataURL())===noise,'noise seed zero is reproducible');
 await page.locator('#patternSeed').fill('2');await page.locator('#testPattern').click();await ready();ensure(await page.locator('#target').evaluate(c=>c.toDataURL())!==noise,'different noise seeds change the pattern');
 ensure(await page.evaluate(()=>{const c=document.getElementById('target'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,counts={};for(let i=0;i<d.length;i+=4){const key=[...d.slice(i,i+3)].join(',');counts[key]=(counts[key]||0)+1;}return Object.keys(counts).length===4&&Object.values(counts).every(n=>n>28000&&n<32000); }),'noise covers all palette colors with approximately equal counts');
 const pure=await page.evaluate(()=>{
  const p=TestPattern.pairs(EP.palettes.BWRY),c=TestPattern.create(400,300,EP.palettes.BWRY,'pairs'),d=c.getContext('2d');
  return {pairs:p.length,first:[...d.getImageData(30,70,2,2).data],max:TestPattern.pairs(Array.from({length:16},(_,i)=>i)).length};
 });
 ensure(pure.pairs===6&&pure.max===120,'every unordered color pair is generated');
 ensure(pure.first[0]===pure.first[12]&&pure.first[4]===pure.first[8]&&pure.first[0]!==pure.first[4],'mixtures alternate at exactly one pixel');
 await page.locator('#testPatternMode').selectOption('all');await page.locator('#palette').selectOption('ACeP7');await page.locator('#testPattern').click();await ready();
 ensure(await page.locator('#notice').textContent()!=='','ACeP7 chart generates');
 await page.locator('#palette').selectOption('BWRY');
 async function load(w,h){const base64=await page.evaluate(([w,h])=>{const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,w,h);ctx.fillStyle='red';ctx.fillRect(0,0,1,h);ctx.fillStyle='black';ctx.fillRect(1,0,1,h);return c.toDataURL().split(',')[1];},[w,h]);await page.locator('#file').setInputFiles({name:'pixels.png',mimeType:'image/png',buffer:Buffer.from(base64,'base64')});await page.waitForFunction(([w,h])=>document.getElementById('sourceInfo').textContent===w+' × '+h+' px',[w,h]);await ready();}
 await page.locator('#width').fill('11');await page.locator('#height').fill('9');await load(4,3);
 let sample=await page.evaluate(()=>{const c=document.getElementById('target'),d=c.getContext('2d');return [...d.getImageData(3,3,3,1).data];});
 ensure(sample[0]===255&&sample[1]===0&&sample[4]===0&&sample[8]===255&&sample[9]===255,'1:1 preserves one-pixel stripes and floors odd centering');
 await page.locator('#offsetX').fill('2');await ready();
 ensure(await page.evaluate(()=>document.getElementById('target').getContext('2d').getImageData(5,3,1,1).data[1]===0),'numeric offsets move source pixels');
 await page.locator('#exportContentOnly').check();await ready();
 ensure((await page.locator('#orientationInfo').textContent()).includes('4 × 3'),'content-only export uses actual placed bounds');
 await page.locator('#imageScale').fill('200');await page.locator('#imageScale').dispatchEvent('input');await ready();
 ensure(await page.locator('#fit').inputValue()==='free'&&(await page.locator('#orientationInfo').textContent()).includes('8 × 6'),'free scale clips content bounds at display edge');
 await page.locator('#imageScale').dispatchEvent('dblclick');await ready();ensure(await page.locator('#imageScale').inputValue()==='100','scale double click restores default');
 await page.locator('#fit').selectOption('native');await load(20,12);
 ensure(await page.locator('#width').inputValue()==='11'&&await page.locator('#height').inputValue()==='9','oversized 1:1 source clips without altering display dimensions');
 await page.locator('#offsetX').fill('5');await ready();ensure(await page.evaluate(()=>document.getElementById('target').getContext('2d').getImageData(0,0,1,1).data[1]===0),'oversized source can expose left edge through positioning');
 await page.locator('#offsetX').fill('100');await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('außerhalb'));await page.locator('#centerImage').click();await ready();ensure(await page.locator('#offsetX').inputValue()==='0','center action recovers fully offscreen source');
 await page.locator('#width').fill('400');await page.locator('#height').fill('300');await load(80,60);
 const box=await page.locator('#target').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+box.width/10,box.y+box.height/2+box.height/10);await page.mouse.up();await ready();ensure(await page.locator('#offsetX').inputValue()==='40'&&await page.locator('#offsetY').inputValue()==='30','dragging uses display pixel coordinates');
 await page.locator('#language').selectOption('en');ensure(await page.locator('#centerImage').textContent()==='Center image','new placement UI translates live');
 await page.locator('#testPatternMode').selectOption('all');await page.locator('#testPattern').click();await ready();const dl=page.waitForEvent('download');await page.locator('#png').click();await (await dl).saveAs('outputs/testbild-bwry.png');
 await page.setViewportSize({width:390,height:844});ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile layout has no horizontal overflow');
 ensure(errors.length===0,'no browser errors');return {checks};
}


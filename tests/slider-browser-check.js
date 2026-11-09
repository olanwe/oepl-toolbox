async (page) => {
 const checks=[];const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
 await page.setViewportSize({width:1500,height:1000});await page.goto('http://127.0.0.1:8766/img2vlw.html');await page.locator('#testPatternPanel > summary').click();await page.locator('#demo').click();
 for(const [id,value,expected] of [['brightness','80','0'],['contrast','2','1'],['saturation','0.2','1'],['threshold','200','128'],['strength','0.2','1']]) {
  await page.locator('#'+id).fill(value);await page.locator('#'+id).dblclick();
  ensure(await page.locator('#'+id).inputValue()===expected,id+' double-click resets value');
  ensure(await page.locator('#'+id+'Value').textContent()===expected,id+' updates readout');
 }
 await page.locator('#biases').locator('..').locator('summary').click();
 const bias=page.locator('#biases input').first();await bias.fill('60');await bias.dblclick();ensure(await bias.inputValue()==='0','dynamic color preference resets');
 ensure(await page.locator('#biases output').first().textContent()==='0','dynamic preference updates readout');
 await page.locator('#palette').selectOption('BWRY');const newBias=page.locator('#biases input').last();await newBias.fill('-50');await newBias.dblclick();ensure(await newBias.inputValue()==='0','recreated palette preference resets');
 await page.waitForFunction(()=>!document.getElementById('png').disabled);
 const pixels=await page.locator('#target').evaluate(c=>c.toDataURL());await page.locator('#brightness').fill('100');await page.waitForFunction(()=>!document.getElementById('png').disabled);await page.locator('#brightness').dblclick();await page.waitForFunction(()=>!document.getElementById('png').disabled);
 ensure(await page.locator('#target').evaluate(c=>c.toDataURL())===pixels,'double-click restores rendered pixels');
 await page.locator('#ledTool').click();await page.locator('#ledSeek').fill('100');await page.locator('#ledSeek').dblclick();ensure(await page.locator('#ledSeek').inputValue()==='0','LED seek resets');ensure((await page.locator('#ledClock').textContent()).startsWith('0 ms'),'LED simulation updates');return {checks};
}

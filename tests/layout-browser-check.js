async (page) => {
 const checks=[]; const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
 await page.setViewportSize({width:1500,height:900}); await page.goto('http://127.0.0.1:8766/img2vlw.html');await page.locator('#testPatternPanel > summary').click();await page.locator('#demo').click();await page.waitForFunction(()=>!document.getElementById('png').disabled);
 for(const width of [1500,900,390]) {
  await page.setViewportSize({width,height:900});await page.locator('#threshold').scrollIntoViewIfNeeded();
  const preview=await page.locator('.previewPanel').boundingBox(),control=await page.locator('#threshold').boundingBox();
  ensure(preview.y>=-1&&preview.y+preview.height<=900,'preview visible at threshold '+width);
  ensure(control.y>=preview.y&&(width>720||control.y>preview.y+preview.height),'control unobscured '+width);
  ensure(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow '+width);
  await page.locator('#threshold').fill('160');await page.waitForFunction(()=>!document.getElementById('png').disabled);
  if(width===1500)await page.screenshot({path:'../outputs/bildbearbeitung-vorschau.png'});
  if(width===390)await page.screenshot({path:'../outputs/bildbearbeitung-mobil.png'});
 }
 await page.locator('#ledTool').click();ensure(await page.locator('.delivery').isHidden(),'image delivery hidden in LED tool');
 return {checks};
}

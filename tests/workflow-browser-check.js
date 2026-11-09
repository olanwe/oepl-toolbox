async (page) => {
  const checks=[], events=[], files=new Map(), errors=[];
  const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
  page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1500,height:1000});
  await page.goto('http://127.0.0.1:8766/img2vlw.html');await page.locator('#gzipFont').uncheck();
  const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2;c.height=4;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,2,4);ctx.fillStyle='black';ctx.fillRect(0,0,1,1);ctx.fillStyle='red';ctx.fillRect(1,1,1,1);ctx.clearRect(0,3,1,1);return c.toDataURL().split(',')[1];});
  await page.locator('#file').setInputFiles({name:'orientation.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});
  await page.locator('#palette').selectOption('BWR');await page.locator('#width').fill('4');await page.locator('#height').fill('2');await page.locator('#viewRotation').selectOption('90');await page.locator('#fit').selectOption('stretch');
  await page.waitForFunction(()=>document.getElementById('target').width===2&&!document.getElementById('png').disabled);
  await page.locator('#originalSize').click();
  ensure(await page.locator('#width').inputValue()==='4'&&await page.locator('#height').inputValue()==='2','source size accounts for view rotation');
  const before=await page.locator('#target').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,2,4).data));
  await page.locator('#invert').check();
  await page.waitForFunction(()=>document.getElementById('target').getContext('2d').getImageData(0,0,1,1).data[0]===255);
  const after=await page.locator('#target').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,2,4).data));
  ensure(before[0]===0&&after[0]===255&&after[4]===0,'invert black and white');
  ensure(after[12]===255&&after[13]===0&&after[14]===0&&after[27]===0,'invert preserves accent and alpha');
  async function downloadBytes(id){const wait=page.waitForEvent('download');await page.locator('#'+id).click();const d=await wait;const stream=await d.createReadStream();const parts=[];for await(const chunk of stream)parts.push(chunk);return Buffer.concat(parts);}
  for(const orientation of ['native','view']) {
    await page.locator('#exportOrientation').selectOption(orientation);await page.waitForFunction(()=>!document.getElementById('png').disabled);
    const png=await downloadBytes('png');ensure(png.readUInt32BE(16)===(orientation==='native'?4:2)&&png.readUInt32BE(20)===(orientation==='native'?2:4),orientation+' PNG dimensions');
    const vlw=await downloadBytes('vlw');ensure(vlw.readInt32BE(8)===(orientation==='native'?2:4)&&vlw.readInt32BE(36)===(orientation==='native'?4:2),orientation+' VLW dimensions');
  }
  const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type'};
  await page.route('http://workflow-ap.test/**',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.pathname==='/get_db')return route.fulfill({json:{tags:[{mac:'0011223344556677',hwType:1,ver:1}]},headers});
    if(url.pathname==='/tagtypes/01.json')return route.fulfill({json:{width:4,height:2,bpp:2,colortable:{white:[255,255,255],black:[0,0,0],red:[255,0,0]}},headers});
    if(url.pathname==='/current/0011223344556677.raw')return route.fulfill({body:Buffer.from([0x80,0x40]),headers});
    if(url.pathname==='/edit'&&url.searchParams.has('list')) {
      const directory=url.searchParams.get('list');return route.fulfill({json:[...files].filter(([p])=>p.slice(0,p.lastIndexOf('/'))===directory).map(([p,b])=>({type:'file',name:p.split('/').at(-1),size:b.length})),headers});
    }
    if(url.pathname==='/edit'&&url.searchParams.has('download')) {const file=files.get('/'+url.searchParams.get('download'));return route.fulfill({status:file?200:404,body:file||'',headers});}
    if(url.pathname==='/littlefs_put') {
      const buffer=request.postDataBuffer(),text=buffer.toString('latin1'),path=text.match(/name="path"\r\n\r\n([^\r]+)/)[1],fileAt=text.indexOf('name="file"'),start=text.indexOf('\r\n\r\n',fileAt)+4,boundary=request.headers()['content-type'].split('boundary=')[1],end=buffer.indexOf(Buffer.from('\r\n--'+boundary),start);
      files.set(path,buffer.subarray(start,end));events.push('file:'+path);return route.fulfill({body:'OK',headers});
    }
    if(url.pathname==='/jsonupload'){events.push('template');return route.fulfill({body:'Ok, saved',headers});}
    if(url.pathname==='/imgupload'){const bytes=request.postDataBuffer(),sof=bytes.indexOf(Buffer.from([0xff,0xc0]));ensure(sof>=0&&bytes.readUInt16BE(sof+5)===2&&bytes.readUInt16BE(sof+7)===4,'JPEG delivery ignores view export orientation');events.push('jpeg-display');return route.fulfill({body:'OK',headers});}
    return route.fulfill({status:404,headers});
  });
  await page.locator('#apAddress').fill('http://workflow-ap.test');await page.locator('#connect').click();await page.waitForFunction(()=>document.getElementById('tags').options.length===2);await page.locator('#tags').selectOption('0');await page.waitForFunction(()=>!document.getElementById('profile').disabled);
  await page.locator('#fontPath').fill('/fonts/workflow.vlw');await page.locator('#jpegPath').fill('/images/workflow.jpg');await page.locator('#templateX').fill('0');await page.locator('#templateY').fill('0');
  await page.locator('#storeJPEG').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('bytegenau'));
  ensure(files.has('/images/workflow.jpg'),'JPEG persisted and verified');
  await page.locator('#storeVLW').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('VLW und Ebenenplan gespeichert'));
  ensure(files.get('/fonts/workflow.vlw').readInt32BE(8)===4,'AP storage honors current export orientation');
  const beforeCount=events.length;await page.locator('#testVLW').click();await page.waitForFunction(()=>document.getElementById('notice').classList.contains('error'));
  ensure(events.length===beforeCount,'existing font blocks test before template send');
  await page.locator('#overwriteFiles').check();await page.locator('#testVLW').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Template vom AP angenommen'));
  ensure(files.get('/fonts/workflow.vlw').readInt32BE(8)===2&&files.get('/fonts/workflow.vlw').readInt32BE(36)===4,'VLW test always uses native orientation');
  ensure(events.at(-1)==='template'&&events.at(-2)==='file:/fonts/workflow.layers.json','template follows both file uploads');
  await page.locator('#send').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Upload angenommen'));
  const json=JSON.parse(await page.locator('#templateJSON').inputValue());ensure(json.length===3&&json.every(e=>e.text[0]===0&&e.text[1]===0),'template coordinates and mask exclusion');
  await page.locator('#apDirectory').fill('/fonts');await page.locator('#listFiles').click();await page.waitForFunction(()=>document.getElementById('apFiles').options.length===3);
  const fontOption=await page.locator('#apFiles option').evaluateAll(items=>items.find(o=>o.textContent.startsWith('workflow.vlw')).value);await page.locator('#apFiles').selectOption(fontOption);await page.locator('#openAPFile').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('VLW-Bild importiert'));
  ensure((await page.locator('#sourceInfo').textContent()).includes('4 × 2'),'native VLW import keeps source orientation');
  await page.locator('#apDirectory').fill('/images');await page.locator('#listFiles').click();await page.waitForFunction(()=>document.getElementById('apFiles').options.length===2);await page.locator('#apFiles').selectOption('0');await page.locator('#openAPFile').click();await page.waitForFunction(()=>document.getElementById('imageName').textContent==='workflow.jpg');
  ensure((await page.locator('#sourceInfo').textContent()).includes('2 × 4'),'JPEG filesystem import');
  await page.locator('#invert').uncheck();await page.locator('#read').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Gespeichertes AP-Bild geladen'));
  const sourceBefore=await page.locator('#source').evaluate(c=>c.toDataURL());
  await page.locator('#cropW').fill('3');
  for (const angle of ['90','270','180','0']) {
    await page.locator('#viewRotation').selectOption(angle);await page.waitForFunction(()=>!document.getElementById('png').disabled);
    ensure(await page.locator('#cropW').inputValue()==='3','display rotation '+angle+' preserves crop');
    ensure((await page.locator('#sourceInfo').textContent()).includes('4 × 2'),'display rotation '+angle+' preserves source dimensions');
  }
  await page.locator('#resetCrop').click();await page.waitForFunction(()=>!document.getElementById('png').disabled);
  ensure(await page.locator('#source').evaluate(c=>c.toDataURL())===sourceBefore,'AP source pixels unchanged by display orientation');
  for (const angle of ['90','180','270','0']) {
    await page.locator('#rotation').selectOption(angle);await page.waitForFunction(()=>!document.getElementById('png').disabled);
    const odd=Number(angle)%180;
    ensure((await page.locator('#sourceInfo').textContent()).includes(odd?'2 × 4':'4 × 2'),'independent source rotation '+angle);
    ensure(await page.locator('#viewRotation').inputValue()==='0','source rotation leaves display orientation');
  }
  ensure(errors.length===0,'no browser exceptions');
  await page.unroute('http://workflow-ap.test/**');
  return {checks,events,errors};
}

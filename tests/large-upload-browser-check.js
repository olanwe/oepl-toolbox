async(page)=>{
 const checks=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const ensure=(ok,name)=>{if(!ok)throw Error(name);checks.push(name);};
 await page.goto('http://127.0.0.1:8766/img2vlw.html');const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1600;c.height=1200;const ctx=c.getContext('2d'),data=ctx.createImageData(c.width,c.height);let seed=123;for(let p=0;p<data.data.length;p+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data.data[p]=data.data[p+1]=data.data[p+2]=seed>>>24;data.data[p+3]=255;}ctx.putImageData(data,0,0);return c.toDataURL().split(',')[1];});
 await page.locator('#file').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});await page.locator('#width').fill('1600');await page.locator('#height').fill('1200');await page.locator('#palette').selectOption('BW');await page.locator('#dither').selectOption('floyd');await page.waitForFunction(()=>!document.getElementById('png').disabled);
 let rejected,stored,path;const events=[],headers={'Access-Control-Allow-Origin':'*'};
 function parts(req){const buf=req.postDataBuffer(),boundary=req.headers()['content-type'].split('boundary=')[1],text=buf.toString('latin1'),start=text.indexOf('\r\n\r\n',text.indexOf('name="file"'))+4,end=buf.indexOf(Buffer.from('\r\n--'+boundary),start);return {buf,text,file:buf.subarray(start,end)};}
 await page.route('http://size-ap.test/**',route=>{const req=route.request(),url=new URL(req.url());events.push(url.pathname);
 if(url.pathname==='/imgupload'){rejected=parts(req).file;return route.fulfill({status:413,body:'Image too large',headers});}
 if(url.pathname==='/edit'&&url.searchParams.has('list'))return route.fulfill({json:[],headers});
 if(url.pathname==='/littlefs_put'){const p=parts(req);stored=p.file;path=p.text.match(/name="path"\r\n\r\n([^\r]+)/)[1];return route.fulfill({body:'OK',headers});}
 if(url.pathname==='/edit')return route.fulfill({body:stored,headers});
 if(url.pathname==='/save_cfg'){const text=req.postDataBuffer().toString('utf8');ensure(text.includes('"dither":"0"')&&text.includes(path),'static image references verified file without repeat dithering');return route.fulfill({body:'Ok, saved',headers});}
 return route.fulfill({status:404,headers});});
 await page.locator('#apAddress').fill('http://size-ap.test');await page.locator('#mac').fill('0011223344556677');await page.locator('#send').click();await page.waitForFunction(()=>document.getElementById('notice').textContent.includes('Upload angenommen'),{timeout:30000});
 ensure(rejected.length>1024*1024,'actual Floyd-Steinberg JPEG exceeds 1 MiB');ensure(rejected.equals(stored),'fallback preserves every JPEG byte');ensure(events.at(-1)==='/save_cfg','display request follows verified upload');ensure((await page.locator('#notice').textContent()).includes('JPEG unverändert'),'fallback success explained');ensure(errors.length===0,'no browser errors');return {checks,jpegBytes:stored.length};
}

/* Pixel-aligned diagnostic charts; no external images or network requests. */
(function(root){
  'use strict';
  function pairs(colors){return colors.flatMap((a,i)=>colors.slice(i+1).map(b=>[a,b]));}
  function combinations(colors,size=2){
    if(!Number.isInteger(size)||size<2||size>colors.length)return [];
    const result=[];function visit(start,chosen){if(chosen.length===size){result.push(chosen);return;}for(let i=start;i<=colors.length-(size-chosen.length);i++)visit(i+1,chosen.concat(colors[i]));}visit(0,[]);return result;
  }
  function mixturePage(colors,size=2,page=0){const all=combinations(colors,size),pages=Math.max(1,Math.ceil(all.length/12)),index=Number.isInteger(page)?Math.max(0,Math.min(pages-1,page)):0;return {items:all.slice(index*12,(index+1)*12),page:index,pages,total:all.length};}
  function mixtureMatrix(count){return Array.from({length:count},(_,y)=>Array.from({length:count},(_,x)=>(x+y)%count));}
  function ramps(colors){const extremes=ColorInfo.extremes(colors),white=colors.find(c=>c.toLowerCase()==='#ffffff')||extremes.light,black=colors.find(c=>c.toLowerCase()==='#000000')||extremes.dark,accents=colors.filter(c=>c!==white&&c!==black);return [[black,white],...accents.map(c=>[black,c]),...accents.map(c=>[white,c]),...pairs(accents)];}
  function linePairs(colors){const {light}=ColorInfo.extremes(colors);return colors.filter(color=>color!==light).map(color=>[color,light]);}
  function lineColumns(width,count){const capacity=Math.max(1,Math.floor(width/24)),rows=Math.ceil(count/capacity);return Math.ceil(count/rows);}
  function create(w,h,colors,mode='all',t=k=>k,options={}){
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const extremes=ColorInfo.extremes(colors),ctx=canvas.getContext('2d');ctx.fillStyle=extremes.light;ctx.fillRect(0,0,w,h);
    if(mode==='noise'){
      let seed=Number(options.seed??1);
      if(!Number.isInteger(seed)||seed<0||seed>4294967295)throw Error(t('Rausch-Startwert: ganze Zahl von 0 bis 4294967295.'));
      const palette=colors.map(c=>c.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16))),pixels=ctx.createImageData(w,h);
      // Mulberry32: deterministic, including seed zero; independent draws per pixel.
      for(let i=0;i<pixels.data.length;i+=4){seed=(seed+0x6D2B79F5)|0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);const rgb=palette[Math.floor(((n^(n>>>14))>>>0)/4294967296*palette.length)];pixels.data.set(rgb,i);pixels.data[i+3]=255;}
      ctx.putImageData(pixels,0,0);return canvas;
    }
    if(mode==='solid'||mode==='checker'){
      const a=colors.includes(options.a)?options.a:colors[0],b=colors.includes(options.b)?options.b:colors[1];
      ctx.fillStyle=a;ctx.fillRect(0,0,w,h);
      if(mode==='checker'){
        const size=Math.max(1,Math.min(64,Math.round(Number(options.cell)||1)));
        const tile=document.createElement('canvas');tile.width=tile.height=2*size;
        const tc=tile.getContext('2d');tc.fillStyle=a;tc.fillRect(0,0,2*size,2*size);tc.fillStyle=b;tc.fillRect(size,0,size,size);tc.fillRect(0,size,size,size);
        ctx.fillStyle=ctx.createPattern(tile,'repeat');ctx.fillRect(0,0,w,h);
      }
      return canvas;
    }
    const margin=Math.max(3,Math.min(10,Math.floor(Math.min(w,h)/30)));
    const font=Math.max(8,Math.min(16,Math.floor(Math.min(w,h)/24)));
    const text=(s,x,y,size=font,color='#000000')=>PixelFont.draw(ctx,s,x,y,size,color);
    const labels=options.labels==='on'||(options.labels!=='off'&&h>=200&&w>=240);
    const compact=h<200,header=labels?font*2+5:font+2,footer=labels?font+3:0;
    text(w+' × '+h+' px'+(labels?' · '+colors.length+' '+t('Farben'):''),margin,labels?margin+font+2:margin);
    if(labels){text(t('OL'),margin,margin);text(t('OR'),w-margin-PixelFont.measure(t('OR'),font),margin);}
    if(!labels){const side=Math.min(7,w-2*margin,h-2*margin),x=w-margin-side;ctx.fillStyle='#000000';for(let i=0;i<side;i++){ctx.fillRect(x+i,margin+i,1,1);ctx.fillRect(x+side-1-i,margin+i,1,1);}}
    // One physical pixel at the outer edge, with distinct corner markers.
    ctx.fillStyle='#000000';ctx.fillRect(0,0,w,1);ctx.fillRect(0,h-1,w,1);ctx.fillRect(0,0,1,h);ctx.fillRect(w-1,0,1,h);
    ctx.fillRect(1,1,2,2);ctx.fillRect(w-4,1,3,2);ctx.fillRect(1,h-4,2,3);ctx.fillRect(w-4,h-4,3,3);
    const sections=mode==='all'?['colors','lines','pairs','gradients']:[mode];
    const names={colors:t('Farbflächen'),lines:t('Linienauflösung')+' · 1/2/4 px',pairs:t('Farbmischungen')+' · 1 px',gradients:t('Farbverläufe')};
    const top=margin+header,bottom=h-margin-footer;
    const code=ColorInfo.code;
    const tile=(a,b,step,axis)=>{
      const c=document.createElement('canvas');c.width=axis==='v'?step*2:axis==='h'?1:2;c.height=axis==='h'?step*2:axis==='v'?1:2;
      const cctx=c.getContext('2d');cctx.fillStyle=a;cctx.fillRect(0,0,c.width,c.height);cctx.fillStyle=b;
      if(axis==='v')cctx.fillRect(step,0,step,1);else if(axis==='h')cctx.fillRect(0,step,1,step);else{cctx.fillRect(1,0,1,1);cctx.fillRect(0,1,1,1);}
      return ctx.createPattern(c,'repeat');
    };
    const grid=(items,x,y,width,height,draw,columns)=>{
      const cols=columns||Math.max(1,Math.min(items.length,Math.ceil(Math.sqrt(items.length*width/Math.max(1,height)/2))));
      const rows=Math.ceil(items.length/cols);
      items.forEach((item,i)=>{const l=x+Math.floor(i%cols*width/cols),r=x+Math.floor((i%cols+1)*width/cols),a=y+Math.floor(Math.floor(i/cols)*height/rows),b=y+Math.floor((Math.floor(i/cols)+1)*height/rows);if(r>l&&b>a)draw(item,l,a,r-l,b-a,i);});
    };
    sections.forEach((section,i)=>{
      const weights=mode==='all'?(!labels?[16,24,31,29]:compact?[21,28,25,25]:[17,28,25,27]):[1],sum=weights.reduce((a,b)=>a+b,0);
      const x=margin,y=Math.round(top+(bottom-top)*weights.slice(0,i).reduce((a,b)=>a+b,0)/sum),width=w-2*margin;
      const end=Math.round(top+(bottom-top)*weights.slice(0,i+1).reduce((a,b)=>a+b,0)/sum),py=labels?y+font+(compact?1:2):y,height=Math.max(0,end-py-(!labels||compact?1:3));
      if(labels)text(names[section]||'',x,y);if(height<1||width<1)return;
      ctx.save();ctx.beginPath();ctx.rect(x,py,width,height);ctx.clip();
      if(section==='colors') grid(colors,x,py,width,height,(c,l,a,cw,ch)=>{ctx.fillStyle=c;ctx.fillRect(l,a,cw,ch);ctx.strokeStyle='#000';ctx.lineWidth=1;ctx.strokeRect(l+.5,a+.5,cw-1,ch-1);if(labels&&cw>50&&ch>=font+2)text(code(c),l+2,a+2,font,ColorInfo.textColor(c,colors));});
      if(section==='pairs'){
        const group=mode==='pairs'?mixturePage(colors,options.mixSize||2,options.mixPage||0):{items:pairs(colors),page:0};
        grid(group.items,x,py,width,height,(mix,l,a,cw,ch,i)=>{
          let title=mix.map(code).join('/'),labelFont=font;
          if(PixelFont.measure(title,labelFont)>cw-2)labelFont=8;
          if(PixelFont.measure(title,labelFont)>cw-2)title='#'+(group.page*12+i+1);
          const label=labels&&ch>labelFont*2&&cw>(mode==='pairs'?20:45)?labelFont+1:0;
          const pattern=document.createElement('canvas');pattern.width=pattern.height=mix.length;const pc=pattern.getContext('2d');
          mixtureMatrix(mix.length).forEach((row,iy)=>row.forEach((index,ix)=>{pc.fillStyle=mix[index];pc.fillRect(ix,iy,1,1);}));
          ctx.save();ctx.beginPath();ctx.rect(l,a,cw,ch);ctx.clip();ctx.translate(l,a+label);ctx.fillStyle=ctx.createPattern(pattern,'repeat');ctx.fillRect(0,0,cw,ch-label);ctx.restore();
          if(label){ctx.save();ctx.beginPath();ctx.rect(l,a,cw,label);ctx.clip();text(title,l,a,labelFont,extremes.dark);ctx.restore();}
        });
      }
      if(section==='lines') grid(linePairs(colors),x,py,width,height,([color,bg],l,a,cw,ch)=>{
        if(labels&&ch>font*5&&cw>45){text(code(color)+'/'+code(bg),l,a);a+=font+1;ch-=font+1;}
        for(let axis=0;axis<2;axis++)for(let j=0;j<3;j++){
          const left=l+Math.floor(j*cw/3),right=l+Math.floor((j+1)*cw/3),yt=a+Math.floor(axis*ch/2),yb=a+Math.floor((axis+1)*ch/2);
          ctx.save();ctx.translate(left,yt);ctx.fillStyle=tile(color,bg,2**j,axis?'h':'v');ctx.fillRect(0,0,right-left,yb-yt);ctx.restore();
        }
      },lineColumns(width,linePairs(colors).length));
      if(section==='gradients'){
        const gradients=ramps(colors);
        gradients.forEach(([a,b],j)=>{const yt=py+Math.floor(j*height/gradients.length),yb=py+Math.floor((j+1)*height/gradients.length);const g=ctx.createLinearGradient(x,0,x+Math.max(1,width-1),0);g.addColorStop(0,a);g.addColorStop(1,b);ctx.fillStyle=g;ctx.fillRect(x,yt,width,yb-yt);});
      }
      ctx.restore();
    });
    // Two one-pixel diagonals and several text sizes help identify aliasing/orientation.
    if(labels){
    const fy=h-margin-7*Math.max(1,Math.floor(font/8));
    text(t('UL'),margin,fy);
    text(t('UR'),w-margin-PixelFont.measure(t('UR'),font),fy);
    const sample='ABC 0123',sampleWidth=PixelFont.measure(sample,font),side=Math.min(footer-1,12),cx=Math.floor(w*.75-side/2);
    if(w-2*margin>=sampleWidth+side+50){
      text(sample,Math.round((w-sampleWidth)/2),fy);
      ctx.fillStyle='#000';for(let n=0;n<side;n++){ctx.fillRect(cx+n,fy+n,1,1);ctx.fillRect(cx+side-1-n,fy+n,1,1);}
    }
    }
    return canvas;
  }
  root.TestPattern={create,pairs,ramps,lineColumns,linePairs,combinations,mixturePage,mixtureMatrix};
  if(typeof module!=='undefined')module.exports=root.TestPattern;
})(typeof window!=='undefined'?window:globalThis);

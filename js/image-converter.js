/* Shared E-Paper image conversion kernel. GPL-3.0; derived from OEPL-Toolbox. */
(function(root){
  'use strict';
  const fixedMix = root.FixedMix || (typeof module!=='undefined' ? require('./fixed-mix.js') : null);
  const gamut = root.Gamut || (typeof module!=='undefined' ? require('./gamut.js') : null);
  const t = (key, values) => root.I18N ? root.I18N.t(key, values) : key;
  const palettes = {
    BW: ['#ffffff', '#000000'], BWR: ['#ffffff', '#000000', '#ff0000'],
    BWY: ['#ffffff', '#000000', '#ffff00'], BWRY: ['#ffffff', '#000000', '#ff0000', '#ffff00'],
    Spectra3100Plus: ['#ffffff','#000000','#ff0000','#ffff00','#ff8000'],
    Spectra6: ['#ffffff', '#000000', '#ff0000', '#ffff00', '#0000ff', '#00ff00'],
    ACeP7: ['#ffffff', '#000000', '#ff0000', '#ffff00', '#0000ff', '#00ff00', '#ff8000']
  };
  const rgb = hex => hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16));
  const clamp = n => Math.max(0, Math.min(255, n));
  // sRGB -> D50-adapted XYZ -> CIELAB. All palette entries use the same white
  // point; Lab distances avoid treating desaturated tones as saturated orange.
  // Color space definitions: https://www.w3.org/TR/css-color-4/#lab-colors
  function rgbToLab(color) {
    const linear = color.map(v => { const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
    const [r,g,b] = linear;
    const f = v => v > 216/24389 ? Math.cbrt(v) : ((24389/27)*v+16)/116;
    const x = f((.436065742824811*r + .3851514688337912*g + .14307845442264197*b)/.9642956764295677);
    const y = f(.22249319175623702*r + .7168870538238823*g + .06061979053616537*b);
    const z = f((.013923904500943465*r + .09708128566574634*g + .7140993584005155*b)/.8251046025104601);
    return [116*y-16,500*(x-y),200*(y-z)];
  }
  function dimensions(w, h) {
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4096 || h > 4096 || w * h > 4000000)
      throw Error(t('Abmessungen: 1–4096 px, insgesamt höchstens 4 Millionen Pixel.'));
  }
  function renderPalette(colors, renderColors) {
    if (renderColors === undefined) return colors.map(rgb);
    if (!Array.isArray(renderColors) || renderColors.length !== colors.length || renderColors.some(c => typeof c !== 'string' || !/^#[0-9a-f]{6}$/i.test(c)))
      throw Error('renderColors: one #RRGGBB value per output color required.');
    return renderColors.map(rgb);
  }
  function quantize(data, width, height, colors, options = {}) {
    dimensions(width, height);
    const outputPalette = colors.map(rgb), profilePalette = renderPalette(colors, options.renderColors);
    // Continuous preparation is left to the AP; profiles apply to local quantization.
    const palette = ['rgb','gamut'].includes(options.dither) ? outputPalette : profilePalette;
    // Explicit drawing colors retain their selected output index. Inserted image
    // intermediate colors still use the profile, while source photos do not opt in.
    const exactNominal=options.exactNominal?new Map(outputPalette.map((c,i)=>[c.join(','),i])):null;
    const indices = new Uint8Array(width * height);
    const out = new Uint8ClampedArray(data.length), work = new Float32Array(width * height * 3);
    const {brightness = 0, contrast = 1, saturation = 1, threshold = 128, dither = 'none', strength = 1, biases = []} = options;
    for (let p = 0; p < indices.length; p++) {
      const c = [0, 1, 2].map(k => data[p * 4 + k]);
      const lum = c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
      for (let k = 0; k < 3; k++) work[p * 3 + k] = clamp((lum + (c[k] - lum) * saturation - threshold) * contrast + 128 + brightness);
    }
    // Continuous output uses the same corrections, but never chooses discrete colors.
    if (dither === 'rgb' || dither === 'gamut') {
      const project = dither === 'gamut' ? gamut.prepare(palette) : c => c;
      for(let p=0;p<indices.length;p++) {
        const c=project([work[p*3],work[p*3+1],work[p*3+2]]);
        for(let k=0;k<3;k++)out[p*4+k]=c[k];
        out[p*4+3]=data[p*4+3];
      }
      return {data:out,indices,width,height,continuous:true};
    }
    if(options.reflectance){const renderer=root.Reflectance||(typeof module!=='undefined'?require('./reflectance.js'):null);return renderer.quantize(data,width,height,colors,options,work);}
    if(dither==='fixed'){
      const mixing=fixedMix.prepare(palette,{maxColors:options.mixColors??2,biases,toLab:rgbToLab});
      for(let y=0;y<height;y++)for(let x=0;x<width;x++){
        const p=y*width+x,mix=mixing.choose([work[p*3],work[p*3+1],work[p*3+2]]),chosen=mixing.index(mix,x,y);
        indices[p]=chosen;out.set(outputPalette[chosen],p*4);out[p*4+3]=data[p*4+3];
      }
      return {data:out,indices,width,height};
    }
    const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const mixes = new Map();
    const paletteLab = palette.map(rgbToLab);
    const nearestPerceptual = (c, biasScale = 1) => {
      const bounded = c.map(clamp), lab = rgbToLab(bounded);
      const overflow = c.map((v,k) => v-bounded[k]);
      let best = Infinity, chosen = 0;
      for (let i=0;i<palette.length;i++) {
        const reference = paletteLab[i];
        // Scale Delta-E squared to the old bias range (black-to-white span).
        // Diffusion residuals can exceed sRGB bounds. Continue the distance
        // outside the cube using the RGB overflow term, rather than discarding
        // negative error or passing invalid colors into the Lab conversion.
        const distance = ((reference[0]-lab[0])**2 + (reference[1]-lab[1])**2 + (reference[2]-lab[2])**2)*19.5075 - 2*(overflow[0]*palette[i][0]+overflow[1]*palette[i][1]+overflow[2]*palette[i][2]) - (biases[i] || 0)*650*biasScale;
        if (distance < best) { best = distance; chosen = i; }
      }
      return chosen;
    };
    // Map the source into the palette's RGB convex gamut BEFORE diffusion.
    // Otherwise impossible hue components accumulate and travel across the
    // image, suppressing valid accent colors in subsequent regions.
    if(dither==='floyd'&&strength>0){
      const project=gamut.prepare(palette);
      for(let p=0;p<indices.length;p++){
        const c=[work[p*3],work[p*3+1],work[p*3+2]],mapped=project(c);
        // Keep the same direct-mapping endpoint at zero strength, even when
        // gamut mapping changes which single color would be nearest.
        const base=strength<1?palette[nearestPerceptual(c)]:null;
        for(let k=0;k<3;k++)work[p*3+k]=base?base[k]+(mapped[k]-base[k])*strength:mapped[k];
      }
    }
    function orderedColor(c, closest, rank) {
      if (strength <= 0 || c.every((v,k) => v === palette[closest][k])) return closest;
      // A 4×4 tile represents a mixture of 16 actual palette colors. Keep the
      // signed RGB residual while building that mixture, rather than adding a
      // scalar brightness offset which can change the hue on uneven palettes.
      // Cache on a 5-bit RGB grid to bound work for photographs and large images.
      const bins = c.map(v => Math.round(v*31/255));
      const key = (((bins[0]<<10)|(bins[1]<<5)|bins[2])*palette.length) + closest;
      let mix = mixes.get(key);
      if (!mix) {
        const target = bins.map((v,k) => palette[closest][k] + (v*255/31 - palette[closest][k])*strength);
        const sum = [0,0,0]; mix = [];
        for (let sample = 0; sample < 16; sample++) {
          const index = nearestPerceptual(target.map((v,k) => v*(sample+1)-sum[k]), strength);
          mix.push(index); for (let k=0;k<3;k++) sum[k] += palette[index][k];
        }
        // Refine each entry against the average of the whole tile.
        for (let sample=0;sample<16;sample++) {
          const previous = palette[mix[sample]];
          const index = nearestPerceptual(target.map((v,k) => v*16-sum[k]+previous[k]), strength);
          mix[sample] = index;
          for (let k=0;k<3;k++) sum[k] += palette[index][k]-previous[k];
        }
        const luminance = index => palette[index][0]*.2126 + palette[index][1]*.7152 + palette[index][2]*.0722;
        mix.sort((a,b) => luminance(a)-luminance(b) || a-b); mixes.set(key,mix);
      }
      return mix[rank];
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const c = [work[p*3], work[p*3+1], work[p*3+2]];
      // The same perceptual decision is used at every strength and in every mode.
      let chosen = exactNominal?.get(c.join(',')) ?? nearestPerceptual(c, dither === 'floyd' && strength > 0 ? strength : 1);
      if (dither === 'ordered') chosen = orderedColor(c, chosen, bayer[(y%4)*4+x%4]);
      indices[p] = chosen;
      for (let k = 0; k < 3; k++) out[p * 4 + k] = outputPalette[chosen][k];
      out[p * 4 + 3] = data[p * 4 + 3];
      if (dither === 'floyd' && strength > 0 && data[p * 4 + 3]) {
        for (const [dx, dy, weight] of [[1, 0, 7], [-1, 1, 3], [0, 1, 5], [1, 1, 1]]) {
          if (x + dx < 0 || x + dx >= width || y + dy >= height) continue;
          for (let k = 0; k < 3; k++) work[((y + dy) * width + x + dx) * 3 + k] += (c[k] - palette[chosen][k]) * weight / 16;
        }
      }
    }
    return {data: out, indices, width, height};
  }
  root.OEPLImage = {version:'1.0.0',palettes,rgb,rgbToLab,dimensions,renderPalette,quantize};
  if(typeof module!=='undefined')module.exports=root.OEPLImage;
})(typeof window!=='undefined'?window:globalThis);

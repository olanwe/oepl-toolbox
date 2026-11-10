# Rendering example

## Photograph: 7.5-inch portrait format

- `portrait-source.png`: original AI-generated portrait resized and center-cropped to 480 × 800 pixels, corresponding to an 800 × 480 display rotated 90°. An adult woman with blue eyes and a blue knit sweater, red and yellow tulips, green leaves, warm window light and an olive/brown background. Original person and composition, generated with OpenAI's built-in image generator; no text, logos or existing poster artwork included.
- `portrait-bwry.png`: actual Toolbox Floyd–Steinberg output at strength 1, with exactly four opaque colors: #FFFFFF, #000000, #FF0000 and #FFFF00. No post-processing applied to this display image.
- `portrait-distance.png`: preview only, derived from the finished BWRY pixels using `PreviewFilter.blurPixels` from `js/preview-filter.js`, Gaussian radius 1.2 pixels. Filtering occurs at native 480 × 800 resolution before any display scaling. This preview intentionally contains intermediate RGB tones and must not be confused with the palette-limited display file. It is not calibrated to a physical viewing distance.
- `portrait-settings.json` and `portrait-preview-settings.json`: exact converter and preview parameters. Other converter options use defaults; no illustration enhancement.

Reproduce by decoding `portrait-source.png` to RGBA, passing `portrait-settings.json` to `converter.convert`, and encoding the unchanged result as PNG. For the distance preview, call `blurPixels(output.data, 480, 800, 1.2)` and encode that separate buffer. The filter does not modify the display output.

Any apparent blue in the converted eyes or sweater is a visual impression; there are no blue pixels in the display file. Appearance depends on panel pigments, viewing conditions and image presentation.

## Comic: fixed mixtures

- `comic-source.png`: AI-generated garden illustration, resized to 400 × 300 pixels. Created for this project with OpenAI's built-in image generator; not a photograph or a public-domain artwork claim. The English speech bubble, contrasting tree trunk, dark red shirt and light skin were refined before conversion.
- `comic-bwry.png`: actual lossless Toolbox output, not an AI-generated imitation of dithering. Exactly four opaque pixel colors: white (#FFFFFF), black (#000000), red (#FF0000), yellow (#FFFF00).
- `comic-settings.json`: converter options. All other options use their defaults; no illustration optimization, blur or post-processing was applied.

To reproduce, decode `comic-source.png` into RGBA bytes and pass them to `js/image-api.js`:

```js
const converter = require('../../js/image-api.js');
const options = require('./comic-settings.json');
const output = converter.convert({ ...options, data: rgbaBytes });
// Encode output.data as a lossless 400 × 300 PNG.
```

The paths above are relative to this directory. See [the converter API](../../IMAGE-CONVERTER.md) for integration details. The limit of two refers to display colors per mixture, not the total number of visible tones.

Generation brief: a flat-color garden comic with a girl, red bicycle, olive vegetation, flowers and a cottage; bold black outlines and the exact speech bubble “ONLY FOUR COLORS?”. Final targeted correction: dark burgundy shirt (#802020), uniform light peach skin (#F7D4B3), preserving the rest of the scene. Source artwork was generated; conversion was deterministic.

These example assets are distributed with the repository under its [GPL-3.0 license](../../LICENSE).

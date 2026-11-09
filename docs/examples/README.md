# Rendering example

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

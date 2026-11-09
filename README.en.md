# OEPL-Toolbox

Browser tools for preparing e-paper images and LED blink sequences for OpenEPaperLink. Originating from Oliver Weyhmüller's [img2vlw](https://github.com/olanwe/img2vlw), expanded into this toolbox with AI assistance, including ChatGPT/Codex.

This is an independent project, not an official OpenEPaperLink application and not affiliated with the OpenEPaperLink project. [Deutsche Anleitung](README.md).

## Getting started

Download [oepl-toolbox.html](oepl-toolbox.html) using GitHub’s “Download raw file” button and open it locally in a browser. No installation, account or internet connection is required for image editing or LED simulation. Connecting to an AP requires network access and permission from the browser.

When using the source checkout, open `img2vlw.html` and keep `style.css`, `js/` and `vendor/` alongside it. Run `npm run build` to create `dist/oepl-toolbox.html`. Node.js is only needed for development and building the standalone file. `legacy.html` preserves the original application.

## Language

Use the selector in the header to choose German or English. On first use, the app selects the first supported language in the browser's preference list, falling back to English. An explicit selection is saved locally and takes precedence on subsequent visits. If browser storage is blocked, the selection still works for the current page.

Switching language does not reload the page. Images, crops, orientation, color settings, LED designs and simulation position are retained. Custom preset names, file names, AP addresses and display aliases are not translated.

## Image editor

1. Open an image or select **Load example**. PNG, JPEG, WebP, BMP and GIF can be imported. Animated images are treated as a single browser-rendered frame.
2. Select a palette and the display's native dimensions, or connect to an AP and apply the selected display profile.
3. Set **Rotate output display** for the physical orientation of the display. This changes the output workspace without rotating the source or resetting its crop. Sending always restores the native display dimensions and orientation.
4. Use **Rotate source image** independently if the source itself needs rotation. Rotating the source resets its crop to the full rotated image.
5. Select a crop using the source preview or numeric fields. Choose fit, fill or stretch and adjust brightness, contrast, saturation, threshold and individual color preferences.
6. Select no dithering, Floyd–Steinberg or Bayer 4 × 4. Double-click any slider to restore its default value.

The comparison preview stays visible while scrolling through editing controls. On narrow screens it is shown as a compact panel above the controls.

Standard palettes include BW, BWR, BWY, BWRY, Spectra6 and ACeP7. Custom palettes support 2–16 distinct colors in any order; white is optional. Palette values are RGB targets, not measurements of a particular panel. Adding colors does not add physical display capabilities.

Output images are limited to four million pixels and 4096 pixels per axis. Source images are limited to 24 million pixels. Inversion swaps pure black and white, preserving accent colors and alpha.

## Export

- **PNG:** lossless pixels and transparency.
- **OEPL-JPEG:** baseline JPEG, quality 100, 4:4:4 without chroma subsampling. JPEG is still lossy. Transparent pixels are composited onto white.
- **VLW font:** one cropped glyph per color layer, including white and an optional alpha coverage mask. The manifest records colors, drawing order and orientation.

The save orientation selector applies to local downloads and AP file storage. Direct sending and the VLW test always use the native display orientation.

VLW glyphs use format version 11. Legacy black/accent characters are preserved; additional layers extend the image font. Color layers already include alpha: do not draw the coverage mask as another color. The x-position-zero patch requires binary transparency. The OEPL VLW renderer may display glyphs exceeding 255 pixels incorrectly. Partial transparency and all panel types have not been physically validated.

Existing `img2vlw-led-v1` designs, VLW image fonts and layer manifests remain compatible. Their format identifiers have intentionally not been renamed.

## AP connection and sending

Enter an AP address, connect and select a display. Known-AP discovery checks saved addresses and `openepaperlink.local`; a browser cannot scan the whole network. Use a manual address if discovery fails. Browser CORS, mixed-content or local-network restrictions may require hosting the app on the AP itself.

**Load AP image as source** loads the AP's stored preview, not a readback of the physical display. RAW, zlib and Group5 previews are supported where the AP provides the required data. Group5 decoding uses the selected AP's decoder in a temporary isolated worker.

Sending replaces the selected display's image at its next check-in. Applying a profile does not automatically send anything. AP-side rotation or inversion may additionally alter the delivered image.

For HTTP 413, the toolbox automatically transfers the same JPEG unchanged through the AP file manager, verifies it byte for byte, then requests static image mode 22 with AP dithering disabled. The temporary file has a unique `/images/i2v-….jpg` path. It requires free AP storage and may take longer. The request asks the firmware to delete the temporary JPEG after successful processing; failed processing can leave the file behind. File/image transfer timeouts are two minutes. An accepted request does not confirm a completed physical refresh.

## AP files and VLW tests

JPEG and VLW files can be stored under `/images` and `/fonts`. Existing files are protected unless overwriting is explicitly enabled. File names are limited to 31 characters; allow room for the `.layers.json` suffix when naming a VLW font. Every uploaded file is read back and verified.

The file browser can import image files and compatible VLW image fonts. A saved layer manifest supplies the palette and drawing order; otherwise check the current palette before importing VLW files.

For a VLW test, choose X/Y coordinates in the display's native coordinate system. The toolbox uploads the native font and manifest, verifies both, then sends the JSON template. The mask is omitted from drawing. This replaces the display's previous content mode and image.

## LED designer

Configure three groups with colors, pulse counts, gaps and total runs. Select the actual firmware profile and channel wiring order; the AP's display name is not enough to identify the correct firmware behavior.

- **nRF52811 / OEPL Newton M3:** seven-slot PWM, profile-specific channel levels and repeat limits.
- **ESP32 / OpenDisplay:** modeled OpenDisplay firmware behavior, including scheduler gaps. This is not a generic profile for all ESP32 devices or AP status LEDs.
- **EFR32xG22 / OEPL RGB:** binary RGB channels, different pulse/count encoding and no infinite repetition.

Supported channel orders are RGB, RBG, GRB, GBR, BRG and BGR. The GUI rounds colors to the available hardware levels. The timeline shows one run; the simulation supports visible pulse extension, nominal real-time playback and slowed individual PWM slots.

The energy analysis models LED duty and optional additional current during pulse windows. Default currents are examples, not measurements. Radio activity, display refresh, sleep current and driver losses are excluded. Timing also omits radio latency and some scheduling overhead. The results are not a battery life prediction.

Save designs as browser presets or JSON. Sending translates the design into the AP's `/led_flash` command; it does not send an image template. **Pause** only pauses the browser simulation. **Send LED stop** sends a separate hardware command, which may only take effect at the next check-in. AP acceptance is not visual confirmation of blinking.

Detailed timing assumptions and firmware source links are in [LED-DESIGNER.md](LED-DESIGNER.md) (German).

## Development and translations

Run `npm test` for image, AP, LED and localization tests. Browser workflows are in `tests/*browser-check.js`.

`js/i18n.js` handles language detection, persistence, selection and number formatting. `js/locales/en.js` contains the English catalog; German source strings are stable keys and fallback text. Static text uses `data-i18n`; translated attributes use `data-i18n-placeholder`, `data-i18n-title` and `data-i18n-aria-label`. Dynamic text explicitly calls `t(...)`. Translation does not scan or rewrite arbitrary user data or protocol payloads.

To add a language, add a catalog under `js/locales/`, include it before `i18n.js`, and update the supported languages, locale mapping and selector. Prefer complete messages with `{parameter}` placeholders for new dynamic text. The standalone build bundles catalogs; no translation service is called at runtime.

## License

GPL-3.0; see `LICENSE`. The bundled jpeg-js encoder is BSD-3-Clause; see `vendor/jpeg-js.LICENSE`. Original project: [olanwe/img2vlw](https://github.com/olanwe/img2vlw).

## Dithering correction in 2.3.1

Bayer 4×4 now constructs each tile from a mixture of 16 actual palette colors rather than adding a shared brightness offset to all RGB channels. This avoids the strong orange cast previously seen with olive and gray colors in the ACeP7 palette. Mixtures are cached on a 5-bit RGB grid; exact palette colors are preserved. Zero dithering strength still uses nearest-color mapping. Floyd–Steinberg now propagates signed RGB error without prematurely clipping it to 0–255.

A 16-position tile only approximates intermediate tones. Standard palettes remain ideal RGB targets, not measured calibrations for individual ACeP/Spectra panels.

## Direct color mapping in 2.3.2

Without dithering, mapping now compares CIELAB distances (D50, converted from sRGB) instead of raw RGB distances. This prevents neutral grays in ACeP7 from being tinted orange simply because orange is present in the palette. Both dither modes use the same direct mapping at zero strength. Exact palette colors and alpha are preserved, and color preferences still apply. Bayer mixtures and signed Floyd error propagation continue to use RGB residuals.

Without dithering, each pixel still uses exactly one palette color: dark desaturated greens can map to black, and lighter tones to white. Photographic intermediate tones require dithering. The conversion follows [W3C color space definitions](https://www.w3.org/TR/css-color-4/#lab-colors); it does not calibrate real display pigments.

## Dithering strength in 2.3.3

All color decisions now use the same perceptual comparison at every strength, replacing the former switch between Lab at zero and RGB above zero. Out-of-range error contributions are accounted for separately, so signed diffusion error is not discarded.

For both methods, zero means direct mapping and one means full dithering. Intermediate values blend the adjusted source toward its direct quantized result before building the raster. Floyd–Steinberg then propagates the full residual; merely reducing the error weights does not give a reliable fade toward the direct result. Color preferences are retained without applying them twice near the weak-raster endpoint.

Neutral grays remain neutral with standard palettes throughout the strength range. Reducing strength no longer creates a general orange bias. Pixel choices are still discrete, especially for Bayer 4×4 with only 16 positions, so visible steps are possible. Genuine orange image content can still map to orange.

## Content-only export and preview recovery (2.4.0)

In **Export**, enable **Save image area only (without fit margins)** to omit margins added when fitting the source crop onto the display canvas. Bounds are calculated from image placement, not by detecting white or transparent pixels. Margins already present in the source are preserved. Fill and stretch do not add margins. Partially covered edge pixels are included.

PNG, JPEG, VLW, layer manifests and AP file storage honor this option and the selected file orientation. File dimensions are shown in the export section. Direct display delivery and VLW testing continue to use the full native display canvas. Manifests additionally record `exportArea` and bounds in the working view; older manifests remain readable.

**Reset crop** restores the full source and fits the previews. The former source-size button is now **Crop dimensions (1:1)**: it sets output dimensions from the selected source crop, accounting for display orientation. Dimensions are validated before any fields change. An oversized source no longer leaves the output invalid or clears its valid preview. Both actions, loading an image and rotating the source fit the previews and reset their scroll position.

From 2.4.1, the 255-pixel warning appears as a highlighted amber notice above the export buttons, even when VLW settings are collapsed. The VLW test section separately highlights oversized native glyphs. Export remains available.

## Activity status and crop editing (2.5.0)

Exports, imports, AP connections, file transfers, profile requests and LED network actions show a temporary pinned status. It initially follows the normal status line and pins to the viewport top when that line scrolls away. Two counter-rotating gears, matching the [ESP32 SSID/PSK patcher](https://www.weyhmueller.org/webtools/esp32_ssid_patcher.html), indicate active work. Reduced-motion preferences disable their animation.

Completion remains visible for six seconds, or ten seconds for errors. The original status line retains the message afterwards. Completed notifications can be dismissed early. Concurrent operations are counted; one operation finishing does not stop another operation's indicator. Large JPEG fallback uploads show an explicit verified-file/activation phase until the AP responds. Buttons become available again afterwards.

Enable crop selection to edit an existing crop. Drag inside to move it; use its eight handles or full edges to resize it within the source image. Dragging inside an initially full-image selection creates the first crop. **Draw a new crop** lets you replace an existing crop, including by drawing inside it.

**Lock crop to display aspect ratio** follows the current working display orientation when drawing, moving, resizing or editing numeric fields. Changing display dimensions or orientation updates the locked crop. Enabling the lock fits the existing selection to the ratio. Resetting chooses the largest fitting crop while the lock is enabled.

A locked crop may use fractional source-pixel coordinates to retain its ratio. Export dimensions remain whole display pixels. The 1:1 output-size action rounds crop dimensions to whole pixels. A source too small to accommodate that ratio with at least one source pixel per axis disables the lock with an explanatory message.

From 2.5.1, status gears use direct SVG artwork instead of CSS masks. Eight and five teeth mesh with matching spacing, phase and opposite rotational speeds in an 8:5 ratio, removing the small gear's rectangular mask artifacts.

## Gzip fonts and VLW-specific size note (2.6.0)

**Compress VLW with gzip (.vlw.gz)** is enabled by default. Downloads use `name.vlw.gz`, or `name.vlw` when disabled. Compression is lossless and does not alter glyph dimensions, alpha, palette layers or drawing order. The compact size note is attached to the VLW button and refers generally to the VLW renderer. PNG and JPEG are unaffected. Gzip does not remove the 255-pixel glyph limitation.

AP file storage and VLW testing upload and verify the compressed file. Templates continue to reference `name.vlw`, as described in the current [OEPL release notes](https://github.com/OpenEPaperLink/OpenEPaperLink/releases); firmware falls back to `name.vlw.gz` when the uncompressed file is absent. The manifest stays `name.layers.json` and records the actual file path and compression. An existing uncompressed font with the same base name blocks the compressed upload/test, because the AP would prefer that file. The toolbox does not delete it automatically.

**Open image or VLW**, dropping onto the source preview and the AP file browser accept compatible `.vlw` and `.vlw.gz` image fonts. Gzip is detected by content and unpacked automatically. AP imports use a matching layer manifest where available. For local import without a manifest, select the appropriate palette first: VLW files do not store the RGB layer mapping. General text fonts are not supported as image-font imports.

Compression and decompression use native browser APIs without external services. Unsupported browsers show an actionable error; disable gzip for plain export. Damaged archives are rejected. Compressed and expanded font data are limited to 80 MiB.

## Test charts and free image placement (2.7.0)

Next to “Load example”, choose a test chart section and click “Generate test chart”. Generation replaces the source using the current display dimensions, orientation and palette. Color adjustments, inversion and dithering are reset. Nothing is sent automatically.

The complete chart includes resolution, a one-pixel border, orientation/corner marks, all palette colors, horizontal/vertical lines with 1/2/4-pixel strokes and gaps, every unordered color pair as a one-pixel checkerboard, grayscale/color ramps, text samples and diagonals. Individual sections can fill the chart for smaller displays or larger palettes. Line fields follow palette order: vertical lines above horizontal lines, widths 1/2/4 from left to right. Lines are tested against the lightest palette color; the reversed duplicate is omitted. W/K/R/Y/B/G/O stand for white/black/red/yellow/blue/green/orange.

Full-screen solid color uses one selectable palette color without labels or borders. Full-screen checkerboard uses two palette colors and a 1–64-pixel cell size (double-click resets to 1). Click Generate after changing parameters. Color noise independently samples palette colors using a reproducible 32-bit seed, including zero; “New seed” selects another value. Noise is useful for large, poorly compressible upload tests. JPEG file size and subsequent radio payload size are different quantities. No automatic stress loop is run.

Enable dithering after generation to examine ramps. PNG preserves the pixel grid losslessly; quality-100 JPEG can still alter pixels. Existing AP delivery and VLW test workflows remain available.

Choose **1:1 · no resizing** under Fit to preserve source/crop pixel dimensions for any supported source format while retaining display dimensions. Integer crop coordinates are required; disable aspect ratio locking if necessary. Small images gain margins; oversized images are clipped at the display edge. Drag the image in the output preview or set X/Y offsets relative to its centered position. Center image resets both offsets.

**Free scaling and positioning** adds a 1–400% scale slider (double-click resets to 100%). Selected interpolation applies when resizing. View zoom only affects the preview. Color conversion remains active; this is not a byte-for-byte file copy. Content-only export respects placement, scaling and clipping, while direct delivery retains native display dimensions. New source images are centered again; free scale is retained.

Ghosting requires multiple image transitions. Automatic ghosting sequences and special-image/slideshow preloading are not part of this version.

## Test chart correction and drawing layer (2.8.0)

Diagnostic labels now use a non-antialiased 5×7 pixel font, preserving small letters through quantization. Enlarged previews keep their top/left edges reachable. Test chart labels can be automatic, full or resolution-only. Automatic omits labels below 200 pixels high or 240 pixels wide, leaving resolution and a diagonal cross while expanding test regions. Solid color, full-screen checkerboard and noise remain borderless and unlabeled.

Gradients cover each unordered palette pair exactly once. BWR uses black→white, black→red and white→red, with no reversed duplicate grayscale ramp.

Expand **Drawing layer** under Source and output, enable Draw on output image, then work in the output preview. Source positioning by dragging is disabled while drawing is active.

- Drag lines, rectangles and squares; circles are dragged outward from their center. Choose a palette color, stroke width and optional fill.
- Text supports multiple lines, size and bold. Click to place it.
- Insert image loads a local raster file, uses the chosen width while retaining aspect ratio, and places it on click. Optional smoothing controls interpolation. Limit: 4 million pixels per inserted image and 12 million pixels across image assets referenced by history.
- The eraser removes drawings only, exposing the converted background. It supports dragging and single clicks, using the stroke-width setting.
- Undo/redo includes erasing and clearing. Escape cancels the current gesture. Double-click size sliders to restore defaults.
- Show drawing layer also controls visibility in exports/delivery. Blank drawing canvas creates a white source with current display dimensions and enables drawing, retaining existing drawings; clear them explicitly if needed.

The layer is composed after source conversion. Source adjustments, inversion, crop, scaling and source replacement do not modify drawing operations. They use native display pixels and follow view rotation. Changing display dimensions clips rather than scales them. Hide or clear the layer when an unmodified diagnostic chart is required.

Drawing colors and inserted images are mapped to the current palette without dithering. Layer coverage is binary (alpha 128 or higher becomes opaque). PNG/JPEG/VLW exports, AP filesystem storage, direct delivery and VLW tests include the visible layer. Content-only export expands to include drawings outside the source footprint.

Drawing history exists only for the current browser session. Exports contain the flattened result, not an editable project. Existing objects can be selected, moved and resized as described in the 2.10.0 section.


## Compact line section (2.8.1)

Line tests now use 1/2/4-pixel strokes and gaps. The combined chart allocates less height to lines and more to color mixtures and gradients. The full-screen line section remains available.


## Line field layout (2.8.2)

Line colors stay in one row whenever at least 24 pixels per color are available. Narrow displays or large custom palettes use balanced rows. Line fields no longer use the mixture grid’s automatic column selection.

## Flexible palettes and editable drawing objects (2.10.0)

Custom presets accept 2–16 distinct #RRGGBB colors in any order. White is optional; input order is retained. VLW export/import identifies white by RGB value instead of assuming its position. Inversion still requires both white and black. Chart ramps cover all pairs, including palettes without black/white. AP font imports no longer add white when absent.

Spectra3100Plus adds a five-color white/black/red/yellow/orange palette. E Ink lists panels for ESL applications at https://www.eink.com/brand/detail/Sepctra3100Plus . This palette does not confirm OEPL compatibility of a particular tag model. Values are logical RGB targets, not panel measurements.

Color labels use an internal exact-RGB lookup table. The color legend shows abbreviations, translated names and hex values. K means black, leaving B for blue. Additional labels: C cyan, M magenta, T turquoise, V violet, P purple, PK pink, GY gray, BN brown, DG dark green, N navy and TL teal. Unspecified custom colors retain their hex code rather than an approximate name. These labels are not OEPL color numbers. Drawing choices show code/name/hex and a swatch shows the current drawing color.

**Edit existing objects:** choose Select / edit, then click an element or select it from Existing element. Drag it to move; drag corner handles to resize. Rectangles and lines resize freely; square, circle, text and image retain aspect ratio. Image width updates when resized. Text content, size and bold remain editable. Color, stroke width and fill update the selected object. Remove element deletes only the selection. All edits, movement, resizing and deletion support undo/redo. Escape cancels the current gesture.

Edits retain drawing order. Clicking selects the top matching bounding box; the element list also reaches overlapping objects underneath. Eraser strokes are not selectable objects and remain at their display positions. Selection frames/handles are excluded from export and delivery. Native coordinates, view rotation and independent source conversion are retained.

An expanded drawing editor scrolls with the page to keep other controls reachable on small screens. Editing remains session-local; exported images/fonts are flattened results, not editable projects.

On the tested AP, M3 4.2 BWY and M3 7.5 BWRY both define yellow as colortable #FFFF00 / perceptual #C8C800. HS 7.5 BWRY uses #FFFF00 for both. Identical profile values do not guarantee identical physical panel colors. The toolbox currently uses colortable for conversion and preview; a separate perceptual preview is not included. AP access in this update was read-only.

## Independent preview zoom and larger workspace (2.11.0)

The five-color option is labeled **BWRYO · Spectra 3100 Plus**, showing both its colors and technology name while keeping the stored palette key unchanged.

Source and output each have a zoom selector next to their heading: Fit or 25/50/100/200/400/800%. Zoom affects display only, retaining crop, placement, scaling, display dimensions and exports. At 100%, one original image pixel occupies one CSS screen pixel. Explicit source zoom uses full source resolution even beyond the reduced Fit-preview backing size. Crop and drawing coordinates follow the respective zoom. Oversized previews can be scrolled to all edges.

The page now uses available width on large screens. Image area (% window height) adjusts both preview wells from 25 to 85% of window height, default 55%; double-click restores 55. A panel taller than the viewport scrolls with the page to keep its controls accessible.

Expand workspace hides the header, tool navigation and introduction while retaining image settings beside the previews. Restore workspace or Escape returns to normal. Escape first cancels an active drawing/edit gesture; the next Escape restores the workspace. Both zoom settings survive workspace toggling. Loading a new source, resetting the crop, using Crop size (1:1) or rotating the source continues to reset previews to Fit.

## Light/dark appearance and preset labels (2.12.0)

The **Appearance** selector next to Language offers Automatic, Light and Dark. Automatic is the default and follows the system/browser color preference, including live changes. A manual choice overrides it and is saved locally, applied before the initial page paint on reload. If storage is blocked, appearance remains usable for the current session. Other tabs under the same origin synchronize preference changes through browser storage events.

Appearance covers image/drawing editors, export/AP panels, LED designer, timeline, form controls and status messages. Image pixels, palette swatches, inserted images, LED colors, JSON and exports are preserved. In expanded workspace mode, restore the regular view to access the hidden header selector.

Type-specific labels now start with color identifiers: **BWRYO · Spectra 3100 Plus**, **BWRYGB · Spectra 6**, **BWRYGBO · ACeP 7**. BW/BWR/BWY/BWRY remain color combinations without claiming a unique panel type. Stored keys and RGB values are unchanged. Combination labels use the common B for Black and another B for Blue in multi-color types; the individual color legend keeps K for black and B for blue.


## Grouped test image tools (2.12.1)

All test-pattern generation and example-image controls are grouped in **Test and example images** under Source and output, collapsed initially. This includes pattern selection, generation, example loading and mode-specific options. Expanding/collapsing preserves image content and settings. Preview zooms, area height and drawing layer remain separate.


## Unique line fields (2.12.2)

Line tests use each other color once against the lightest palette color. BW has one black/white field, BWR two fields, and ACeP7 six. The reversed lightest-color field is omitted in both combined and full-screen charts, including custom palettes. Color patches, mixtures and gradients retain every palette color.


## Color-patch label contrast (2.12.3)

Test-chart patch labels use the lightest palette color below 50% weighted RGB brightness, and the darkest at or above 50%. Brightness is (0.2126 R + 0.7152 G + 0.0722 B), normalized to 0–1, not a physical panel measurement. If a custom palette contains only dark or only light colors and the chosen ink equals its background, the other palette extreme is used.


## Markers at the actual corners (2.12.4)

Fully labeled charts place TL/TR/BL/BR at the corresponding actual corners (OL/OR/UL/UR in German). Resolution has a separate line; the single ABC 0123 font sample is centered at the bottom, separate from the diagonal cross. Right alignment uses measured pixel-font width. Reduced-label charts continue to omit corner text.

## Multi-color mixtures and distance preview (2.13.0)

The standalone **Color mixtures** chart lets you choose groups of two through all palette colors. Every unordered combination appears once, with equal shares. Two colors retain the one-pixel checkerboard. Larger groups use an n×n pixel tile containing n pixels of each color. Clipped field edges can slightly change whole-field counts.

Pages contain up to twelve fields. Previous/Next generates the selected page; enter a page number to jump. After changing colors per mixture, click Generate test chart. The field legend follows reading order; long field captions fall back to numbered references. Combined charts retain only their original two-color mixtures. BWRY has four triples and one four-color mixture; ACeP7 has 35 triples across three pages. Large custom palettes are paginated too. No automatic transmission sequence or unequal-ratio mixtures are added.

**Distance preview (blur)** below the output preview ranges from 0 to 4 native image pixels in 0.25 steps. It changes only the displayed canvas. Filtering precedes display scaling at native output resolution (see 2.13.1). Source, conversion, crop, image/font exports and AP delivery are unaffected. Double-click restores zero. This gives a qualitative impression of pixel patterns merging at distance; it is not a calibrated viewing-distance or physical-panel simulation. Image captions are blurred; selection guides stay sharp as of 2.13.1.

## Blur before display scaling (2.13.1)

Distance preview now **filters a separate copy at native output resolution before any display scaling**. Radius remains measured in native pixels. No CSS blur is applied after downscaling. Filtered previews use smooth display scaling; zero retains the crisp pixel view. This reduces moire risk in fine dither/mixing patterns, though very weak blur may leave visible raster structure.

The native filtered copy is reused across zoom changes, avoiding zoom-dependent or cumulative filtering. Edge pixels are extended to preserve opaque borders. Browsers without Canvas filters use an alpha-aware native Gaussian fallback.

Selection frames and resize handles are painted afterward and remain sharp; captions belonging to image pixels are blurred. Live drawing previews follow the same order. Logical converted data, source preview, all exports and AP delivery remain unfiltered. This remains a qualitative approximation rather than a calibrated viewing distance.

## Clipboard images (2.14.0)

**Ctrl+V / Cmd+V** pastes copied images/screenshots into the image editor. With drawing inactive it replaces the source. With drawing active and a source present, it creates a separate image object, centered and reduced to fit the output view if necessary. The object is selected for moving/resizing and supports undo/redo; the source is retained.

**Paste image** beside Open image explicitly replaces the source, even while drawing is active. **Paste from clipboard** in Insert image explicitly inserts a drawing object. Create/load a source or blank drawing canvas first. Existing source/inserted-image size limits apply.

Text/number inputs and editable text areas retain normal paste behavior. Plain text, HTML and image URLs alone are not imported; actual raster clipboard data is required. Supported formats are PNG, JPEG, WebP, BMP, GIF and AVIF when decodable by the browser. The LED designer ignores image paste events.

The buttons require the browser Clipboard read API and possibly a permission prompt/secure context. When unavailable or denied, use the keyboard shortcut, which does not require that read API. Clipboard data is accessed only on explicit button activation or paste, never automatically. Empty/invalid data or access errors preserve the current image. Nothing is sent automatically.

## Floyd-Steinberg: prevent out-of-gamut error contamination (2.15.0)

An impossible color component, such as excess green in BWRY, previously accumulated in error diffusion and affected later regions. This could suppress accents in otherwise representable warm colors, causing abrupt gray/color transitions in skin tones.

For positive Floyd-Steinberg strength, adjusted source colors are now projected onto the convex RGB gamut of the selected palette before diffusion. Signed diffusion errors remain unclipped. Two-color, planar and custom palettes without white are supported. Projection is continuous, without quantizing the projected target onto an RGB grid; a bounded cache stores exact integer RGB inputs.

Reduced strength retains the original direct-mapping endpoint even when projection changes the nearest single color. Zero strength, Bayer and no-dither mapping are unchanged. Gamut calculations use logical palette RGB values rather than measured panel colors.

Validated with the supplied cyclist photo, BWRY and strength 1, plus synthetic unsupported green preceding warm patches. Existing neutral/orange/strength/alpha and VLW/JPEG tests pass.


### Continuous gradients without dithering (2.16.0)

**Color output** now offers **Keep gradients · RGB** and **Keep gradients · palette gamut**. Both preserve intermediate tones without a pixel pattern, after cropping, scaling and color corrections. RGB keeps the corrected source colors. Palette gamut continuously projects them into the selected palette's convex RGB gamut; it does not simulate physical pigments.

PNG/JPEG exports contain these prepared gradients for further processing in another application. PNG is lossless with transparency; JPEG remains lossy and composites transparency onto white. In continuous mode, **Dithering on direct delivery (AP)** selects None (0), Floyd–Steinberg (1, default), or Ordered (2), including the HTTP 413 fallback. Quantized modes continue to send AP dithering 0. The preview shows the prepared image before AP processing. Exported or AP-stored image files do not embed this AP option: set it in the application that later displays them.

Brightness, contrast, saturation and threshold remain active. Individual color bias and dithering strength are disabled. Invert reverses all RGB channels. Drawing remains available. VLW, its layer manifest and template require a quantized palette mode.


### Preview calculation (2.16.1)

The existing gear activity indicator appears before preview calculation and briefly remains visible after completion. Rapid edits are coalesced; superseded calculations are skipped before starting. Errors end the busy state with an error message. Concurrent transfers remain independently active. The indicator shows ongoing work rather than a percentage.


### Drawing without reconverting the source (2.16.2)

Drawing and object edits, erasing, undo/redo and layer visibility changes reuse the converted source. Selection and tool changes only repaint the preview. The progress indicator remains active for actual source conversions. Exports and VLW templates still include the current drawing. Crop, dimensions or color-conversion changes invalidate the cached base.


### Text fonts (2.17.0)

Drawing text options now include a font selector: default sans serif, serif, monospace, Arial, Verdana, Trebuchet MS, Georgia, Times New Roman and Courier New. These use locally available fonts with suitable browser fallbacks and no remote font downloads. Select an existing text object to change its font; edits support undo/redo and reuse the converted image. Selection measurements and rendering share the same font. PNG, JPEG and VLW include rasterized text, so the AP does not require the selected font.


### Flat colors with fixed mixtures (2.18.0)

Select **Color output → Flat colors · fixed mixtures** and set the maximum display colors per mixture to 1–4. This limits colors within each mixed tone, not the total number of tones in the image. Pure colors remain available. Equal-share mixtures use fixed 1-pixel patterns matching the diagnostic chart: 1:1, 1:1:1 or 1:1:1:1. The closest tone is selected in Lab using each mixture's RGB average. Duplicate averages prefer simpler combinations. A bounded 5-bit RGB grid speeds lookup; exact palette colors are preserved when color biases are zero. This does not simulate physical pigments.

For BWRY, limits of 2, 3 and 4 yield 10, 14 and 15 tones respectively, including the four pure colors. No variable ratios or error diffusion are used. Gradients become stepped; subtle variation within one level leaves the pattern unchanged. Noise near level boundaries may still cause transitions; this is not a denoiser.

Color corrections and biases remain available; dithering strength does not apply. PNG, JPEG, VLW and direct delivery are supported, with native AP dithering disabled for the prepared pattern. PNG/VLW preserve exact pixels; JPEG remains lossy. The actual palette size also limits the number of colors per mixture.


### Preview scrolling (2.18.1)

On larger screens the comparison remains sticky even with the drawing editor open or a tall preview. A dynamic offset lets tall controls scroll upward first, prioritizing the images over the footer. Scroll back up to access the controls. The comparison resumes normal document flow at the end of the settings area. Tall or expanded editor panels retain normal scrolling on small screens.


### Shared converter and ioBroker (2.19.0)

`js/image-converter.js`, `gamut.js` and `fixed-mix.js` now provide the shared pure conversion kernel used by the Toolbox and ioBroker calendar banners. `js/image-api.js` exposes a validated `OEPLImage.convert({data,width,height,palette,dithering,...})` RGBA interface without mutating input. `node build-image-converter.cjs` builds a standalone browser/CommonJS module with no runtime dependencies. The ioBroker service embeds a factory generated from the same sources, converts banners at their final layout size, and retains existing calendar text/warning color processing.


### Illustration optimization, preview navigation and ellipses (2.20.0)

**Optimize lines and text** offers Off, Comic, Diagram and Text presets with independent switches/strengths for dark outlines, thin colored lines, text on light backgrounds and color-area smoothing. Off is the default. Double-click a strength slider to restore 50. Presets do not change the palette or dithering selection. Results appear in the regular preview and exports, before the independent drawing layer. The source image is preserved. Dark/text masks are reduced separately; colored thin structures are isolated with morphological opening. Text-area detection is heuristic, not OCR. High strengths can close small letters. Analysis is capped at 2 million source pixels; smoothing also uses that working resolution. Without smoothing, the color image still comes directly from the original source.

**Preview navigation:** drag with the left button in automatic mode when crop, drawing or image-placement tools do not claim the gesture. Explicit Pan view, middle-button dragging or Space + drag override editing. Ctrl + wheel zooms at the pointer, while plain wheel retains normal scrolling. Two fingers pan/pinch-zoom, canceling a pending drawing before taking over. Navigation affects preview presentation only; exports, crop, placement and drawing history remain unchanged. Source and target zoom independently.

**Ellipse:** drag corner to corner. Shift creates square rectangles/circular ellipses and keeps the existing ratio when resizing objects. Alt forces 1:1 for rectangles/ellipses. A checkbox provides the Shift behavior for touch. The original center/radius Circle tool remains available. Ellipses support selection, editing and undo/redo.

**Dithering and optimization examples** is a collapsible guide in the image workspace. Eight local PNG data-URL examples compare direct mapping, Floyd, Bayer, fixed two-color mixtures, RGB, palette gamut and outline/text protection off/on. They use the selected palette with reference settings, not the current image corrections. No external images are loaded. Examples are generated only on opening, and updated for palette/language changes.

These additions are editor-local; the previously delivered standalone converter and running ioBroker script were not modified in this step.


### Portable illustration processing and ioBroker (2.20.1 / converter 1.1.0)

The standalone converter now accepts `illustration` presets and individual dark/color/text/smooth strengths (0–100), defaulting to off. Explicit strengths override presets, including zero. Source preparation, portable coverage resampling and application are exposed independently, allowing native-resolution masks before resizing without Node canvas dependencies. The ioBroker calendar service uses the same source modules for occasion banners through `imageProcessing.illustration`; existing profiles remain unchanged/off. Calendar text, warnings and upload code remain unchanged. Browser UI behavior is unchanged from 2.20.0.


## Development and provenance

Use Node.js 22 or later. No additional npm packages are required. Run `npm test` and `npm run build`; the latter writes to `dist/`. Run `npm run build -- oepl-toolbox.html` to refresh the checked-in standalone file after source changes. Browser scenarios live in `tests/*-browser-check.js` and use local pages or mocked APs.

The original history of [olanwe/img2vlw](https://github.com/olanwe/img2vlw) is retained. AI assistance helped extend the original converter into this image and LED toolbox. This repository does not include the separate ioBroker calendar project.

GPL-3.0: [LICENSE](LICENSE). The bundled jpeg-js 0.4.4 encoder is BSD-3-Clause: [vendor/jpeg-js.LICENSE](vendor/jpeg-js.LICENSE). Both licenses are embedded in the standalone HTML. This remains an independent project, not an official OpenEPaperLink application.

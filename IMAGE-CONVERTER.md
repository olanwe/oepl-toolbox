# OEPL Image Converter 1.1.0

Reiner Konvertierungskern der OEPL-Toolbox, auch unabhängig in andere Anwendungen einbindbar. Ohne Dateizugriffe, Netzwerk, Timer oder externe Laufzeitabhängigkeiten. GPL-3.0; keine offizielle OpenEPaperLink-Komponente.

## Node.js

```js
const converter = require('./oepl-image-converter.cjs');
const image = converter.convert({
  data: rgbaBuffer, width: 480, height: 120,
  palette: 'BWRY',
  dithering: 'fixed', mixColors: 2,
  background: '#ffffff'
});
// image.data: Uint8ClampedArray, RGBA; Eingabe bleibt unverändert.
const pngPixels = Buffer.from(image.data);
```

## Browser

```html
<script src="oepl-image-converter.js"></script>
<script>
const image = OEPLImage.convert({
  data: imageData.data, width: imageData.width, height: imageData.height,
  palette: 'BWRY', dithering: 'floyd-steinberg', strength: 1
});
ctx.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
</script>
```

Vorher auf die endgültigen Pixelmaße skalieren/beschneiden. Ausgabe ist RGBA, keine kodierte PNG/JPEG-Datei. Eine spätere Skalierung kann Pixelmuster verändern. Beim AP fertige Palettenpixel ohne erneutes Dithering senden.

| Einstellung | Werte / Vorgabe |
|---|---|
| `palette` | BW, BWR, BWY, BWRY (Alias BWYR), Spectra3100Plus, Spectra6, ACeP7 oder 2–16 eindeutige `#RRGGBB`; Vorgabe BWRY |
| `dither` / `dithering` | none, floyd (Alias floyd-steinberg), ordered (Alias bayer), fixed (Alias fixed-mix), rgb, gamut; Vorgabe none |
| `strength` | 0–1, Vorgabe 1; für Floyd/Bayer |
| `mixColors` | 1–4, Vorgabe 2; für feste gleichmäßige Mischfarben |
| `brightness` | −255 bis 255, Vorgabe 0 |
| `contrast` / `saturation` | 0–4, Vorgabe 1 |
| `threshold` | 0–255, Vorgabe 128 |
| `biases` | Farbgewichtung je Palettenindex −100 bis 100; Vorgabe leer |
| `background` | `#RRGGBB` komponiert Alpha vor der Konvertierung auf diese Farbe; null/Vorgabe erhält Alpha |

`data` muss ein Uint8Array, Uint8ClampedArray oder Node-Buffer mit Breite × Höhe × 4 Bytes sein. Breite und Höhe 1–4096, höchstens 4 Millionen Pixel. Ungültige Einstellungen werfen Fehler. `settings(options)` prüft und normalisiert die Optionen ohne Bildberechnung. `version`, `palettes`, `rgbToLab`, `quantize` und `dimensions` sind ebenfalls verfügbar; für neue Anwendungen `convert` benutzen.

RGB erhält korrigierte Farbstufen, gamut begrenzt sie kontinuierlich auf den RGB-Farbraum der Palette. COLOR ist ein Kompatibilitätsalias für kontinuierliche RGB-Ausgabe. Kontinuierliche Ausgabe hat keine gültigen Farbindex-Ebenen; `indices` nur bei quantisierter Ausgabe verwenden.

Feste Mischfarben verwenden reine Farben und gleichmäßig gewichtete Kombinationen bis zur gewünschten Anzahl. Gleiche RGB-Mittelwerte bevorzugen die einfachere Kombination. Die Farbsuche nutzt ein begrenztes 5-Bit-RGB-Gitter. Keine Rauschunterdrückung oder räumliche Segmentierung. Geometrische RGB-Mischungen sind keine Kalibrierung physischer Pigmente.

## Gemeinsame Quellen

`js/image-converter.js`: Palette, Lab-Zuordnung, Korrekturen, Floyd und Bayer.
`js/gamut.js`: RGB-Farbraumprojektion.
`js/fixed-mix.js`: feste Mischungen.
`js/image-api.js`: validierte RGBA-Schnittstelle.

`node build-image-converter.cjs oepl-image-converter.js` erzeugt das eigenständige UMD-Bundle. Dieselben Quelldateien laufen direkt in der Toolbox. Der Builder unterstützt außerdem eine einbettbare Factory für andere Anwendungen. Ausgabe nach Änderungen neu bauen und Tests ausführen.


## Linien-, Farbstrich- und Textoptimierung (1.1.0)

`convert` akzeptiert jetzt zusätzlich `illustration`. Ohne Angabe ist alles aus; bestehende Aufrufe liefern dieselben Pixel wie 1.0.0.

```js
const image = converter.convert({data: rgba, width, height, palette:'BWRY',
  dithering:'fixed', mixColors:2,
  illustration:{preset:'diagram', dark:35, color:45, text:40, smooth:0}
});
```

Presets: off, comic, diagram, text; ein String wie `illustration:'comic'` ist ebenfalls möglich. Einzelwerte überschreiben das Preset, auch mit 0. Jede Stärke reicht von 0 bis 100. Nicht angegebene Werte sind 0 bzw. die Werte des gewählten Presets. `illustration:false` oder null schaltet alles aus. Hohe Stärken können kleine Buchstaben schließen. Weißflächen-/Texterkennung und farbige Linienerkennung sind Heuristiken.

`dark`: dunkle neutrale Konturen; `color`: dünne farbige Strukturen passend zur Displaypalette, große Farbflächen werden durch morphologische Öffnung weitgehend ausgeklammert; `text`: dunkle Originalstriche auf automatisch angenäherten hellen Textflächen; `smooth`: kantenerhaltende Flächenberuhigung.

Wenn das Bild verkleinert werden soll, zuerst Masken aus einer größeren Vorlage gewinnen und danach getrennt verkleinern:

```js
const options=converter.illustration.settings({preset:'comic'});
const prepared=converter.illustration.prepare(sourceRGBA,sourceW,sourceH,colors,options);
// Farbvorlage in der eigenen Rasterbibliothek auf die endgültige Größe bringen.
// Bei smooth > 0 dafür prepared.data verwenden, ansonsten die Originalvorlage.
const output=converter.convert({data:finalRGBA,width:finalW,height:finalH,palette:colors,
  dithering:'fixed',illustration:false});
const masks=converter.illustration.resizePlanes(prepared,finalW,finalH);
const result=converter.illustration.apply(output,masks,colors,options);
```

`resizeCoverage` / `resizePlanes` sind reine, portable Funktionen (Flächenmittel beim Verkleinern, bilinear beim Vergrößern), ohne Canvas oder zusätzliche Bibliotheken. `prepare` verändert die Eingabe nicht. `resizeMasks` ist die zusätzliche Browser-Canvas-Variante mit Bildplatzierung und wird unter Node nicht benötigt. Die Maskenrasterung kann sich je nach benutztem Bildskalierer etwas von der Browser-Vorschau unterscheiden; die Erkennung und Anwendung verwenden dieselben Quellen.

Der Editor begrenzt die Quellanalyse auf 2 Millionen Pixel. Bildmasken werden vor der endgültigen Palettenkonvertierung vorbereitet und danach angewendet. Andere Anwendungen können diese getrennte Verarbeitung ebenfalls nutzen.

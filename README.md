# OEPL-Toolbox

Lokaler Bildeditor für OpenEPaperLink. Entstanden aus [img2vlw](https://github.com/olanwe/img2vlw) von Oliver Weyhmüller und mit Unterstützung von KI zur heutigen Toolbox erweitert. Läuft vollständig im Browser, ohne Installation, Konto oder externe Schriftarten.

Unabhängiges Projekt; keine offizielle Anwendung des OpenEPaperLink-Projekts und nicht mit diesem verbunden. Entstanden aus img2vlw. [English instructions](README.en.md).

## Schnellstart

Die fertige [oepl-toolbox.html](oepl-toolbox.html) herunterladen und lokal im Browser öffnen. Beim Herunterladen auf GitHub „Download raw file“ verwenden, damit die HTML-Datei statt der GitHub-Seite gespeichert wird. Sie enthält alle benötigten Bestandteile; zur Bildbearbeitung und LED-Simulation ist keine Installation erforderlich.

Die Toolbox umfasst Bildbearbeitung und Konvertierung, Zeichenebenen, Testbilder, PNG/JPEG/VLW einschließlich gzip, AP-Dateiverwaltung und Direktversand sowie einen LED-Designer. Deutsch/Englisch und heller/dunkler Modus sind integriert. Der ioBroker-Kalender ist ein separates Projekt und gehört nicht zu diesem Repository.

## Sprache

Deutsch und Englisch stehen oben rechts zur Auswahl. Beim ersten Start wird die erste unterstützte Sprache aus der Browser-Präferenzliste übernommen. Ohne passende Browsersprache gilt Englisch. Eine manuelle Auswahl wird lokal gespeichert und hat bei späteren Starts Vorrang. Bei gesperrtem Browserspeicher bleibt die Auswahl während der Sitzung wirksam.

Der Sprachwechsel benötigt kein Neuladen. Bild, Ausschnitt, Ausrichtung, Farbwerte, LED-Design und Simulationsposition bleiben erhalten. Eigene Presetnamen, Dateinamen, AP-Adressen und Display-Aliase werden nicht übersetzt. Alte `img2vlw-led-v1`-Designs, VLW-Dateien und Ebenenpläne bleiben kompatibel.

## LED-Designer

Oben im Studio zum neuen Werkzeug **LED-Designer** wechseln: drei Blinkgruppen, RGB-Kanalfolgen, Firmwareprofile für nRF/ESP32/EFR32, Zeitstrahl, Simulation und PWM-Zeitlupe, Leuchtdauer und kalibrierbare Energieabschätzung. Designs können als JSON oder eigene Presets gespeichert und über den LED-Endpunkt des APs getestet werden. [Bedienung, Grenzen und Firmwarequellen](LED-DESIGNER.md).

## Aus dem Quellcode starten

`img2vlw.html` im Browser öffnen und „Bild öffnen“ oder „Beispiel laden“ wählen. Die Ordner `js/` und `vendor/` sowie `style.css` müssen daneben bleiben. `legacy.html` enthält die unveränderte bisherige Anwendung.

Alternativ erzeugt `npm run build` eine einzelne, direkt öffnungsfähige Datei `dist/oepl-toolbox.html`. Node.js wird nur zum Entwickeln, Testen und Zusammenstellen benötigt. Die fertige Anwendung braucht weder Node.js noch einen Webserver zur Bildbearbeitung.

## Bildbearbeitung

- Paletten BW, BWR, BWY, BWRY, Spectra6 und ACeP7; bis zu 16 eigene Farben als benanntes Preset im Browser speichern und wieder löschen. Die Standardfarben sind ideale RGB-Zielwerte, keine verbindliche Farbmessung eines bestimmten Panels.
- Größenpresets sowie freie Breite und Höhe; optionales Seitenverhältnis, Maße tauschen und Quellgröße übernehmen. Die Zollangabe allein identifiziert kein Panel: Im Zweifel das AP-Profil verwenden.
- Vollständig einpassen, Fläche füllen oder strecken; Drehung um 90°-Schritte und glatte oder pixelgenaue Skalierung.
- Ausschnitt im Original aufziehen oder X/Y/Breite/Höhe in Quellpixeln eingeben. „Ausschnitt zurücksetzen“ setzt ihn zurück.
- Helligkeit, Kontrast, Sättigung, Hell-Dunkel-Schwelle und Bevorzugung jeder einzelnen Palettenfarbe. Ohne Dithering verwendet die Zuordnung wahrnehmungsorientierte Lab-Abstände mit separat einstellbarem Farbbias.
- Floyd–Steinberg und Bayer 4×4 mit einstellbarer Stärke. Transparente Pixel verteilen keinen Ditherfehler.
- Original und Ziel gleichzeitig; Ansichten einpassen oder bis 400 % vergrößern.
- „Transparenz erhalten“ bewahrt auch teilweise transparente Quellpixel und lässt Einpassränder transparent. Deaktivieren füllt sie weiß.

Die Anwendung begrenzt Zielbilder auf vier Millionen Pixel (maximal 4096 je Achse), Quellbilder auf 24 Millionen Pixel. Bei animierten GIFs wird der vom Browser beim Zeichnen gelieferte Frame verwendet; keine Animation wird exportiert.

## Aufstellung, Arbeitsansicht und gespeicherte Orientierung

„Ausgabedisplay drehen“ wählt 0°, 90°, 180° oder 270°. Breite und Höhe im Displaybereich bezeichnen weiterhin das originale Displayformat. Bei 90°/270° wird in einer Arbeitsfläche mit vertauschter Breite und Höhe bearbeitet. Vor der Auslieferung wird das Ergebnis pixelgenau zurückgedreht; der Direktversand verwendet immer Originalbreite und Originalhöhe.

Die Displaydrehung verändert ausschließlich die Zielarbeitsfläche. Das gilt auch für AP-Bilder und importierte VLW-Dateien: Quelle und Ausschnitt bleiben unverändert. „Quellbild drehen“ dreht unabhängig davon die Quelle, die Quellvorschau und die Grundlage des Ausschnitts. Dabei wird der Ausschnitt auf das vollständige gedrehte Quellbild zurückgesetzt. Neue Bilder starten mit 0° Quelldrehung.

Die Vergleichsvorschau bleibt beim Scrollen während der Bildbearbeitung sichtbar. Auf schmalen Bildschirmen steht sie kompakt über den Reglern. Export, AP-Verbindung und Dateiverwaltung folgen unter der Bearbeitung.

„Dateiorientierung beim Speichern“ wählt für lokale PNG-, JPEG-, VLW- und Ebenenplan-Downloads sowie die AP-Dateiablage zwischen originalem Displayformat und aktueller Darstellung. VLW-Test und Direktversand liefern unabhängig von dieser Auswahl immer im Originalformat aus. Beim VLW-Test beziehen sich X/Y auf das ursprüngliche Displaykoordinatensystem.

„Schwarz und Weiß invertieren“ tauscht ausschließlich diese beiden Palettenfarben nach der Quantisierung. Akzentfarben und Alpha bleiben erhalten. Eine eigene Palette benötigt dafür reines Weiß und Schwarz. Im AP bereits aktive zusätzliche Drehung oder Invertierung wird nicht heimlich geändert: Die Displayinformation zeigt dann einen Hinweis. Für eine unveränderte Übernahme der App-Ergebnisse sollten diese beiden AP-Zusatzeffekte deaktiviert sein.

## Export

### PNG

Verlustfrei; erhält die quantisierten Farbpixel und deren Alpha. Ein PNG-Export bedeutet nicht, dass der reguläre OEPL-Bildupload PNG dekodieren kann.

### OEPL-JPEG

Der lokal mitgelieferte Encoder jpeg-js 0.4.4 erzeugt ausdrücklich Baseline-JPEG (SOF0), 4:4:4 und Qualität 100. Transparenz wird auf Weiß gelegt. JPEG bleibt verlustbehaftet: Eine Garantie auf exakt identische Pixel oder völlige Artefaktfreiheit ist auch bei Qualität 100 nicht möglich. Das Zielbild muss zum Displaymaß passen.

### VLW: alle Farbebenen, Weiß und Transparenz

VLW v11; jede Ebene wird einzeln auf ihren belegten Bereich verkleinert. Versatz und gemeinsame Bildbreite bleiben in den Glyphdaten erhalten. Leere Ebenen erhalten gültige leere Abmessungen.

Zeichenbelegung für BWRY:

| Zeichen | Ebene |
|---|---|
| `0` | Schwarz |
| `1` | Rot |
| `2` | Gelb |
| `3` | Weiß |
| `4` | Deckungsmaske, wenn aktiviert |

Generell: Zuerst alle Nicht-Weiß-Farben in Palettenreihenfolge, anschließend Weiß, dann optional die Deckungsmaske. Zeichenfolge `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`. Für BW/BWR/BWY bleiben die bisherigen Schwarz- und Akzentzeichen erhalten. Das erzeugte OEPL-JSON-Template verwendet die Farben als Hex-Werte, die der getestete OEPL-Renderer unterstützt. Die genaue Belegung und Zeichenreihenfolge stehen unter „VLW-Einstellungen & Verwendung“; der „Ebenenplan als JSON“ exportiert sie maschinenlesbar.

Die Farbebenen enthalten bereits die Quell-Deckung (0 = leer/transparent, 255 = voll deckend). Die zusätzliche Maske enthält die Deckung über alle Farben. Sie ist eine Hilfsebene und wird nicht zusätzlich als Farbe über das Bild gezeichnet. Weiß ist ausdrücklich eine eigene zeichnbare Farbe; transparente Stellen bleiben in allen Farbebenen leer.

Alle Farbglyphen am selben Ort mit der jeweiligen OEPL-Farbnummer zeichnen. Die Zuordnung der zusätzlichen Farben hängt von Display und Firmware ab; deshalb werden keine unbekannten OEPL-Farbnummern erfunden. Für das bisherige BWR-Verfahren bleiben beispielsweise diese beiden Zeilen verwendbar (Weiß auf vorhandenem weißem Hintergrund ausgelassen):

```json
[
  { "text": [5, 5, "0", "image.vlw", 1] },
  { "text": [5, 5, "1", "image.vlw", 2] }
]
```

Bei x=0 können ältere Fontrenderer die linken Leerbereiche jeder Ebene unabhängig entfernen. Der optionale Patch setzt bei Bedarf zusätzliche Ankerpixel und zeigt die erforderliche Zeichenreihenfolge; deren ursprüngliche Farbe wird zuletzt gezeichnet und überdeckt die Anker. Halbtransparente Bilder sind für diesen Patch gesperrt, da ein Überzeichnen dort keine identische Deckung garantiert. Er kann weiterhin sämtlichen linken gemeinsamen Leerraum entfernen. Wenn der genaue linke Versatz erhalten bleiben muss, möglichst x≠0 verwenden.

Ein Hinweis warnt, sobald eine zugeschnittene Ebene größer als 255 Pixel ist: Der OEPL-VLW-Renderer kann solche Glyphen fehlerhaft darstellen. Der Export selbst bleibt möglich. Die neuen Weiß-, Mehrfarben- und 8-Bit-Alpha-Ebenen sind dateiseitig getestet. Ein BWY-Test mit Weißebene und harten transparenten Bereichen wurde über einen echten AP ausgeliefert; die AP-Vorschau entsprach dem erwarteten Bild pixelgenau. Teiltransparenz und andere Paneltypen wurden noch nicht physisch geprüft. Das Panel kann selbst keine halbtransparenten Pixel darstellen; das konkrete Font-Compositing übernimmt die Firmware.

## OpenEPaperLink

1. AP-Adresse oder IP eintragen und „Verbinden“ wählen.
2. Die Displayliste wird über `/get_db?pos=…` vollständig seitenweise geladen. Display auswählen.
3. „Profil übernehmen“ liest Breite, Höhe und Farbtabelle aus `/tagtypes/XX.json`.
4. „AP-Bild als Quelle laden“ liest `/current/MAC.raw`, dekodiert es und übernimmt Größe und Palette. Das ist das gespeicherte AP-Bild, keine Rücklesung des physischen Displays.
5. „An Display senden“ lädt JPEG per `/imgupload` hoch, mit `mac`, `dither=0`, `contentmode=22` und `file`. Die lokale Quantisierung ist bereits angewendet. Der AP verarbeitet JPEG erneut für seine Hardwarepalette. Das Display übernimmt den Inhalt beim nächsten Abruf. PNG und VLW werden mit diesem Button nicht hochgeladen.

Eine MAC kann auch ohne Displayauswahl manuell eingetragen werden. Dann müssen Abmessungen und Palette selbst passend gewählt werden. Für ein ausgewähltes Display mit bekanntem Profil wird eine abweichende Bildgröße vor dem Upload gesperrt. Kein Upload erfolgt beim Verbinden, Auswählen oder Profilübernehmen.

### JPEG und VLW im AP-Dateisystem

Im Bereich „Dateien auf dem AP“ lassen sich JPEGs unter `/images/NAME.jpg` und VLW-Dateien unter `/fonts/NAME.vlw` speichern. Beim VLW wird zusätzlich `NAME.layers.json` mit Farbzuordnung, Alphaebene, Zeichenreihenfolge und Orientierung abgelegt. Die ausgewählte Dateiorientierung gilt für diese Speicherung.

Vor dem Schreiben wird die Dateiliste geprüft. Bereits vorhandene Dateien blockieren den Vorgang, bis „Bestehende Dateien … überschreiben“ ausdrücklich aktiviert wird. Nach jedem Upload lädt die App die gespeicherte Datei zurück und vergleicht sämtliche Bytes. Uploads erfolgen über `/littlefs_put`; Liste und Download über `/edit?list=…` bzw. `/edit?download=…`.

Die Anwendung prüft die auf dem getesteten AP relevante Dateinamengrenze im Voraus: höchstens 31 Zeichen pro Dateiname einschließlich Endung. Wegen `.layers.json` darf der gemeinsame VLW-Basisname höchstens 19 Zeichen lang sein. Die Ablage ist auf die Bild- und Fontverzeichnisse beschränkt.

Der Dateibrowser kann Verzeichnisse wechseln, Dateien herunterladen und Rasterbilder (PNG/JPEG/WebP/BMP/GIF) direkt als Quelle öffnen. Auch img2vlw-VLW-Bildfonts lassen sich importieren, einschließlich `.vlw.gz` bei Browserunterstützung für gzip. Mit Ebenenplan werden Farben und gespeicherte Orientierung übernommen; ohne Ebenenplan interpretiert die App den Bildfont mit der aktuellen Palette. Allgemeine Schriftfonts mit beliebiger Zeichenbelegung sind keine importierbaren Bilddateien. Nach dem Import kann „Ausschnittgröße (1:1)“ die korrekten Originalmaße unter Berücksichtigung der Aufstellung übernehmen.

### VLW-Template erzeugen und testen

1. Bild, Palette und Originalabmessungen vorbereiten. Display auswählen; bei einem kleineren Bild kann die Zielgröße anschließend frei reduziert werden.
2. Einen kurzen Fontpfad wie `/fonts/meinbild.vlw` angeben.
3. Im Bereich „VLW-Template & Test“ X und Y wählen. Die Vorschau zeigt die Lage auf dem vollständigen ausgewählten Display. Überstände werden abgeschnitten und als Hinweis angezeigt.
4. Das fertige OEPL-JSON kann heruntergeladen werden. Farbebenen werden in Patchreihenfolge und mit Hex-Farben gezeichnet; die Deckungsmaske wird nicht gezeichnet.
5. „VLW hochladen & Template senden“ speichert den Font in Originalorientierung und seinen Ebenenplan, prüft beide Dateien und sendet danach das JSON mit `mac` und `json` an `/jsonupload`. Bei einem Upload- oder Prüfungsfehler wird kein Template gesendet.

Dieser Test ersetzt den Inhalt und Inhaltsmodus des ausgewählten Displays durch das JSON-Template (OEPL-Modus 19). Der Font bleibt im AP-Dateisystem. Eine automatische Wiederherstellung des früheren Inhalts erfolgt nicht. Das Display muss zu der ausgewählten MAC gehören; ein versehentlich abweichendes manuelles MAC-Feld sperrt den Test.

### AP-Bildformate

Unterstützt: rohe 1-/2-Bit-Ebenen, gepackte 2-/3-/4-Bit-Farbindizes, RGB332/RGB565 und zlib-komprimierte OEPL-Daten. Hardwarebedingte Pufferrotation wird zurückgedreht. RAW-Dateien lassen sich zusätzlich unverändert herunterladen. Nicht vorhandene AP-Vorschaudateien ergeben einen sichtbaren HTTP-404-Hinweis.

Für Group5 wird bei Bedarf der vom gewählten AP bereitgestellte `/g5decoder.js` in einem kurzlebigen Web Worker geladen und anschließend beendet. Die App verteilt diesen Decoder nicht mit. Dafür muss der AP erreichbar sein und diese Datei anbieten. Fehlt sie, bleibt der RAW-Download verfügbar. Bildbearbeitung und Exporte funktionieren unabhängig davon offline. Die Lizenz- und Nutzungsbedingungen des AP-Decoders gelten weiterhin für diesen separaten Bestandteil.

### Netzwerksuche und Browserzugriff

„Bekannte APs suchen“ prüft gespeicherte Adressen, die aktuelle Eingabe und `openepaperlink.local`. Das ist kein Subnetz- oder mDNS-Browse-Scan: Browser stellen dafür keine allgemeine Schnittstelle bereit. Mehrere erreichbare gespeicherte APs stehen in der Adressauswahl zur Verfügung.

APs müssen den Browserzugriff erlauben (CORS), und eventuell muss im Browser die Berechtigung zum lokalen Netzwerk erteilt werden. Eine über HTTPS geladene App kann am Zugriff auf einen HTTP-AP gehindert werden. Die Anwendung verschickt nichts mit `no-cors` und meldet einen Upload nur nach erfolgreicher HTTP-Antwort.

Bei Problemen kann die einzelne gebaute HTML-Datei über den OEPL-Dateieditor unter einem eigenen Namen auf demselben AP bereitgestellt und von dort geöffnet werden. Bestehende AP-Dateien dabei nicht ersetzen. Für lokale Entwicklung ist auch `python -m http.server 8766 --bind 127.0.0.1` möglich. CORS- und Netzwerkfreigaben gelten je nach Browser trotzdem.

Gespeichert werden eigene Paletten und zuletzt erfolgreich verbundene AP-Adressen im lokalen Browserspeicher. Bilder werden nicht dauerhaft in diesem Speicher abgelegt. Keine Telemetrie, keine Cloud-Verarbeitung.

## Aufbau und Prüfung

- `js/core.js`: Quantisierung, Dithering, VLW-Ebenen und Bitmapgrenzen.
- `js/ap.js`: AP-Protokoll, Validierung, Bilddecoder und isolierter Group5-Worker.
- `js/app.js`: Zustand, Oberfläche, Bildgeometrie und Exporte.
- `vendor/jpeg-encoder.js`: unveränderter jpeg-js-Encoder mit zugehöriger Lizenz.
- `build.cjs`: stellt eine einzelne Offline-HTML-Datei zusammen, einschließlich Lizenzhinweisen.
- `legacy.html`: Originalversion für Vergleiche.

`npm test` benötigt nur Node.js und keine Paketinstallation. Die Tests prüfen unter anderem Alpha, alle Farbflächen, leere Ebenen, Patchreihenfolge, 255-Pixel-Warnung, JPEG-Marker und Sampling, AP-Paginierung und Uploadfelder sowie RAW-/zlib-/Group5-Integration.

Der zusätzliche Browserablauf `tests/browser-check.js` kann mit Playwright CLI gegen den lokalen Server ausgeführt werden:

```powershell
npx --yes --package @playwright/cli playwright-cli open http://127.0.0.1:8766/img2vlw.html
npx --yes --package @playwright/cli playwright-cli run-code --filename=tests/browser-check.js
```

Er prüft Bedienung, Presets, Ausschnitt, Alpha, Downloads, mobile Breite sowie einen ausschließlich simulierten Upload. Ein realer Display-Upload ist kein Bestandteil dieser Tests. Für die Screenshot-Datei muss `output/playwright/` existieren. `tests/workflow-browser-check.js` prüft zusätzlich Arbeits- und Exportorientierung, Invertierung, Dateiablage, VLW-Wiederimport und den kompletten Templateablauf gegen einen simulierten AP.

## Referenzen

- [Originalprojekt](https://github.com/olanwe/img2vlw)
- [OEPL-Bildanforderungen](https://github.com/OpenEPaperLink/OpenEPaperLink/wiki/Image-specifications)
- [OEPL-Upload und HTTP-Endpunkte](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/src/web.cpp)
- [OEPL-Bildverarbeitung und Kompression](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/src/makeimage.cpp)
- [OEPL-Vorschau und Typmetadaten](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/wwwroot/main.js)

img2vlw: GPL-3.0, siehe `LICENSE`. jpeg-js: BSD-3-Clause, siehe `vendor/jpeg-js.LICENSE`.

Alle Schieberegler lassen sich per Doppelklick auf ihren Standardwert zurücksetzen. Dies gilt auch für die einzelnen Farbpräferenzen und die Position in der LED-Simulation. Vorschau und Zahlenanzeige werden sofort aktualisiert.

## Große Bilder und HTTP 413

Große, geditherte Bilder können als JPEG mit Qualität 100 sehr umfangreich werden. Die aktuelle OEPL-Firmware begrenzt `/imgupload` auf 1 MiB für den gesamten Anfragekörper einschließlich Formulardaten ([Firmwarequelle](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/include/pendingupload.h)). Andere Firmwarestände können abweichen.

Ab Studio 2.2.3 wird bei HTTP 413 dasselbe JPEG unverändert über `/littlefs_put` unter einem eindeutigen Namen `/images/i2v-….jpg` gespeichert und bytegenau zurückgelesen. Erst dann wird über `/save_cfg` ein statischer Bildauftrag (Modus 22, AP-Dithering aus) angelegt. Die Firmware wird mit `delete=1` angewiesen, die temporäre Datei nach erfolgreicher Verarbeitung zu entfernen. Der Weg benötigt freien AP-Dateispeicher und kann deutlich länger dauern. Qualität, Auflösung und das bereits berechnete Dithering werden nicht reduziert. Die Zeitlimits für Bild-/Dateitransfers betragen zwei Minuten.

Nur HTTP 413 löst diesen Ausweichweg aus. Andere Fehler werden direkt angezeigt. Scheitert der Ausweichweg, nennt die Meldung auch den Dateipfad einer möglicherweise bereits angelegten Datei. Bei fehlgeschlagener Verarbeitung kann die temporäre Datei auf dem AP verbleiben. Die Annahme des Auftrags bestätigt noch keinen erfolgreichen Displayrefresh.

## Übersetzungen erweitern

`js/i18n.js` enthält Spracherkennung, Auswahl, Speicherung, Zahlenformatierung und das Aktualisieren deklarativer Texte. `js/locales/en.js` enthält den englischen Textkatalog; die deutschen Quelltexte dienen als stabile Schlüssel und Rückfalltexte. Statische Texte verwenden `data-i18n`, Attribute `data-i18n-placeholder`, `data-i18n-title` oder `data-i18n-aria-label`. Dynamische Texte werden ausdrücklich mit `t(...)` übersetzt; es gibt keine nachträgliche automatische Übersetzung beliebiger DOM-Inhalte. Benutzereingaben und Protokolldaten bleiben unverändert.

Weitere Sprachen: Katalog unter `js/locales/` anlegen, vor `i18n.js` einbinden, Sprache in `supported`, `locale` und der Sprachliste ergänzen sowie die Formatierung prüfen. Neue dynamische Meldungen als vollständige Nachrichten mit `{parameter}`-Platzhaltern anlegen. Der Einzeldatei-Build bündelt eingebundene Kataloge automatisch; im Betrieb wird kein Übersetzungsdienst aufgerufen.

## Dithering-Korrektur 2.3.1

Bayer 4×4 bildet nun je Rasterzelle eine Mischung aus bis zu 16 echten Palettenfarben, statt lediglich einen gemeinsamen Helligkeitsversatz auf alle RGB-Kanäle anzuwenden. Dadurch wird insbesondere der starke Orangestich vermieden, der bei ACeP7 für olivgrüne und graue Flächen entstehen konnte. Die Mischungen werden für die Verarbeitung auf einem 5-Bit-RGB-Raster zwischengespeichert; vorhandene exakte Palettenfarben bleiben unverändert. Bei Dither-Stärke 0 gilt weiterhin die direkte Farbzuordnung. Floyd–Steinberg gibt den vorzeichenbehafteten RGB-Fehler ohne vorzeitige Begrenzung auf 0–255 weiter.

Raster mit 16 Positionen können Farbtöne nur näherungsweise wiedergeben. Die Standardpaletten sind weiterhin ideale RGB-Farbwerte und keine gemessene Kalibrierung eines konkreten ACeP-/Spectra-Panels.

## Direkte Farbzuordnung ab 2.3.2

„Ohne“ verwendet nun CIELAB-Abstände (D50, aus sRGB umgerechnet), statt rohe RGB-Abstände zu vergleichen. Dadurch werden neutrale Grautöne bei ACeP7 nicht mehr allein wegen des zusätzlichen Orange nach Orange eingefärbt. Gleiches gilt bei Dither-Stärke 0 für beide Rasterverfahren. Palettenfarben und Alpha bleiben erhalten; Farbpräferenzen werden weiterhin berücksichtigt. Bayer-Mischungen und die vorzeichenbehaftete Floyd-Fehlerweitergabe verwenden weiterhin RGB-Restfehler.

Ohne Dithering fehlen die Zwischenstufen unverändert: Jedes Pixel wird genau einer Palettenfarbe zugeordnet. Dunkle, entsättigte Grüntöne können dabei Schwarz, hellere Töne Weiß werden. Für fotografische Tonabstufungen ist Dithering erforderlich. Die Umrechnung orientiert sich an den [W3C-Farbraumdefinitionen](https://www.w3.org/TR/css-color-4/#lab-colors); sie ersetzt keine Kalibrierung realer Panelpigmente.

## Dither-Stärke ab 2.3.3

Die bisherige Aufteilung zwischen Lab bei Stärke 0 und RGB bei positiver Stärke ist aufgehoben. Alle Farbentscheidungen verwenden denselben wahrnehmungsorientierten Vergleich. Bei der Fehlerweitergabe werden außerhalb des RGB-Bereichs liegende Anteile separat berücksichtigt, damit negative Fehler nicht verloren gehen.

Bei beiden Verfahren bedeutet Stärke 0 direkte Farbzuordnung und Stärke 1 volles Dithering. Zwischenwerte mischen das bearbeitete Quellbild in Richtung seines direkt quantisierten Ergebnisses, bevor das Raster aufgebaut wird. Floyd–Steinberg verteilt danach den vollständigen Restfehler; nur dessen Gewicht zu reduzieren wäre kein zuverlässiger Übergang zum direkten Ergebnis. Farbpräferenzen bleiben berücksichtigt, ohne sie am schwachen Raster-Endpunkt doppelt anzuwenden.

Grautöne bleiben mit den Standardpaletten auch während des Zurücknehmens neutral. Eine globale Orangebevorzugung entsteht dabei nicht mehr. Raster verändern sich weiterhin in diskreten Pixelentscheidungen; besonders Bayer 4×4 hat nur 16 Positionen und kann deshalb sichtbare Abstufungen zeigen. Echte orange Bildteile bleiben selbstverständlich möglich.

## Export ohne Einpassränder und Vorschaukorrektur (2.4.0)

Unter „Export“ entfernt „Nur Bildfläche speichern (ohne Einpassränder)“ die beim Einpassen ergänzten Displayränder. Die Fläche wird aus der tatsächlichen Platzierung des Quellausschnitts berechnet, nicht anhand weißer oder transparenter Pixel. Weiße und transparente Ränder, die bereits zum Quellbild gehören, bleiben deshalb erhalten. Bei „Fläche füllen“ und „Strecken“ gibt es keine ergänzten Ränder zu entfernen. Teilweise belegte Randpixel werden eingeschlossen.

PNG, JPEG, VLW, Ebenenplan und AP-Dateiablage berücksichtigen diese Auswahl und die gewählte Dateiorientierung. Die Dateimaße werden im Exportbereich angezeigt. Direktversand und VLW-Test verwenden weiterhin die vollständige native Displayfläche, damit Abmessungen und Positionierung zum ausgewählten Display passen. Der Ebenenplan vermerkt zusätzlich `exportArea` und die Bildgrenzen in der Arbeitsansicht; ältere Ebenenpläne bleiben lesbar.

„Ausschnitt zurücksetzen“ setzt den vollständigen Quellausschnitt wieder ein und stellt die Vorschau auf „Einpassen“. Der bisherige Button „Quellgröße“ heißt nun „Ausschnittgröße (1:1)“: Er setzt die Zielmaße auf die Pixelmaße des Ausschnitts, unter Berücksichtigung der Displaydrehung. Vor der Übernahme wird die Verarbeitungsgrenze geprüft. Zu große Quellen ändern die bisherige Zielgröße nicht mehr; die gültige Vorschau und Exportmöglichkeit bleiben erhalten. Auch dieser Button und das Laden/Drehen einer Quelle passen die Vorschau ein und setzen deren Scrollposition zurück.

Ab 2.4.1 steht die 255-Pixel-Warnung als hervorgehobener gelber Hinweis direkt über den Export-Schaltflächen, auch bei eingeklappten VLW-Einstellungen. Im VLW-Testbereich wird die native Fontgröße gesondert geprüft und ebenso hervorgehoben. Der Export bleibt möglich.

## Aktionsstatus und Ausschnitt bearbeiten (2.5.0)

Während Export, Dateiimport, AP-Verbindung, Dateiübertragung, Profilabfrage oder LED-Netzwerkaktion erscheint der aktuelle Status zusätzlich in einer vorübergehend fixierten Zeile. Sie liegt zunächst an der normalen Statusposition und haftet beim Herunterscrollen am oberen Fensterrand. Zwei gegenläufige Zahnräder zeigen den Laufzustand; die Darstellung stammt aus dem [ESP32 SSID/PSK-Patcher](https://www.weyhmueller.org/webtools/esp32_ssid_patcher.html). Bei reduzierter Bewegung werden die Zahnräder nicht animiert.

Nach Abschluss bleibt die Meldung sechs Sekunden, bei Fehlern zehn Sekunden sichtbar. Danach bleibt sie in der ursprünglichen Statuszeile nachlesbar. Abgeschlossene Meldungen können vorzeitig ausgeblendet werden. Mehrere laufende Aktionen werden gemeinsam gezählt; das Ende einer Aktion beendet die Anzeige anderer laufender Aktionen nicht. Große JPEG-Uploads zeigen beim Ausweichweg die Phase „JPEG geprüft. Aktiviere das Bild auf dem AP …“, bis der AP geantwortet hat. Schaltflächen werden anschließend wieder freigegeben.

Zum Bearbeiten des Ausschnitts „Ausschnitt im Quellbild markieren“ aktivieren. Innen ziehen verschiebt die vorhandene Auswahl. Acht Ziehpunkte sowie die Kanten verändern die Größe; die Auswahl bleibt innerhalb des Quellbildes. Bei einer noch vollständigen Auswahl zeichnet Ziehen im Inneren einen ersten Ausschnitt. „Neuen Ausschnitt markieren“ ermöglicht jederzeit eine neue Auswahl, auch innerhalb der bisherigen Auswahl.

„Ausschnitt an Display-Seitenverhältnis binden“ hält das Verhältnis der aktuellen Arbeitsansicht beim Aufziehen, Verschieben, Vergrößern und bei numerischen Änderungen. Eine Displaydrehung oder geänderte Displaymaße passen den gebundenen Ausschnitt entsprechend an. Beim Aktivieren wird die bisherige Auswahl möglichst innerhalb ihres bisherigen Bereichs angepasst. „Ausschnitt zurücksetzen“ wählt bei aktiver Bindung den größten passenden Ausschnitt.

Bei gebundenem Verhältnis sind gebrochene Quellpixelmaße möglich, damit das Verhältnis unabhängig von der Größe des Quellbildes erhalten bleibt. Der Export bleibt ganzzahlig in Displaypixeln. „Ausschnittgröße (1:1)“ rundet die Ausschnittmaße auf ganze Zielpixel. Für extrem kleine Quellen, in denen kein Ausschnitt mit mindestens einem Quellpixel je Achse und dem gewünschten Verhältnis Platz hat, wird die Bindung mit einer Meldung deaktiviert.

Ab 2.5.1 sind die Statuszahnräder direkte SVG-Grafiken ohne CSS-Masken. Acht und fünf Zähne laufen mit passendem Abstand, Phasenversatz und gegenläufiger Drehzahl im Verhältnis 8:5 ineinander. Dadurch entfallen die zuvor möglichen rechteckigen Maskenartefakte am kleinen Zahnrad.

## VLW-Gzip und zugehöriger Größenhinweis (2.6.0)

„VLW mit Gzip packen (.vlw.gz)“ ist standardmäßig eingeschaltet. Der lokale Font-Download heißt dann `name.vlw.gz`, andernfalls `name.vlw`. Kompression ist verlustfrei: Glyphen, Alpha, Farben und Ebenenreihenfolge bleiben unverändert. Der Größenhinweis steht nun dezent direkt unter dem VLW-Button und bezieht sich allgemein auf den VLW-Renderer. PNG und JPEG sind davon nicht betroffen. Gzip ändert die Zeichenabmessungen und die 255-Pixel-Grenze nicht.

AP-Ablage und VLW-Test laden bei eingeschaltetem Gzip die komprimierte Datei hoch und prüfen die hochgeladenen Bytes. Das JSON-Template verweist weiterhin auf `name.vlw`, wie von der aktuellen [OEPL-Firmware dokumentiert](https://github.com/OpenEPaperLink/OpenEPaperLink/releases). Diese sucht bei fehlender unkomprimierter Datei automatisch `name.vlw.gz`. Der Ebenenplan heißt weiterhin `name.layers.json` und enthält den tatsächlichen Dateinamen und die Kompressionsart. Existiert bereits eine unkomprimierte Datei mit demselben Basisnamen, blockiert die Toolbox den Gzip-Test beziehungsweise Upload mit einem Hinweis: Die unkomprimierte Datei würde auf dem AP bevorzugt. Sie wird nicht automatisch gelöscht.

„Bild oder VLW öffnen“, Ziehen auf die Quellvorschau und der AP-Dateibrowser akzeptieren VLW-Bildfonts als `.vlw` oder `.vlw.gz`. Komprimierte Daten werden anhand des Dateiinhalts erkannt und automatisch entpackt. Bei AP-Importen wird der zugehörige Ebenenplan eingelesen. Beim lokalen Import ohne Ebenenplan muss die passende Farbpalette ausgewählt sein; die Fontdatei selbst enthält keine RGB-Farbzuordnung. Allgemeine Textfonts sind weiterhin keine importierbaren Bildfonts.

Packen und Entpacken verwenden die nativen Browserfunktionen ohne externe Dienste. Bei fehlender Browserunterstützung wird eine verständliche Fehlermeldung angezeigt; Gzip kann für den Export ausgeschaltet werden. Fehlerhafte Archive werden zurückgewiesen. Für komprimierte und entpackte Fontdaten gilt ein Limit von 80 MiB.

## Testbilder und freie Bildplatzierung (2.7.0)

Neben „Beispiel laden“ stehen „Testbild-Bereich“ und „Testbild erzeugen“. Die Erzeugung ersetzt das Quellbild und verwendet die aktuelle Palette, Displaygröße und Aufstellungsrichtung. Vorherige Farbkorrekturen, Invertierung und Dithering werden zurückgesetzt. Es erfolgt kein automatischer Versand.

- Gesamtes Testbild: Auflösung, 1-Pixel-Rand, Eck-/Orientierungsmarken, Farbflächen, horizontale und vertikale Linien mit jeweils 1/2/4 Pixel Linien- und Lückenbreite, alle ungeordneten Farbpaare als 1-Pixel-Schachbrett, Graustufen-/Farbverläufe, Schriftproben und Diagonalen.
- Einzelbereiche lassen sich bildfüllend vergrößern. Bei vielen Farben oder kleinen Displays ist dies besser lesbar. Die Linienfelder folgen der Palette: pro Farbe oben vertikale, unten horizontale Linien, von links nach rechts 1/2/4 Pixel. Linien werden gegen die hellste Palettenfarbe geprüft; das invertierte Gegenstück entfällt. W/K/R/Y/B/G/O bezeichnen Weiß/Schwarz/Rot/Gelb/Blau/Grün/Orange.
- Vollfarbe: wählbare Palettefarbe, ohne Beschriftung oder Rand.
- Vollbild-Schachbrett: zwei wählbare Palettefarben und 1–64 Pixel Feldgröße. Doppelklick auf den Regler setzt auf 1 Pixel zurück. Danach „Testbild erzeugen“ anklicken.
- Farbrauschen: unabhängige Palettefarben pro Pixel, Startwert 0–4294967295. Gleicher Startwert erzeugt dieselbe Quelle, „Neuer Startwert“ wählt einen Zufallswert. Schlecht komprimierbare Muster eignen sich für große Übertragungstests; die JPEG-Dateigröße und spätere Funkdatenmenge sind unterschiedliche Größen. Es gibt keinen automatischen Dauertest.

Zum Prüfen der Farbverläufe nach der Erzeugung das gewünschte Dithering einschalten. PNG erhält das Pixelraster verlustfrei; JPEG kann auch bei Qualität 100 Werte verändern. AP-Versand und VLW-Test verwenden die bestehenden Übertragungswege.

Unter „Einpassen“ erhält **1:1 · ohne Skalierung** die Pixelmaße jedes unterstützten Quellformats bzw. des ganzzahligen Ausschnitts, ohne die Displaymaße zu ändern. Kleine Bilder bekommen Ränder, große Bilder werden an den Displayrändern abgeschnitten. In der Zielvorschau ziehen oder „Versatz X/Y“ relativ zur zentrierten Position einstellen; „Bild zentrieren“ setzt den Versatz zurück. Bei gebundenem Ausschnitt ggf. die Seitenverhältnis-Bindung lösen, um ganzzahlige Koordinaten zu erhalten.

**Frei skalieren und positionieren** ergänzt einen Regler von 1–400 %. Doppelklick setzt ihn auf 100 % zurück. Die gewählte Interpolation gilt beim Skalieren. Der separate Ansichtszoom verändert ausschließlich die Vorschau. Die Farbkonvertierung bleibt in beiden Modi aktiv; es ist keine unveränderte Dateikopie. „Nur Bildfläche speichern“ berücksichtigt Position, Skalierung und Abschneiden; Direktversand bleibt im nativen Displayformat. Neue Quellen werden wieder zentriert, die freie Skalierung bleibt erhalten.

Ghosting benötigt mehrere aufeinanderfolgende Bildwechsel und lässt sich mit einem einzelnen Testbild nicht vollständig beurteilen. Automatische Ghosting-Sequenzen und das Vorladen von Spezialbildern/Slideshows sind in dieser Version nicht enthalten.

## Testbild-Korrektur und Zeichenebene (2.8.0)

Die Beschriftung der Testbilder verwendet jetzt eine ungeglättete 5×7-Pixelschrift. Dadurch bleiben kleine Buchstaben nach der Farbquantisierung erhalten. Vergrößerte Vorschauen lassen sich bis zum linken/oberen Rand scrollen.

„Testbild-Beschriftung“ bietet automatisch, alle Bezeichnungen oder nur Auflösung. Automatisch werden Beschriftungen bei weniger als 200 Pixeln Höhe oder 240 Pixeln Breite weggelassen; eine kurze Auflösungsangabe und Diagonalkreuz-Probe bleiben stehen. Der freigewordene Platz wird den Prüfbereichen zugeteilt. Vollfarbe, Vollbild-Schachbrett und Farbrauschen bleiben vollständig rand- und textfrei. Für kleine Displays oder große Paletten können die einzelnen Prüfbereiche weiterhin bildfüllend erzeugt werden.

Farbverläufe enthalten jedes ungeordnete Paletten-Farbpaar genau einmal. BWR: Schwarz→Weiß, Schwarz→Rot, Weiß→Rot; kein doppelter, lediglich umgekehrter Grauverlauf. Zusätzliche Farben ergeben weitere Paarverläufe.

Unter „Quelle und Ausgabe“ lässt sich **Zeichenebene** aufklappen. „Auf Zielbild zeichnen“ aktivieren und in der Zielvorschau arbeiten. Währenddessen wird das Quellbild durch Ziehen nicht verschoben; zum Positionieren des Quellbildes den Zeichenmodus wieder ausschalten.

- Linie, Rechteck und Quadrat: aufziehen. Kreis: vom Mittelpunkt zum Radius ziehen. „Form ausfüllen“ betrifft Flächenformen. Palettefarbe und Strichbreite sind einstellbar.
- Text: Inhalt (auch mehrere Zeilen), Größe und Fettschrift wählen und per Klick platzieren.
- Bild einfügen: lokale Rasterdatei öffnen, Breite einstellen und in der Zielvorschau platzieren. Das Seitenverhältnis bleibt erhalten. „Bild glätten“ steuert die Interpolation. Maximal 4 Millionen Pixel pro Einfügebild, insgesamt 12 Millionen Pixel für die im Verlauf referenzierten Einfügebilder.
- Radierer: über Zeichnungen ziehen oder einzelne Stellen anklicken. Er entfernt ausschließlich die Zeichenebene und legt den konvertierten Hintergrund frei. Die eingestellte Strichbreite ist auch die Radierergröße.
- Rückgängig/Wiederholen gilt für alle Zeichenaktionen einschließlich Radieren und Leeren. Escape verwirft einen noch laufenden Zug. Doppelklick auf Größenregler setzt deren Standardwert zurück.
- „Zeichenebene anzeigen“ blendet die Ebene auch für Export und Versand ein/aus. „Leere Zeichenfläche“ legt eine weiße Quelle in der aktuellen Displaygröße an und aktiviert den Zeichenmodus; bestehende Zeichnungen bleiben erhalten. Zum Entfernen „Zeichenebene leeren“ verwenden.

Die Ebene liegt nach der Quellbild-Konvertierung. Helligkeit, Kontrast, Dithering, Invertierung, Ausschnitt und Skalierung des Quellbildes ändern bestehende Zeichnungen nicht. Sie ist im nativen Displayraster verankert und folgt der gewählten Ansichtsdrehung; bei geänderten Displaymaßen wird sie abgeschnitten, nicht skaliert. Quellenwechsel erhalten die Ebene. Für ein unverändertes Testmuster die Zeichenebene ausblenden oder leeren.

Zeichnungen und eingefügte Bilder werden ohne Dithering auf die aktuelle Palette abgebildet. Die Deckung der Ebene ist binär (Alpha ab 128 deckend), um Pixelränder eindeutig zu halten. PNG, JPEG, VLW, AP-Dateiablage, Direktversand und VLW-Test enthalten die sichtbare Ebene. „Nur Bildfläche speichern“ erweitert den Ausschnitt auch um Zeichnungen außerhalb der Quellbildfläche.

Zeichenverlauf und Einfügebilder bleiben nur in der laufenden Browsersitzung erhalten. Exportierte Bilder/Fonts enthalten das zusammengesetzte Ergebnis, keinen später wieder getrennt editierbaren Projektaufbau. Seit 2.10.0 lassen sich Objekte wie unten beschrieben auswählen, verschieben und skalieren.


## Kompakter Linienbereich (2.8.1)

Der Linienbereich prüft nur noch 1/2/4 Pixel Linien- und Lückenbreite und erhält in der Gesamtansicht weniger Höhe. Der freie Platz vergrößert Mischfelder und Farbverläufe. Der bildfüllende Einzelbereich bleibt verfügbar.


## Linienaufteilung (2.8.2)

Die Linienfarben bleiben nebeneinander, sofern pro Farbe mindestens 24 Pixel Breite verfügbar sind. Auf schmaleren Displays bzw. bei großen eigenen Paletten werden ausgewogene Zeilen verwendet. Die automatische Spaltenwahl der Mischfelder wird nicht mehr für die Linien verwendet.

## Freie Paletten und bearbeitbare Zeichenelemente (2.10.0)

Eigene Presets akzeptieren 2–16 unterschiedliche #RRGGBB-Farben in beliebiger Reihenfolge. Weiß ist optional. Die eingegebene Reihenfolge wird gespeichert. VLW-Export und -Import ordnen eine vorhandene Weiß-Ebene anhand ihres RGB-Werts zu; sie muss nicht an erster Stelle stehen. Invertieren benötigt weiterhin sowohl Weiß als auch Schwarz. Testbild-Verläufe decken alle Farbpaare ab, auch bei Paletten ohne Weiß/Schwarz. AP-Bildfont-Importe ergänzen keine erfundene Weiß-Farbe mehr.

Spectra3100Plus ist als zusätzliche Fünffarben-Palette mit Weiß, Schwarz, Rot, Gelb und Orange enthalten. E Ink bietet passende Panels für ESL-Anwendungen an: https://www.eink.com/brand/detail/Sepctra3100Plus . Das Preset bestätigt keine OEPL-Kompatibilität eines bestimmten Tag-Modells. Die RGB-Werte sind logische Farbziele, keine vermessenen Panelwerte.

Die Bezeichnungen der Farben stammen aus einer internen Tabelle exakt bekannter RGB-Werte. Unter „Farblegende“ stehen Kürzel, übersetzte Namen und Hex-Werte. K bleibt Schwarz; B steht für Blau. Weitere Kürzel: C Cyan, M Magenta, T Türkis, V Violett, P Purpur, PK Rosa, GY Grau, BN Braun, DG Dunkelgrün, N Dunkelblau und TL Blaugrün. Eigene unbekannte Farbtöne behalten den Hex-Wert als Bezeichnung. Die Kürzel sind Orientierungshilfen der Toolbox, keine OEPL-Farbnummern. Im Zeicheneditor enthält die Farbauswahl Kürzel, Namen und Hex-Wert; das kleine Farbfeld zeigt die aktive Zeichenfarbe.

**Zeichenelemente nachträglich bearbeiten:** Werkzeug „Auswählen / Bearbeiten“ wählen. Das zuletzt gezeichnete Element wird vorausgewählt. Ein anderes Element anklicken oder in „Vorhandenes Element“ wählen. Auf der Fläche ziehen verschiebt es; die vier Eckpunkte ändern die Größe. Rechtecke und Linien lassen sich frei skalieren; Quadrat, Kreis, Text und Bild erhalten beim Skalieren ihr Seitenverhältnis. Bei Bildern ändert sich dabei auch die angezeigte Bildbreite. Text bleibt echter Text: Inhalt, Schriftgröße und Fettschrift können über die vorhandenen Felder geändert werden. Farbe, Strichbreite und Füllung gelten bei ausgewähltem Element für dieses Element. Ausgewählte Elemente lassen sich einzeln entfernen.

Verschieben, Skalieren, Eigenschaftsänderungen und Entfernen sind rückgängig machbar. Escape bricht den laufenden Zug ab. Bearbeitungen ändern nicht die Reihenfolge der Elemente. Bei überlappenden Elementen wird per Klick das oberste passende Begrenzungsrechteck ausgewählt; über die Liste sind darunter liegende Elemente erreichbar. Der Radierer ist kein auswählbares Objekt; seine Spuren bleiben an ihren Displaypositionen. Auswahlrahmen und Ziehpunkte sind reine Bedienhilfen und werden weder exportiert noch versendet. Native Displaykoordinaten, Ansichtsdrehung und unabhängige Quellbildbearbeitung bleiben erhalten.

Ein geöffneter Zeicheneditor scrollt mit der Seite, damit er auf kleinen Bildschirmen nicht die anderen Bedienelemente verdeckt. Die Bearbeitung bleibt sitzungsbezogen; ein exportierter Font oder ein Bild enthält weiterhin das zusammengesetzte Ergebnis, kein editierbares Projekt.

**Gelbdarstellung:** Auf dem geprüften AP verwenden M3 4.2 BWY (3C.json) und M3 7.5 BWRY (4C.json) beide #FFFF00 als colortable-Wert und #C8C800 als perceptual-Wert. HS 7.5 BWRY (6B.json) verwendet für beide #FFFF00. Gleiche Profilwerte garantieren keine identischen Panel-Farben. Die Toolbox nutzt bislang colortable für Konvertierung und Vorschau; eine separate perceptual-Panelvorschau ist nicht Bestandteil dieser Version. Es wurden lediglich diese Profile und die Displayliste am AP gelesen.

## Unabhängige Vorschauen und größere Arbeitsfläche (2.11.0)

Die Fünffarben-Palette heißt in der Auswahl jetzt **BWRYO · Spectra 3100 Plus**. Damit stehen Farbkennung und technische Produktbezeichnung zusammen; gespeicherte Preset-Schlüssel bleiben unverändert.

Quellbild und Display-Vorschau besitzen direkt an ihrer Überschrift getrennte Zoom-Auswahlen: Einpassen sowie 25/50/100/200/400/800 %. Die Auswahl verändert ausschließlich die Darstellung, nicht Einpassmodus, Ausschnitt, Bildskalierung, Displaygröße oder Export. 100 % entspricht einem Originalpixel pro CSS-Bildschirmpixel. Bei großen Quellen wird für explizite Zoomstufen die vollständige Quellauflösung verwendet; die verkleinerte Arbeitsvorschau beim Einpassen bleibt erhalten. Auch Ausschnitt- und Zeichenkoordinaten berücksichtigen den jeweiligen Zoom. Größere Ansichten sind innerhalb des Bildbereichs scrollbar, einschließlich ihres linken/oberen Rands.

Die Seite nutzt auf großen Monitoren die verfügbare Breite. **Bildbereich (% Fensterhöhe)** legt die gemeinsame Höhe beider Bildbereiche zwischen 25 und 85 Prozent der Fensterhöhe fest, Standard 55 %. Doppelklick setzt den Regler auf 55 zurück. Bei einer für das Fenster zu hohen Vorschau scrollt das Bildpanel mit, damit seine Bedienelemente erreichbar bleiben.

**Arbeitsansicht vergrößern** blendet Kopfbereich, Werkzeugnavigation und Einführung aus und erhält die Bildkorrekturen neben der Vorschau. Mit „Arbeitsansicht verkleinern“ oder Escape kehrt die normale Ansicht zurück. Während eines laufenden Zeichen-/Bearbeitungszugs verwirft Escape zuerst diesen Zug; ein weiteres Escape verlässt die große Ansicht. Die beiden Zoomwerte bleiben beim Umschalten erhalten. Neue Quellen, Ausschnitt zurücksetzen, Ausschnittgröße (1:1) und Quellbild-Drehung setzen wie bisher die Vorschauen auf Einpassen zurück.

## Helle/dunkle Darstellung und Presetnamen (2.12.0)

Oben rechts unter **Darstellung** stehen Automatisch, Hell und Dunkel zur Auswahl. Automatisch ist die Voreinstellung und folgt der Hell-/Dunkel-Einstellung des Systems bzw. Browsers, auch bei Änderungen während der Sitzung. Manuelle Auswahl hat Vorrang und wird lokal gespeichert. Beim Neuladen wird sie vor dem ersten Seitenaufbau angewendet. Ist lokaler Speicher gesperrt, bleibt die Auswahl für die Sitzung nutzbar. Unter derselben Herkunft geöffnete weitere Tabs übernehmen Änderungen über das Browser-Speicherereignis.

Die Darstellung betrifft Bildeditor, Zeicheneditor, Export-/AP-Bereiche, LED-Designer, Zeitstrahl, Eingabefelder und Statusmeldungen. Bilder, Palettefarben, Einfügebilder, LED-Farben, JSON und Bild-/Font-Exporte werden nicht umgefärbt oder neu berechnet. Die Darstellungsauswahl liegt neben der Sprache; bei vergrößerter Arbeitsansicht zunächst zur normalen Ansicht zurückkehren, um die ausgeblendete Kopfzeile wieder zu erreichen.

Eindeutig benannte Displaytypen werden mit Farbkennung zuerst angezeigt: **BWRYO · Spectra 3100 Plus**, **BWRYGB · Spectra 6**, **BWRYGBO · ACeP 7**. BW, BWR, BWY und BWRY bleiben reine Farbkennungen; daraus wird kein bestimmter Paneltyp abgeleitet. Die gespeicherten Palettenschlüssel und RGB-Werte bleiben unverändert. In diesen Kombinationsnamen bedeutet B das übliche „Black“ und zusätzliches B bei den Mehrfarbtypen „Blue“; in der einzelnen Farblegende bleibt K für Schwarz und B für Blau eindeutig.


## Zusammengefasste Testbildfunktionen (2.12.1)

Unter „Quelle und Ausgabe“ sind alle Funktionen zum Erzeugen von Testmustern und Laden des Beispielbilds im eigenen Bereich **Test- und Beispielbilder** zusammengefasst. Der Bereich startet eingeklappt. Er enthält Musterauswahl, Erzeugen-Button, Beispielbild sowie Beschriftung, Testfarben, Schachbrettgröße und Rausch-Startwert. Ein-/Ausklappen verändert weder Bildinhalt noch Einstellungen. Zooms, Bildbereichshöhe und Zeichenebene bleiben separat erreichbar.


## Eindeutige Linienfelder (2.12.2)

Der Linientest verwendet jede andere Farbe einmal auf der hellsten Palettenfarbe. BW hat ein Schwarz/Weiß-Feld, BWR zwei Felder (Schwarz/Weiß und Rot/Weiß), ACeP7 sechs Felder. Das jeweils invertierte Feld der hellsten Farbe entfällt. Gilt für Gesamtbild und bildfüllenden Linientest sowie eigene Paletten. Farbflächen, Mischfelder und Verläufe behalten alle Palettenfarben.


## Kontrast der Farbflächen-Beschriftung (2.12.3)

Beschriftungen innerhalb von Testbild-Farbflächen verwenden unter 50 % gewichteter RGB-Helligkeit die hellste Palettenfarbe, ab 50 % die dunkelste. Dadurch erhalten z. B. Blau, Rot und Violett eine helle, Gelb und helles Grün eine dunkle Beschriftung. Maßgeblich ist die gewichtete RGB-Helligkeit (0,2126 R + 0,7152 G + 0,0722 B), normiert auf 0–1; dies ist keine physische Panelmessung. Falls eine eigene Palette nur dunkle oder nur helle Farben enthält und die gewählte Schriftfarbe dem Hintergrund entspricht, wird die jeweils andere Extremfarbe verwendet.


## Eckmarken an den tatsächlichen Ecken (2.12.4)

Bei vollständiger Testbild-Beschriftung stehen OL/OR und UL/UR an der oberen bzw. unteren linken/rechten Bildecke. In englischer Sprache werden TL/TR/BL/BR verwendet. Die Auflösungsangabe steht auf einer eigenen Zeile, die einzelne Schriftprobe „ABC 0123“ mittig unten; das Diagonalkreuz bleibt davon getrennt. Rechtsbündige Marken werden anhand der tatsächlichen Pixelschrift-Breite ausgerichtet. Bei reduzierter Beschriftung bleiben die Ecktexte wie bisher ausgeblendet.

## Mehrfarbmischungen und Entfernungsvorschau (2.13.0)

Im Einzelbereich **Farbmischungen** lassen sich unter „Anzahl Mischfarben“ Kombinationen aus zwei bis sämtlichen Palettenfarben wählen. Jede ungeordnete Kombination erscheint genau einmal; jedes Muster verwendet gleiche Anteile der beteiligten Farben. Zweiermischungen bleiben 1-Pixel-Schachbretter. Drei oder mehr Farben verwenden ein n×n-Pixelraster, in dem jede Farbe n-mal vorkommt. An angeschnittenen Feldrändern können die Gesamtanteile um wenige Pixel abweichen.

Pro Bildseite werden maximal zwölf Felder erzeugt. Vorherige/Nächste Seite erzeugt die gewählte Seite direkt; die Seitenzahl erlaubt Sprünge. Nach Änderung der Anzahl Mischfarben „Testbild erzeugen“ anklicken. Die Mischfeld-Legende nennt die Kombinationen in Leserichtung. Wenn eine Kombination zu lang für die Feldbeschriftung ist, verweist eine Feldnummer auf die Legende. Kleine Displays können Beschriftungen wie bisher weglassen.

BWRY hat vier Dreiermischungen und eine Vierermischung; ACeP7 hat 35 Dreiermischungen auf drei Seiten. Auch große eigene Paletten bleiben durch die Seitenauswahl nutzbar (16 Farben, acht pro Mischung: 12.870 Kombinationen). Es gibt keine automatische Versandfolge. Das allgemeine Testbild enthält unverändert nur Zweiermischungen; seine Mischfelder werden durch diese Auswahl nicht erweitert. Andere Mischungsverhältnisse als gleiche Anteile sind hier nicht enthalten.

Unter der Zielvorschau liegt **Entfernungsvorschau (Blur)**, 0–4 Bildpixel in Schritten von 0,25. Der Regler verändert ausschließlich die Anzeige des Ziel-Canvas. Die Filterung erfolgt vor der Anzeige-Skalierung auf dem nativen Zielraster (siehe 2.13.1). Quellvorschau, Ausschnitt, Konvertierung, Bild-/Font-Exporte und AP-Versand bleiben unverändert. Doppelklick setzt auf 0 zurück. Der Effekt macht die optische Verschmelzung kleiner Rasterpunkte sichtbar; er ist eine qualitative Näherung auf dem Bildschirm, keine Simulation eines festgelegten Betrachtungsabstands oder vermessenen Panels. Im Bild enthaltene Beschriftungen werden weichgezeichnet; Auswahlmarkierungen bleiben seit 2.13.1 scharf.

## Blur vor der Skalierung (2.13.1)

Die Entfernungsvorschau wird jetzt **zuerst auf einer separaten Kopie in nativer Zielauflösung weichgezeichnet und erst anschließend für die Anzeige skaliert**. Der Radius bleibt in Bildpixeln definiert. Es gibt keinen nachträglichen CSS-Blur auf dem bereits verkleinerten Raster mehr. Bei aktivem Blur wird die gefilterte Kopie glatt skaliert; bei 0 bleibt die scharfe Pixelansicht erhalten. Das reduziert die Moiré-Gefahr beim Verkleinern feiner Dither-/Mischmuster. Sehr geringe Blur-Stärken können weiterhin Rasteranteile sichtbar lassen.

Die native Filterkopie wird beim reinen Zoomwechsel wiederverwendet, damit der Effekt weder vom Zoom abhängt noch mehrfach aufeinander angewendet wird. Bildränder werden für den Filter fortgesetzt, sodass deckende Ränder nicht transparent auslaufen. Unterstützt der Browser Canvas-Filter nicht, steht eine native Gauß-Berechnung mit korrekter Alpha-Behandlung als Rückfall zur Verfügung.

Auswahlrahmen und Ziehpunkte werden erst nach dem Blur gezeichnet und bleiben scharf. Im Bild enthaltene Texte und Markierungen werden als Bestandteil des Bildes weiterhin weichgezeichnet. Zeichen-Vorschauen einschließlich laufender Züge benutzen dieselbe Reihenfolge. Konvertierung, logische Bilddaten, Quellvorschau, sämtliche Exporte und AP-Versand bleiben ungefiltert. Es bleibt eine qualitative Entfernungsvorschau ohne kalibrierten Betrachtungsabstand.

## Bilder aus der Zwischenablage (2.14.0)

Mit **Strg+V / Cmd+V** lassen sich kopierte Bilder und Screenshots in das Bildstudio einfügen. Ohne aktiven Zeichenmodus wird das Quellbild ersetzt. Bei aktivem Zeichnen und vorhandener Quelle entsteht stattdessen ein eigenes Bildelement: mittig platziert, bei Bedarf auf die Zielansicht verkleinert und zur weiteren Bearbeitung ausgewählt. Die Quelle bleibt dabei erhalten. Das Element lässt sich wie andere Bilder verschieben, skalieren, entfernen und rückgängig machen.

**Bild aus Zwischenablage** neben dem Dateiöffnen fügt ausdrücklich als Quelle ein, auch wenn Zeichnen aktiv ist. **Aus Zwischenablage einfügen** im Werkzeug „Bild einfügen“ fügt ausdrücklich als Zeichenelement ein. Für ein Zeichenelement zuerst eine Quelle oder leere Zeichenfläche anlegen. Die bisherigen Grenzen für Quellbilder und Einfügebilder gelten auch für Zwischenablagebilder.

Eingaben in Text-/Zahlenfeldern und editierbaren Textbereichen werden nicht abgefangen. Text, HTML und Bild-URLs allein werden nicht als Bild importiert; benötigt werden echte Bilddaten aus der Zwischenablage. Unterstützt werden PNG, JPEG, WebP, BMP, GIF und AVIF, sofern der Browser sie dekodieren kann. Im LED-Designer werden Bild-Paste-Ereignisse ignoriert.

Der Knopf benötigt die Clipboard-Lese-API und ggf. eine Browserfreigabe bzw. einen sicheren Seitenkontext. Falls der Browser den Zugriff nicht anbietet oder verweigert, die Tastenkombination verwenden: Das Paste-Ereignis kann ohne diese Lese-API verarbeitet werden. Gelesen wird nur auf ausdrücklichen Knopfdruck bzw. Einfügen, niemals automatisch. Aktuelle Bilder bleiben bei fehlendem Bildinhalt oder Lese-/Dekodierfehlern erhalten. Es erfolgt kein automatischer Versand.

## Floyd-Steinberg: keine Fehlerweitergabe außerhalb des Palettenfarbraums (2.15.0)

Bei kleinen Paletten kann ein Farbanteil prinzipiell nicht mischbar sein, z. B. ein Grünüberschuss bei BWRY. Solche Anteile wurden bisher als Farbfehler über viele Pixel weitergegeben. Dadurch konnten in nachfolgenden, eigentlich darstellbaren warmen Bereichen Akzentfarben unterdrückt werden; sichtbar als harte Schnitte oder graue Stellen in Hauttönen.

Für Floyd-Steinberg mit positiver Stärke werden die korrigierten Quellfarben nun vor der Fehlerweitergabe auf den konvexen, durch die gewählte RGB-Palette mischbaren Farbraum abgebildet. Die weitere Fehlerdiffusion bleibt vorzeichenbehaftet; RGB-Fehler werden nicht einfach auf 0–255 abgeschnitten. Unterstützt werden auch zweifarbige, ebene und eigene Paletten ohne Weiß. Die Farbraumabbildung ist kontinuierlich und verwendet keine gerundete RGB-Farbgitter-Projektion; der begrenzte Cache speichert exakte ganzzahlige RGB-Eingaben.

Beim Reduzieren der Dither-Stärke bleibt die ursprüngliche direkte Farbzuordnung der Endpunkt, auch wenn die Farbraumabbildung die nächstliegende Einzelfarbe ändern würde. Bei Stärke 0 wird unverändert die direkte Zuordnung verwendet. Bayer und „Ohne“ sind unverändert. Gamut-Zuordnung und Dithering verwenden die logischen RGB-Werte der ausgewählten Palette, keine vermessenen Panelwerte.

Die Korrektur wurde mit BWRY bei Stärke 1 am bereitgestellten Fahrradfoto verglichen. Gesichts-, Arm- und Beinfarben bleiben deutlich gleichmäßiger erhalten. Ein gezielter Test prüft außerdem grüne, außerhalb des BWRY-Farbraums liegende Flächen direkt vor warmen Farbflächen. Bestehende Tests für neutrale Grautöne, Orange-Verhalten, kleine Dither-Stärken, Transparenz sowie VLW/JPEG bleiben erfolgreich.


### Farbstufen ohne Dithering (2.16.0)

Unter **Farbausgabe** stehen zusätzlich zwei Modi bereit:

- **Farbstufen erhalten · RGB** übernimmt die Quellfarben nach Zuschnitt, Skalierung und Farbkorrekturen ohne Quantisierung.
- **Farbstufen erhalten · Palettenfarbraum** begrenzt die korrigierten RGB-Werte kontinuierlich auf den konvexen RGB-Farbraum der gewählten Palette. Mischfarben bleiben erhalten, es wird kein Pixelraster erzeugt. Das ist ein rechnerischer Farbraum, keine Simulation der realen Displaypigmente.

PNG und JPEG enthalten diese vorbereiteten Verläufe; sie können in anderen Anwendungen weiterverarbeitet werden. PNG bleibt verlustfrei und erhält Transparenz. JPEG bleibt trotz Qualität 100 verlustbehaftet und setzt Transparenz auf Weiß.

Im Farbstufenmodus lässt sich **Dithering beim Direktversand (AP)** auf Ohne (0), Floyd–Steinberg (1, Vorgabe) oder Geordnetes Raster (2) setzen. Die Auswahl gilt auch beim Ausweichweg für HTTP 413. Bei quantisierter Ausgabe bleibt AP-Dithering wie bisher abgeschaltet, um eine erneute Rasterung zu vermeiden. Beim reinen Datei-Export oder Ablegen im AP-Dateisystem ist die Auswahl nicht in der Bilddatei gespeichert; die spätere Anwendung bzw. der AP muss entsprechend eingestellt werden. Die Vorschau zeigt die Vorbereitung, nicht das endgültige Dithering des APs.

Helligkeit, Kontrast, Sättigung und Schwellwert bleiben aktiv. Einzelne Palettenfarben bevorzugen und Dither-Stärke sind in diesen Modi deaktiviert. Invertieren kehrt alle RGB-Kanäle um. Die Zeichenebene bleibt erhalten. VLW-Export, Ebenenplan und VLW-Template sind nur bei quantisierten Palettenfarben möglich.

OEPL-Dithering-Werte: [offizielle Integrationsdokumentation](https://github.com/OpenEPaperLink/Home_Assistant_Integration/blob/main/docs/drawcustom/supported_types.md).


### Vorschauberechnung (2.16.1)

Die bestehende Aktivitätsanzeige mit Zahnrädern wird vor der Vorschauberechnung eingeblendet und bleibt nach Abschluss kurz sichtbar. Schnelle Eingaben werden zusammengefasst; überholte Berechnungen werden vor ihrem Start verworfen. Fehler beenden die Anzeige mit einer Fehlermeldung. Parallel laufende Übertragungen bleiben unabhängig aktiv. Die Anzeige signalisiert laufende Arbeit, keinen prozentualen Fortschritt.


### Zeichenebene ohne erneute Quellkonvertierung (2.16.2)

Zeichnen, Verschieben, Größen-/Farbänderungen, Radieren, Rückgängig/Wiederholen und Ein-/Ausblenden der Zeichenebene verwenden das bereits konvertierte Quellbild. Reine Auswahl- und Werkzeugwechsel zeichnen nur die Vorschau neu. Die Fortschrittsanzeige bleibt echten Quellkonvertierungen vorbehalten; Export und VLW-Template enthalten weiterhin die aktuelle Zeichenebene. Änderungen an Zuschnitt, Bildgröße oder Farbkonvertierung verwerfen den Zwischenspeicher.


### Schriftarten für Texte (2.17.0)

In den Textoptionen der Zeichenebene lässt sich die Schriftart auswählen: Standard ohne Serifen, mit Serifen, Festbreite sowie Arial, Verdana, Trebuchet MS, Georgia, Times New Roman und Courier New. Es werden lokal verfügbare Schriften verwendet; bei fehlender Schrift greift die passende Ersatzschrift des Browsers. Keine externen Schriftabrufe.

Zum Ändern vorhandener Texte das Element auswählen und die Schrift umstellen. Änderungen sind rückgängig machbar. Auswahlrahmen und Größenänderungen berücksichtigen dieselbe Schrift wie die Ausgabe. PNG, JPEG und VLW enthalten bereits die gerasterten Texte; auf dem AP ist keine entsprechende Schrift erforderlich.


### Farbflächen mit festen Mischfarben (2.18.0)

Unter **Farbausgabe → Farbflächen · feste Mischfarben** lässt sich die Zahl der **Displayfarben pro Mischton (höchstens)** auf 1, 2, 3 oder 4 begrenzen. Gemeint sind die beteiligten Displayfarben innerhalb eines Mischtons, nicht die Anzahl der Farbtöne im gesamten Bild. Reine Farben bleiben immer enthalten.

Verwendet werden gleichmäßige Mischungen: Zweiermischungen 1:1, Dreiermischungen 1:1:1, Vierermischungen 1:1:1:1. Die regelmäßigen 1-Pixel-Muster entsprechen den Mischfeldern im Testbild (2×2, 3×3 bzw. 4×4). Der passende Ton wird anhand des Lab-Abstands zum rechnerischen RGB-Mittel gewählt. Bei identischem Mittelwert wird die einfachere Kombination bevorzugt. Die Farbsuche nutzt ein begrenztes 5-Bit-RGB-Gitter; exakte Palettenfarben bleiben ohne Farbgewichtung exakt erhalten. Physische Pigmentfarben werden nicht simuliert.

Beispiel BWRY: maximal 2 Farben ergibt 4 reine Farben plus 6 Zweiermischungen (10 Mischtöne), maximal 3 ergibt 14, maximal 4 ergibt 15. Es gibt keine gleitenden Zwischenverhältnisse oder Fehlerdiffusion. Verläufe werden zu klaren Stufen. Kleine Schwankungen innerhalb einer Stufe ändern das Muster nicht; Bildrauschen nahe einer Stufengrenze kann weiterhin Wechsel verursachen. Der Modus ist keine Rauschunterdrückung.

Farbkorrekturen und Farbgewichtungen bleiben nutzbar. Die Dither-Stärke entfällt. PNG, JPEG, VLW und Direktversand funktionieren; AP-Dithering bleibt für die bereits vorbereiteten Muster aus. PNG/VLW bewahren die Pixelmuster verlustfrei, JPEG bleibt verlustbehaftet. Maximal verfügbare Palettenfarben begrenzen die tatsächliche Mischung auch dann, wenn eine höhere Zahl ausgewählt ist.


### Sichtbare Bilder beim Scrollen (2.18.1)

Auf größeren Bildschirmen bleibt der Vergleich auch bei geöffnetem Zeicheneditor und hoher Vorschau angeheftet. Ein variabler oberer Abstand lässt längere Werkzeugbereiche zuerst nach oben scrollen und priorisiert die Sichtbarkeit der Bilder vor dem unteren Beschriftungsbereich. Nach oben scrollen macht die Werkzeuge wieder erreichbar. Am Ende des Einstellungsbereichs folgt die Vorschau wieder dem Dokument. Auf kleinen Bildschirmen bleiben hohe bzw. aufgeklappte Editorbereiche normal scrollbar.


### Gemeinsamer Konvertierungskern und ioBroker (2.19.0)

Palette, Farbkorrekturen, Lab-Zuordnung, Floyd, Bayer, kontinuierliche Farbstufen und feste Mischfarben liegen in `js/image-converter.js` mit den reinen Helfern `gamut.js` und `fixed-mix.js`. `core.js` verwendet denselben Kern für die Toolbox. Die validierte Schnittstelle `js/image-api.js` stellt `OEPLImage.convert({data,width,height,palette,dithering,...})` bereit. RGBA-Eingabe bleibt unverändert; Ausgabe ist ein Uint8ClampedArray mit Alpha.

`node build-image-converter.cjs` erzeugt ein eigenständiges Browser-/CommonJS-Modul ohne Laufzeitabhängigkeiten. Beispiel und vollständige Schnittstellenbeschreibung: `IMAGE-CONVERTER.md`. Der ioBroker-Kalenderdienst bettet eine vom selben Builder erzeugte Fabrik ein; keine zusätzlichen globalen Skripte oder npm-Pakete. Seine Anlassbilder werden nach Festlegung der endgültigen Größe konvertiert. Kalendertext und Warnungen behalten ihre bisherige Farbbehandlung.


### Linien-/Textoptimierung, Navigation und Ellipsen (2.20.0)

**Linien und Schrift optimieren** enthält Presets Aus, Comic, Diagramm und Nur Text verbessern. Vier unabhängig schaltbare Stärken steuern dunkle Konturen, farbige dünne Linien, Schrift auf hellem Hintergrund und Flächenberuhigung. Vorgabe ist Aus. Manuelle Änderungen wechseln auf Eigene Einstellungen; Doppelklick auf einen Stärkeregler setzt ihn auf 50 zurück. Ausschalten stellt die unveränderte Konvertierung wieder her. Die Presets ändern die sonstige Palette und das Dithering nicht. Für ruhige Comicflächen lässt sich dies mit festen Mischfarben kombinieren.

Die Verarbeitung arbeitet vor der Zeichenebene, zeigt ihr Ergebnis in der normalen Vorschau und wird in allen Exporten berücksichtigt. Originalpixel der Quelle bleiben unverändert. Konturen-/Textmasken werden vor dem Verkleinern aus der Quelle gewonnen und separat ins Zielraster übertragen. Farbige dünne Strukturen werden durch eine morphologische Öffnung von großen Flächen unterschieden und bei passender Akzentfarbe geschützt; es gibt keine Garantie, dass jede Linienfarbe auf einer begrenzten Displaypalette unterscheidbar bleibt. Automatischer Textschutz ist eine Näherung für dunkle Schrift auf hellen Flächen, keine OCR. Hohe Stärken können Buchstaben schließen oder Linien verdicken. Bei großen Quellen ist die Analyse auf 2 Millionen Pixel begrenzt; bei aktiver Flächenberuhigung wird diese Arbeitsauflösung auch für die geglättete Farbvorlage verwendet. Ohne Flächenberuhigung wird die Farbvorlage weiterhin direkt aus der Originalquelle skaliert.

**Ansicht verschieben:** Quell- und Zielansicht sind unabhängig. Im Automatikmodus zieht die linke Maustaste die Ansicht, sofern Ausschnittwahl, Zeichenwerkzeuge oder native/freie Bildpositionierung den jeweiligen Bereich nicht beanspruchen. Der Modus Ansicht verschieben sowie Mitteltaste oder Leertaste + Ziehen haben Vorrang. Strg + Mausrad zoomt am Mauszeiger; normales Mausrad scrollt weiter. Zwei Finger verschieben/zoomen die Ansicht, ein laufender Zeichenentwurf wird vor Übernahme der Zweifingergeste verworfen. Ein Finger nutzt die jeweils aktive Funktion; mit Ansicht verschieben wird er zum Verschieben verwendet. Navigation verändert weder Ausschnitt noch Bildposition, Zeichenhistorie oder Export. Die Dropdowns zeigen auch durch Gesten erzeugte Zwischenzoomwerte an.

**Ellipse:** Neues Werkzeug von Ecke zu Ecke. Rechtecke und Ellipsen werden mit Shift beim Erzeugen 1:1; beim Ziehen vorhandener Eckgriffe hält Shift das vorhandene Seitenverhältnis. Alt erzwingt dort 1:1. Der Schalter Seitenverhältnis halten ersetzt Shift bei Touch. Kreis bleibt als Mittelpunkt-/Radiuswerkzeug erhalten; Bilder und Text behalten ihre bisherigen proportionalen Größenänderungen. Ellipsen lassen sich nachträglich verschieben, skalieren, färben und rückgängig machen.

**Dithering und Optimierungen · Beispiele** ist im Bildbereich ausklappbar. Acht lokal erzeugte PNG-data-URLs vergleichen Ohne, Floyd, Bayer, feste Zweiermischungen, RGB, Palettenfarbraum sowie Konturen-/Textschutz aus und an. Die aktuelle Palette wird berücksichtigt, der Vergleich nutzt feste Referenzstärken und zeigt keine aktuellen Quellkorrekturen. Es werden keine externen Bilder geladen. Die Beispiele werden erst beim Öffnen erzeugt und bei Paletten-/Sprachwechsel aktualisiert. Deutsch und Englisch vollständig ergänzt.

Die neuen Bildoptimierungen sind lokale Editor-Funktionen. Der zuvor ausgelieferte reine Konverter und das laufende ioBroker-Skript wurden in diesem Schritt nicht verändert.


### Portable Optimierungen und ioBroker (2.20.1 / Bildkonverter 1.1.0)

Die Bildoptimierung ist jetzt zusätzlich im eigenständigen Konverter verfügbar. `convert` akzeptiert `illustration:{preset:'comic'|'diagram'|'text'|'off',dark:0..100,color:0..100,text:0..100,smooth:0..100}`. Einzelwerte überschreiben das Preset, auch mit 0. Ohne Angabe bleibt die Ausgabe unverändert. Das Modul stellt Einstellungen, Quellmasken-Vorbereitung, portable Maskenskalierung und Anwendung getrennt bereit; damit kann eine Anwendung die Masken vor ihrer eigenen Bildverkleinerung gewinnen. Die Node-Variante benötigt dafür kein Canvas.

Der ioBroker-Kalenderdienst verwendet dieselben Quellen für Anlassbilder und hält die Maskenanalyse vor der endgültigen Verkleinerung. Pro Profil steht die Einstellung unter `imageProcessing.illustration`; zunächst global und in allen bestehenden Profilen aus. Kalendertext, Warnungen und Upload-Code sind unverändert. Siehe `IMAGE-CONVERTER.md` für die portable API. Browseroberfläche und Bedienung bleiben wie in 2.20.0.


## Entwicklung und Prüfung

Voraussetzung für Tests und Build: Node.js 22 oder neuer. Es werden keine zusätzlichen npm-Pakete benötigt.

```sh
npm test
npm run build
npm run build -- oepl-toolbox.html
```

Der Standardbuild schreibt nach `dist/`; der letzte Aufruf aktualisiert die mitgelieferte Einzeldatei im Repository. Nach Quelländerungen diese Datei mit aktualisieren. Die automatischen Tests prüfen die Rechenmodelle; zusätzliche Browserprüfungen stehen unter `tests/*-browser-check.js` und verwenden lokale Testseiten bzw. simulierte APs.

Der Konverter lässt sich unabhängig mit `npm run build:converter` bündeln. Details: [IMAGE-CONVERTER.md](IMAGE-CONVERTER.md). Fragen und Fehler bitte mit Browser-/Toolbox-Version, gewählter Palette und reproduzierbaren Schritten als Issue melden. Eigene AP-Adressen, MACs, Bilder und private Daten vor dem Veröffentlichen entfernen.

## Herkunft und Lizenz

Ursprüngliches Projekt und bisherige Entwicklung: [olanwe/img2vlw](https://github.com/olanwe/img2vlw). Die bisherige Git-Historie bleibt erhalten. Die Erweiterung zur OEPL-Toolbox entstand mit Unterstützung von KI, insbesondere ChatGPT/Codex. Umsetzung und Änderungen werden im Repository nachvollziehbar versioniert.

GPL-3.0, siehe [LICENSE](LICENSE). Der lokal eingebundene JPEG-Encoder jpeg-js 0.4.4 steht unter BSD-3-Clause; dessen Lizenz befindet sich in [vendor/jpeg-js.LICENSE](vendor/jpeg-js.LICENSE). Die fertige Einzeldatei enthält beide Lizenztexte.

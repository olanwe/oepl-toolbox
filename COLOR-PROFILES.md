# Farbprofile / color profiles

## Bedienung

1. Unter **Display & Farben** zuerst die nominale Farbpalette wählen, etwa BWRY.
2. **Farbprofil für die Berechnung** auswählen. **Idealisiert – reine RGB-Farben** rechnet ohne Korrekturprofil. Für BWRY wird zusätzlich **BWRY · generische Näherung (feine Raster)** angeboten. Das Profil ist optional und keine universelle Panelkalibrierung.
3. Unter **Farbprofil bearbeiten / eigenes Profil speichern** lassen sich Referenzfarben mit Picker oder Hex-Wert, Profilname, Herkunft, Datengrundlage und Mischungsmodell festlegen. Änderungen werden erst beim Speichern aktiviert. Ein anderer Name legt eine Kopie an; ein vorhandener eigener Name wird ersetzt.
4. Eigene Profile lassen sich als JSON exportieren, importieren und löschen. Vor dem Import die passende nominale Farbpalette wählen. Höchstens 50 eigene Profile, 32 KiB je Import; Speicherung lokal im Browser.

Nur Profile mit genau denselben nominalen Farben werden angeboten; deren Reihenfolge darf abweichen. Für andere Paletten stehen eigene Profile und die optionale AP-Übernahme zur Verfügung. Die früheren OEPL-Gelb-, Spectra-3100- und Waveshare-Herstellernäherungen werden nicht mehr als Vorgaben mitgeliefert. Bereits gespeicherte eigene Kopien bleiben erhalten. Alte Auswahlen entfernter Vorgaben fallen auf „Idealisiert“ zurück; die bisherige generische Auswahl bleibt erhalten.

Unter der Profilauswahl vergleicht **Panelfarben im Profil** die idealisierten Displaycodes mit den hinterlegten, unnormalisierten Panelreferenzen. Diese Bildschirmfarben sind Näherungen, keine Messung des angeschlossenen Panels. Die Anzeige bleibt beim Umschalten der Normalisierung unverändert, da sie die ursprünglichen Referenzen zeigt. Ohne gewähltes Korrekturprofil wird der Vergleich ausgeblendet.

Unter dem Zielbild schaltet **Vorschaufarben** zwischen idealisierten und Profilfarben um. Das ändert weder die berechneten Indizes noch die Exportdatei und startet keine erneute Konvertierung. Die Entfernungsvorschau glättet in nativer Auflösung.

## Profilhelligkeit und eigene Referenzen

Die erweiterte Einstellung **Profilhelligkeit** im aufklappbaren Profileditor bietet **Relativ normalisiert** (Vorgabe für Farbprofile) und **Unnormalisierte Referenzwerte**. Diese Auswahl wirkt auf die Berechnung und die Profilvorschau; sie ist unabhängig vom Vorschaufarben-Schalter. Die Wahl wird je Profil bzw. AP-Display lokal gespeichert und im Profil-JSON mitgeführt.

Für normale Bildkonvertierung sollte relative Normalisierung aktiv bleiben. Die unnormalisierte Berechnung dient vor allem dem Vergleich von Messwerten und Modellen; helle Quelltöne können dabei wegen des dunkleren Panelweiß zusammenfallen.

Das generische Reflexionsmodell normalisiert gemeinsam in XYZ und berücksichtigt die Rasterwirkung; siehe unten. Eigene Profile können alternativ die klassische RGB-Berechnung verwenden. Deren Normalisierung passt Panelweiß mittels Bradford auf neutrales D65 an und bildet die L*-Spanne gemeinsam auf 0–100 ab. Akzentfarbtöne bleiben dabei erhalten; außerhalb von sRGB wird die Buntheit reduziert. Das ist keine vollständige ICC-Kalibrierung.

Im Editor stehen die **ursprünglichen unnormalisierten RGB-Referenzen**. Originale L*a*b*-Daten bleiben zusätzlich im JSON und in unveränderten Kopien erhalten. Manuelle RGB-Änderungen entfernen die dann nicht mehr passenden Lab-Daten. Ohne geeignete Weiß-/Schwarzreferenzen bleibt die unnormalisierte Variante aktiv.

## AP-Übernahme

Bei **Profil übernehmen** kann **AP-Farbprofil ebenfalls übernehmen** eingeschaltet bleiben oder abgewählt werden. Ein gültiges `perceptual`-Objekt wird zusammen mit der nominalen `colortable` übernommen. Fehlende einzelne Wahrnehmungsfarben fallen auf den nominalen Wert zurück. Die Zuordnung erfolgt nach Farbnamen und nominalem Wert.

Eine gewählte Profilzuordnung wird je AP und Display lokal gespeichert und hat beim nächsten Übernehmen Vorrang. Ohne gültige AP-Referenzen oder passende gespeicherte Zuordnung wird idealisiert gerechnet. Das bloße Auswählen eines Tags ändert die Berechnung nicht; dafür **Profil übernehmen** benutzen. Wird die AP-Profilübernahme abgewählt und das Displayprofil übernommen, werden das bisherige AP-Farbprofil und dessen Zuordnungskontext gelöst. Eigene und generische Profile bleiben unabhängig davon auswählbar. Es wird nichts an das Display geschrieben.

## Ausgabe und Grenzen

- PNG/JPEG/VLW und Versand verwenden weiterhin die nominalen Farbcodes. Die Profilvorschau kann zusätzliche RGB-Werte zeigen.
- Explizite Zeichenfarben behalten ihre nominalen Indizes. Zwischenfarben eingefügter Bilder werden anhand des Profils zugeordnet.
- Kontinuierliche RGB-/Palettenfarbraum-Ausgabe bereitet Bilder für den AP vor und verwendet das lokale Korrekturprofil nicht.
- Andere Panels, Beleuchtungen und Ansteuerungen können abweichen. Ein Profil garantiert keine farbmetrisch exakte Wiedergabe.

## English

Choose the nominal **display palette** first. **Idealized** uses no correction profile. The optional **generic BWRY approximation (fine patterns)** is the only bundled correction preset. Custom profiles can be created, edited, saved, imported and exported as JSON. Profiles must match the nominal palette; color order may differ. Up to 50 custom profiles and 32 KiB per import are stored locally in the browser.

The former OEPL yellow, Spectra 3100 and Waveshare manufacturer presets are no longer bundled. Saved custom copies remain available. Removed preset selections fall back to Idealized; the former generic selection is migrated to its stable identifier.

The generic model uses shared XYZ normalization and an empirical raster response. Custom profiles may also use the classic RGB model, with relative Lab lightness normalization. Neither is a universal panel calibration. Original Lab references survive unchanged copies; editing RGB references discards stale Lab data.

Optional AP adoption reads valid `perceptual` references and associates the chosen override with that AP and tag. Export pixels always retain nominal display codes. Preview colors and native-resolution blur affect appearance only. Continuous-tone modes defer quantization to the AP and ignore the local profile.

## JSON format

```json
{
  "format": "oepl-color-profile",
  "version": 1,
  "profile": {
    "name": "My BWRY panel",
    "nominal": ["#ffffff", "#000000", "#ff0000", "#ffff00"],
    "renderColors": ["#ffffff", "#000000", "#ff0000", "#c8c800"],
    "source": "Example approximation; replace with your own references",
    "kind": "approximate",
    "normalization": "relative"
  }
}
```

`kind`: `approximate`, `measured` or `manufacturer`. These are user-provided provenance labels, not verification by the Toolbox. Profiles contain no AP address or tag MAC; per-display associations stay in browser storage.

`normalization`: `relative` (default) or `raw`. Optional `sourceLab` holds `whitePoint` (`D50` or `D65`), `assumedWhitePoint` (boolean) and `values` (one original `[L,a,b]` triple per nominal color). Its sRGB conversion must agree with `renderColors`. For exact Lab metadata, the relative variant is calculated before raw sRGB clipping.


## Generisches Reflexionsmodell (lokal, 2.23.0)

„BWRY · generische Näherung (feine Raster)“ ist das einzige mitgelieferte Korrekturprofil. Es ist optional; ohne Profil bleibt die bisherige RGB-Berechnung erhalten. Das Profil ist eine Näherung aus Foto-/Scannervergleichen eines BWRY-Panels, keine universelle Vermessung aller BWRY-Displays.

Das Modell trennt zwei Dinge:

- **Vollfarben:** abgerundete Lab-D50-Referenzen W `[68,-1,3]`, K `[14,3,-1]`, R `[29,41,27]`, Y `[56,17,74]`. Die Zahlengenauigkeit ist keine Messgenauigkeit. Die Auswahl orientiert sich an fotografischen Vergleichswerten und Herstellergrößenordnungen.
- **Feine Raster:** ein gemeinsamer Potenzexponent `n = 1.8` als bewusst einfache Näherung. Für ideal normalisiertes Schwarz/Weiß ergibt eine 50/50-Mischung damit rund `0.5^1.8 = 0.287` relative Modell-Luminanz. Kamera- und Scannervergleiche lieferten für feine Raster ungefähr diese Größenordnung, mit erheblichen Unsicherheiten. Der Wert ist kein spektral angepasster Yule-Nielsen-Parameter.

In „Farbprofil bearbeiten / eigenes Profil speichern“ sind Modell und Exponent einstellbar. Bereich 1–3, `1` bedeutet lineare Mischung im neuen Modell, `1.8` ist der Startwert. Ein Doppelklick setzt das Exponentenfeld auf 1.8 zurück. Änderungen werden mit Speichern übernommen; eigene Kopien können als JSON exportiert und importiert werden. Gröbere Muster können einen kleineren Exponenten benötigen. BWR, BWY und andere Paletten können eigene Modelle verwenden, erhalten aber kein unbelegt passendes generisches BWRY-Profil automatisch.

### Rechenweg

Die ursprünglichen Lab-Werte werden in XYZ umgerechnet. Bei relativer Helligkeit folgen eine Weißpunktanpassung und **eine gemeinsame affine XYZ-Abbildung** für Panelweiß/Schwarz. Die Rechenreferenzen werden nicht vorzeitig auf den sRGB-Farbraum begrenzt. Es wird keine einzelne Pigmentfarbe auf eine hellere L*-Stufe gestreckt.

Für XYZ-Komponente `X` und Bezugsweiß `Xw` lautet die Modellkoordinate `u = sign(X/Xw) * abs(X/Xw)^(1/n)`. Mischungen und Fehlerverteilung erfolgen in diesen Koordinaten; die Rückabbildung verwendet den Exponenten `n`. Die vorzeichenbehaftete Fortsetzung hält auch nach Normalisierung außerhalb des Monitorfarbraums liegende Koordinaten numerisch erhalten. Das ist eine rechnerische Näherung, keine Aussage über negative physikalische Reflexionen.

Floyd-Steinberg arbeitet mit zeilenweise wechselnder Laufrichtung. Bei der Begrenzung auf den Palettenfarbraum bleibt die Y-Modellkoordinate erhalten; nicht darstellbare Chromatik wird projiziert. Bayer bildet 16-Pixel-Anteile. Zwischengespeicherte Bayer-Kacheln verwenden einen eindeutigen Zielwert je Cachezelle; bei zwei bis vier unabhängigen Referenzen werden dafür Mischanteile gerundet, damit Gamut-Grenzflächen erhalten bleiben. Das Muster hängt dadurch nicht von vorher verarbeiteten Bildbereichen ab. Feste Mischfarben verwenden weiterhin gleiche Anteile der ausgewählten Farben. Reine Farben werden für „Ohne“ per Lab-Abstand gewählt. Explizite Zeichenfarben behalten ihre nominale Zuordnung.

Für zwei bis vier affin unabhängige Referenzfarben wird die Farbauswahl bei Floyd und beim Aufbau der Bayer-Kacheln anhand der Mischanteile vorgenommen. Dazu wird der aktuelle Modellwert einschließlich des vorzeichenbehafteten Fehlers in baryzentrische Koordinaten umgerechnet; gewählt wird der größte Anteil (zuzüglich der gewählten Farbgewichtung). Fehler werden weiterhin in den unveränderten Modellkoordinaten weitergegeben. Der vorherige euklidische Abstand konnte an einer Gamut-Grenzfläche eine dort nicht benötigte Farbe auswählen und einen langen Einschwingvorgang mit rotem Bildrand verursachen. Die Korrektur benötigt weder Vorlauf noch zweiten Bilddurchlauf und ändert keine Profilreferenz oder Rasterkennlinie. Für größere oder affin abhängige Paletten bleibt die bisherige Abstandsauswahl erhalten; dafür besteht diese Garantie nicht.

Die Profilvorschau verwendet dieselben Referenzen und dieselbe Mischung. Ihr Blur wird in nativer Auflösung in den Modellkoordinaten berechnet, danach rücktransformiert und erst zur Bildschirmdarstellung in sRGB begrenzt. Einfarbige deckende Flächen bleiben beim Blur konstant. „Idealisiert“ zeigt weiterhin nominale Farben. Export, VLW-Ebenen und AP-Versand verwenden immer nominale Farbcodes; das Modell erzeugt keine zusätzliche Displayfarbe.

### JSON-Erweiterung

Das bisherige Profilformat erhält ein optionales Feld:

```json
"mixing": { "model": "power-xyz", "exponent": 1.8 }
```

Ohne dieses Feld bleibt die bisherige Berechnung aktiv. Die vollständige Lab-Quelle bleibt bei unveränderten Farbeingaben erhalten. Ältere Toolbox-Versionen kennen das neue Feld nicht; für reproduzierbare Berechnungen ist eine Version mit Unterstützung dieses Modells erforderlich.

### Grenzen

Die Kennlinie unterscheidet keine einzelnen Farbpaare, Rastergrößen oder Nachbarschaften. Ihre Anwendung auf Bayer, Floyd-Steinberg und Drei-/Vierfarbenmischungen ist eine praktische Übertragung, keine unabhängige Hardwarevalidierung dieser Fälle. Andere Pigmente, Panelchargen, Beleuchtungen und Wellenformen können abweichen. Das Profil kann eine Darstellung verbessern, garantiert aber keine bessere Ausgabe auf jedem Display. Ein erster Porträtvergleich auf BWRY-Displays zeigte eine subjektiv natürlichere Gesichtsfarbe und eine hellere gelbe Tulpe. Das ist eine praktische Einzelprüfung und keine allgemeine Kalibrierung.

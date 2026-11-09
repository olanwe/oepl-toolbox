# LED-Designer · Bedienung und Firmwaremodell

Der LED-Designer ist ein eigenes Werkzeug im E-Paper Studio. Oben zwischen **Bildstudio** und **LED-Designer** wechseln. Zum Entwerfen und Simulieren wird weder ein Bild noch ein AP benötigt.

## Entwerfen

1. **Firmwareprofil** anhand der tatsächlich installierten Tag-Firmware wählen. Der AP-Typ oder die Displaygröße allein identifiziert die LED-Implementierung nicht zuverlässig.
2. **Kanalreihenfolge** wählen. Bei `GRB` treiben beispielsweise die Protokollkanäle R/G/B die physischen LED-Kanäle G/R/B. Die GUI zeigt weiterhin die gewünschte sichtbare Farbe und codiert die Vertauschung entsprechend. Zur Verfügung stehen RGB, RBG, GRB, GBR, BRG und BGR.
3. **Pulsstufe**, Gesamtdurchläufe und die drei Gruppen einstellen. Jede Gruppe besitzt Farbe, Impulsanzahl, Aus-Pause nach jedem Impuls und Aus-Pause nach der gesamten Gruppe. Die letzte Impulspause ist zusätzlich zur Gruppenpause enthalten.
4. Die Farbauswahl rastet auf die verfügbaren Stufen ein. Weil RGB332 zwei 3-Bit-Felder und ein 2-Bit-Feld besitzt, wandert der gröbere Farbbereich mit der eingestellten Kanalreihenfolge.
5. Eigene Vorlagen einschließlich Profil, Kanalfolge und Stromkalibrierung im Browser speichern oder als JSON herunterladen. JSON sowie reine 24-stellige Hex-Muster lassen sich importieren. Ein Import sendet nichts an ein Display. Zusätzliche Berechnungs- und Wire-Felder des JSON werden nicht als Befehle ausgeführt; das Werkzeug validiert das Design und erzeugt das Paket neu.

Das Protokoll erlaubt genau drei Gruppen. In den PWM-Profilen deaktiviert Impulsanzahl 0 eine Gruppe, deren Gruppenpause aber bestehen bleibt. Das EFR32-Profil zählt anders: mindestens ein Impuls pro Gruppe; eine RGB-Farbe Schwarz schaltet dabei die Farbkanäle nicht ein. Einfarbige LEDs, deren Firmware die Farbangabe ignoriert, sind mit diesem RGB-Profil nicht modelliert.

## Zeitstrahl und Simulation

Der Zeitstrahl zeigt einen Durchlauf über alle drei Gruppen. Die oberste Zeile trennt die Gruppen; darunter folgen LED, Rot, Grün und Blau. Die Kanalspuren zeigen die Hüllkurve mit gemittelter Intensität, nicht sämtliche 100-µs-PWM-Schaltvorgänge. Sehr kurze Impulse bleiben mindestens eine Bildschirmlinie breit. Die exakten Zahlen werden davon nicht verändert.

Der Zeitstrahl und der Positionsregler erlauben das direkte Anspringen einer Stelle. Abspielen, Pause und Zurück wirken nur im Browser. Bei wiederholten Sequenzen läuft der Abspielkopf über den gesamten Ablauf; der Zeitstrahl zeigt seine aktuelle Position innerhalb eines Durchlaufs.

- **Wahrnehmungsansicht:** Impulse werden für die Darstellung auf mindestens 60 ms verlängert. Dadurch bleiben sie auf einem üblichen Bildschirm sichtbar. Das ist eine ausdrücklich visuelle Annäherung; Dauer und Energie werden weiterhin mit den tatsächlichen Pulsen berechnet.
- **Zeitgetreu:** Reale nominelle Pulsfenster mit gemittelter PWM-Farbe. Submillisekunden-Pulse können zwischen Browserbildern liegen und dann unsichtbar bleiben.
- **PWM-Details:** Die einzelnen 100-µs-Schaltzeiten der PWM-Profile. Die GUI wählt zunächst 1000-fache Zeitlupe. Geschwindigkeit und Position bleiben frei einstellbar.

GPIO-Laufzeit, Betriebssystem-Ticks, Radiotermine und Unterbrechungen sind keine gemessenen Größen. Die Simulation beschreibt das unten dokumentierte Firmwaremodell; sie ist keine optische Messung der LED.

## Energie und tatsächliche Leuchtdauer

Die Anzeige unterscheidet:

- Pulsfenster: Zeit, in der die Blinkroutine den Puls erzeugt, einschließlich interner PWM-Aus-Zeiten.
- LED an: Vereinigung der Einschaltzeiten aller Kanäle; gleichzeitig leuchtende Kanäle werden hier nicht mehrfach gezählt.
- Rot/Grün/Blau an: Tatsächliche Einschaltzeit jedes physischen Kanals. Hier können die Summen wegen gleichzeitiger Farben die Gesamt-LED-An-Zeit übersteigen.
- Pro Farbe: Impulsanzahl, Pulsfenster, LED-An-Zeit und LED-Ladungsanteil. Mehrfach verwendete identische Farben werden zusammengefasst.

Unter „Strommodell kalibrieren“ lassen sich die Ströme der voll eingeschalteten physischen R/G/B-Kanäle und die Versorgungsspannung einstellen. Die Vorgabe 2 mA pro Kanal bei 3 V ist ausschließlich ein Rechenbeispiel. Ein optionaler Zusatzstrom wird während der gesamten Pulsfenster angesetzt; das kann beispielsweise CPU-Mehrverbrauch grob abbilden.

Die Rechnung lautet:

`LED-Ladung (mAh) = Summe(Kanalstrom in mA × tatsächliche Kanal-An-Zeit in ms) / 3.600.000`

`Zusatzladung (mAh) = Zusatzstrom in mA × gesamte Pulsfenster in ms / 3.600.000`

`Energie (mWh) = Gesamtladung (mAh) × Versorgungsspannung (V)`

Funk, Displayrefresh, Grund-/Schlafstrom, Reglerverluste und elektrochemische Batterieeffekte sind nicht enthalten. Die Werte sind keine Batterielaufzeitprognose. Bei endlosen Sequenzen sind Gesamtzeit und Gesamtenergie unbegrenzt; Tabellen und Zahlen beziehen sich dann auf einen Durchlauf. Zusätzlich wird die Modellladung pro Stunde fortlaufender Wiederholung angezeigt.

## Profile und bewusst berücksichtigte Unterschiede

Die Modelle beziehen sich auf die unten verlinkten Implementierungen, gelesen am 31. Oktober 2026. Abweichende Firmwareversionen, andere LED-Treiber und Einfarben-LEDs benötigen gegebenenfalls ein anderes Modell. Ein allgemeingültiges „ESP32-Verhalten“ gibt es nicht.

| Eigenschaft | OEPL nRF52811 Newton M3 | ESP32 / OpenDisplay Firmware | OEPL EFR32xG22 RGB |
|---|---|---|---|
| Farbkanäle | 8/8/4 PWM-Stufen in den Protokollfeldern | 8/8/4 PWM-Stufen | Pro Kanal nur aus/ein |
| Pulsfenster | `(Code + 1) × 0,7 ms` | `(Code + 1) × 0,7 ms` | `Code × 1 ms` |
| Eingestellte Puls-Codes | 0–15 | 0–15 | 1–15 |
| Impulse je Gruppe in der GUI | 0–15 | 0–15 | 1–16 |
| Pause je Impuls | 0–1500 ms, 100-ms-Raster | 0–1500 ms; bei 0 effektiv mindestens 1 ms | 100–1500 ms, 100-ms-Raster |
| Pause je Gruppe | 0–25500 ms, 100-ms-Raster | 0–25500 ms; nach letzter Gruppe bei 0 mindestens 1 ms | 100–25500 ms, 100-ms-Raster |
| Endliche Durchläufe | 1–254 | 1–254 | 1–256 |
| Endlos | Paketwert FE | Paketwert FE | Nicht vorhanden |
| Letzte Gruppenpause am Ende | Enthalten | Enthalten | Nach dem letzten Durchlauf ausgelassen |

Bei EFR32 setzt die GUI die Null-Timer bewusst nicht frei: Der geprüfte Code startet diese Timer direkt; eine verlässliche Fortsetzung ist mit einem Nullintervall nicht gewährleistet. Der EFR32-Impulszähler ist im Paket Anzahl minus eins. Die GUI zeigt die tatsächlich modellierte Impulsanzahl.

In den PWM-Profilen erzeugt jeder Helligkeitszyklus sieben Abschnitte à 100 µs. Rot und Grün sind gleichmäßig in 1/7-Schritten abgestuft. Das zweibittige Protokollfeld schaltet wegen seiner tatsächlichen Slotverteilung mit Tastgraden **0, 3/7, 5/7, 1**. Entsprechend verwendet die GUI dort die RGB-Werte 0, 109, 182 und 255. Es wird nicht fälschlich mit 0, 1/3, 2/3, 1 gerechnet.

Die allgemeine OEPL-Wiki-Beschreibung der Pulsdauer stimmt in einigen Randwerten nicht mit diesen Implementierungen überein. Für dieses Werkzeug ist der profilbezogene Quellcode maßgeblich. Insbesondere ist Code 15 in diesen PWM-Implementierungen ein Pulsfenster von 11,2 ms und wird nicht als pausenloses Dauerlicht simuliert. Bei nRF wird die Blinkroutine im Schlafpfad ausgeführt und kann bei kurzen Schlafintervallen oder anderen Ereignissen später beginnen bzw. unterbrochen werden. Das Modell zieht keine Folgerung über den tatsächlichen Empfangszeitpunkt.

## JSON und Versand zum AP

Das JSON verwendet das Format `img2vlw-led-v1`. Es enthält Gruppen, Profil, Kanalfolge, Pulsstufe, Durchläufe, Kalibrierung, ein berechnetes 12-Byte-Hex-Muster und die Energieabschätzung. Das Wire-Feld erklärt den AP-Aufruf, ist aber kein JSON-Bildtemplate.

Zum Testen AP-Adresse eingeben, Displays laden und ein Ziel auswählen. Displays mit ausdrücklich nicht gesetztem LED-Fähigkeitsbit werden nicht angeboten. Bei unbekannter Fähigkeit ist eine manuelle Auswahl möglich; eine MAC kann auch direkt eingegeben werden. Das passende Firmwareprofil und die tatsächliche Kanalverdrahtung müssen bewusst ausgewählt werden; diese Angaben werden nicht allein aus einem Displaynamen geraten.

Beim Klick auf „Sequenz am Display testen“ validiert der Designer das aktuelle Design erneut und sendet sein generiertes Muster über:

`GET /led_flash?mac=MAC&pattern=24_HEX_ZEICHEN`

Der AP stellt daraus den LED-Tagbefehl zusammen. Für OpenDisplay-Geräte leitet die geprüfte AP-Implementierung das Muster an die erste LED-Instanz weiter. `/jsonupload` ist hierfür ungeeignet: Dieser Endpunkt erzeugt Displaybilder aus JSON und würde den Bildmodus ändern.

„LED-Stopp senden“ sendet ein 12-Byte-Nullmuster. Dieser Befehl kann wie der Start erst beim nächsten Empfang wirken; nicht jede Firmware unterbricht einen laufenden Ablauf sofort. Die Meldung „vom AP angenommen“ ist keine optische Bestätigung. Das Werkzeug verändert mit diesen LED-Befehlen weder Bilddateien noch Bildmodus.

## Quellen

- [OEPL LED-Paketformat und allgemeine Beschreibung](https://github.com/OpenEPaperLink/OpenEPaperLink/wiki/Led-control)
- [OEPL AP-Endpunkt /led_flash](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/src/web.cpp)
- [OEPL nRF52811: flashled und ledflashlogic](https://github.com/OpenEPaperLink/Tag_FW_nRF52811/blob/main/tag_fw/hal/Newton_M3_nRF52811/HAL_Newton_M3.cpp)
- [OpenDisplay ESP32: flashLed und LED-Zustandsautomat](https://github.com/OpenDisplay/Firmware/blob/main/src/device_control.cpp)
- [OEPL EFR32: Timer, Schleifen und Wiederholungen](https://github.com/OpenEPaperLink/Tag_FW_EFR32xG22/blob/main/firmware/oepl_led.c)
- [OEPL EFR32: Kanal-Ansteuerung ohne PWM](https://github.com/OpenEPaperLink/Tag_FW_EFR32xG22/blob/main/firmware/oepl_hw_abstraction.c)
- [OEPL AP: OpenDisplay-LED-Weiterleitung](https://github.com/OpenEPaperLink/OpenEPaperLink/blob/master/ESP32_AP-Flasher/src/od_session.cpp)

Der Designer implementiert ein eigenes Rechenmodell; fremder Firmwarecode wird nicht mitverteilt. Die vorhandene GPL-3.0-Lizenz des Projekts bleibt bestehen.

# Aniimo Homeland Planer

Browserbasierter, unabhängiger Produktionsplaner. **Beta: Datenstand und Modellannahmen sind unvollständig; Ergebnisse im Spiel prüfen.**

## Nutzung

RV-Level wählen: Der Planer übernimmt die maximal verfügbaren Gebäude und deren höchste freigeschaltete Stufe. Unter „Gebäude anpassen“ lassen sich Anzahl und unterschiedliche Stufen korrigieren. Gekaufte Grundstücke, Module, Lagerbestand und Rezeptnotizen ergänzen. Ziele in der gewünschten Reihenfolge aktivieren und berechnen. Daten bleiben im Browser und lassen sich als JSON exportieren und importieren. Die Anwendung benötigt keine Anmeldung.

## Berechnung

HiGHS löst ein gemischt-ganzzahliges Modell: Rohstoffe, Zwischenprodukte und Bestände werden bilanziert; die Kapazität der Gebäude ist begrenzt. Felder und normale Produktionsstätten sind einem Rezept zugeordnet. Woodworking Bench und Chimney Kiln teilen ihre Zeit zwischen Rezepten. Ziele werden in Reihenfolge optimiert und vorher erreichte Werte erhalten. RV-Level-up maximiert den erreichbaren Anteil der Kosten im Zeitraum; es berechnet nicht die exakte Dauer.

Bei Magical Wonder Night werden Jelly Beans als begrenztes Saatgutbudget und Whimsy Points als eigenes Ziel behandelt. Shop-Rezepte müssen freigeschaltet werden. Einzelne Rezepte können bei fehlender Freischaltung deaktiviert werden. Die RV-Kosten 2–20 stammen aus Aniimax und lassen sich überschreiben.

Optional wählt der Solver E-Mode selbst. Für die Stromrechnung gelten 120 % Versorgung und ein gemeinsames Netz; die nötige Generatorzahl folgt aus der verwendeten Leistung. Der Planer nimmt passende Aniimo mit maximaler bekannter Arbeitsstufe und passendem Persönlichkeitsbonus an. Tatsächlich verfügbare Aniimo werden nicht geprüft.

Die Platzierung folgt der 4×4-Grundstücksreihenfolge und verteilt Produktionsgebäude heuristisch auf gekaufte Flächen. Generatoren und Poles werden mit einem Rasterverfahren verbunden; die angegebene Pole-Anzahl ist ein Vorschlag, kein nachgewiesenes Minimum. Die tatsächliche Platzierung und Stromversorgung im Spiel prüfen.

## Bekannte Grenzen

- Die 227 importierten Rezepte sind nicht vollständig. Spätere Gebäude, Rezepte und RV-Stufen fehlen möglicherweise. Keine vollständige Home-Index-Prüfung; gesperrte Rezepte müssen selbst deaktiviert werden.
- Passendes Klima wird angenommen, ohne Standort- oder Reichweitenprüfung. Wege, Wechselzeiten, Ernte- und Transportarbeit, Essen und Personalanzahl werden nicht simuliert.
- Lagerbestand wird über den Zeitraum verteilt; Startzeiten und ganze Chargen werden nicht simuliert.
- Eventpunkte für Möbel, Aufträge, Mutationen und sonstige Quellen fehlen. Eventdaten und Preise im Spiel überprüfen.
- Lager, Klimageräte, Wege und Hindernisse werden im Layout nicht platziert. Klimareichweiten werden nicht geprüft; elektrische Reichweiten beruhen auf einem vereinfachten Raster. Nicht platzierte Gebäude und ein unvollständiges Netz werden angezeigt.
- Verfügbare Aniimo, Persönlichkeiten und arbeitende Spezialarten werden nicht automatisch erkannt oder verteilt. Die Annahme maximaler Arbeitsfähigkeiten kann für ein konkretes Homeland zu optimistisch sein.
- Bei Erreichen des Zeitlimits wird keine Optimalität behauptet.

## Daten und Quellen

CSV-Daten stammen aus dem lokalen Aniimax-Zweig `pr/49` (Kopie 2026-11-09); der öffentliche Hauptzweig stand beim Vergleich auf Commit `887b54c6687a953a86ab3d7b00fba1a44fe4a4f9`. Eventdaten aus dem lokalen Zweig sind nicht unabhängig vollständig geprüft. [Aniimax](https://github.com/ae-bii/aniimax) ist MIT-lizenziert; der Lizenztext liegt unter `data/ANIIMAX-LICENSE`.

Referenzen: [Arbeitsmechanik](https://aniimotools.dev/systems/homeland/aniimo-at-work/), [Pflanzen und Gebäude](https://aniimotools.dev/systems/homeland/crops-and-facilities/), [RV-Level](https://aniimotools.dev/systems/homeland/rv-levels/), [Home Index](https://aniimotools.dev/systems/homeland/home-index/), [Home Season](https://aniimotools.dev/systems/homeland/home-season/) und [Produktionssimulator](https://aniimotools.dev/systems/homeland/production-simulator/). Quellenwerte können abweichen.

Strombedarf, E-Mode und Generatorwerte: [MOANIIMO E-Mode Guide](https://aniimo.kr/en/systems/camper-home-electric-mode-guide); Plot-Reihenfolge und Reichweiten wurden mit [Aniiland Floor Layout](https://aniiland.wintira.win/homeland/floor-layout/) abgeglichen.

Der Optimierer nutzt [HiGHS](https://highs.dev/) über WebAssembly; dessen MIT-Lizenz liegt unter `vendor/highs/LICENSE`.

## Lokal starten und prüfen

```sh
python tools/catalog.py
python -m unittest discover -s tests -v
npm test
python -m http.server 8080
```

Anschließend `http://localhost:8080/` öffnen. `file://` wird nicht unterstützt.

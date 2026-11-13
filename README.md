# Aniimo Homeland Planer

Browserbasierter, unabhängiger Produktionsplaner. **Beta: Datenstand und Modellannahmen sind unvollständig; Ergebnisse im Spiel prüfen.**

## Nutzung

RV-Level wählen: Der Planer übernimmt die maximal verfügbaren Gebäude und deren höchste freigeschaltete Stufe. Unter „Gebäude anpassen“ lassen sich Anzahl und unterschiedliche Stufen korrigieren. Gekaufte Grundstücke, Module, Lagerbestand und Rezeptnotizen ergänzen. Ziele in der gewünschten Reihenfolge aktivieren und berechnen. Daten bleiben im Browser und lassen sich als Link oder Code teilen. Ältere JSON-Dateien lassen sich weiterhin importieren. Geteilte Links enthalten die eingegebenen Planungsdaten im URL-Fragment; ein Server ist nicht nötig. Die Anwendung benötigt keine Anmeldung.

Bei der Wahl eines RV-Levels werden die Zielwerte für das nächste Upgrade eingetragen. Sie können weiterhin geändert werden. Bei neuen Einstellungen sind RV-Level-up und Home Coins aktiv; vorhandene Prioritäten importierter Pläne bleiben erhalten. Die Rezeptansicht zeigt bekannte Kauf- und Eventrezepte. Gekaufte Rezeptnotizen müssen aktiviert werden; einzelne Rezepte lassen sich unter „Rezepte ignorieren“ ausschließen. Neu ergänzte Rezeptnotizen sind bei älteren Exporten zunächst nicht als gekauft markiert.

Ein Teilen-Link enthält neben den Einstellungen das zuletzt berechnete Ergebnis und seine sichtbaren Positionen. Beim Laden erscheint dieser Stand ohne erneute Berechnung. Änderungen an den Eingaben werden gekennzeichnet. Bei erneuter Berechnung versucht der Planer, Produktionsgebäude auf ihren bisherigen Positionen zu belassen, sofern Platzierung, Klima und Strom dadurch nicht schlechter werden. Klimageräte, Strommasten, Generatoren und Lager können sich dabei verschieben. Alte Links ohne Ergebnis bleiben importierbar.

## Berechnung

HiGHS löst ein gemischt-ganzzahliges Modell: Rohstoffe, Zwischenprodukte und Bestände werden bilanziert; die Kapazität der Gebäude ist begrenzt. Jedes Gebäude ist einem Rezept zugeordnet, einschließlich Woodworking Bench und Chimney Kiln. Verfügbare schnelle Varianten werden bevorzugt; wenn sie gesperrt oder deaktiviert sind, bleibt das normale Rezept verfügbar. Bei Arbeitsstufe 1 kann normale Wolle mehr Ertrag pro Stunde liefern als Quick Wool. Ziele werden in Reihenfolge optimiert und vorher erreichte Werte erhalten. Ist RV-Level-up aktiv, verlängert der Planer den Zeitraum automatisch, bis der berechnete Plan das Ziel erreicht oder eine Berechnungsgrenze erreicht wird. Die angezeigte Dauer ist eine Schätzung, kein nachgewiesenes schnellstes Upgrade.

Das verschiebbare Ziel „RV-Vorrat“ addiert die Materialkosten aller Upgrades bis zum gewählten RV-Level und berücksichtigt den vorhandenen Bestand. Der Zielwert ist der durchschnittliche erreichte Anteil über alle benötigten Materialarten. Die Produktion verwendet Gebäude, Module und Personal des aktuellen RV-Levels; künftige Freischaltungen und die tatsächlichen Upgrade-Zeitpunkte werden nicht simuliert. Steht das Ziel nach Home Coins, darf der einstellbare Coin-Verzicht eingesetzt werden. Event- und Vorratstoleranz beziehen sich auf denselben maximalen Coin-Ertrag und werden nicht addiert. Nach Erreichen der übrigen Ziele optimiert der Plan die verbleibenden Home Coins erneut, bevor er die Zahl der Arbeitskräfte minimiert.

Bei Magical Wonder Night werden Jelly Beans als Saatgutbudget und Whimsy Points als eigenes Ziel behandelt. Jede ausgewählte tägliche Aufgabe liefert im Modell durchschnittlich 200 Jelly Beans pro Tag; Anfangsbestand und tatsächlicher Zeitpunkt der Belohnungen sind nicht bekannt. Frühere Eingaben für einmalige Belohnungen und Anfangsbestand bleiben im Export erhalten, werden in dieser vereinfachten Ansicht aber nicht für die Berechnung verwendet. Shop-Rezepte müssen freigeschaltet werden. Einzelne Rezepte können bei fehlender Freischaltung deaktiviert werden. Die RV-Kosten 2–20 stammen aus Aniimax und lassen sich überschreiben.

Nur aktivierte Ziele werden in ihrer eingestellten Reihenfolge optimiert. Bei älteren Importen werden fehlende optionale Ziele ausgeschaltet ergänzt. Pflanzen können mit zwei Bewässerungen (75 % der Grundzeit) oder ohne Bewässerung berechnet werden; dafür wird gegebenenfalls eine Wasserfähigkeit vorausgesetzt.

Optional wählt der Solver E-Mode selbst. Für die Stromrechnung gelten die eingestellte Versorgung (bis 120 %) und ein gemeinsames Netz; die nötige Generatorzahl folgt aus der verwendeten Leistung. Der Planer nimmt passende Persönlichkeiten an. Ohne Eingaben verwendet er Arbeitsstufe 3; eingetragene Mengen pro Fähigkeit und Stufe begrenzen die Anzahl belegter Produktionsgebäude. Jedes manuell betriebene Gebäude benötigt ein eigenes Aniimo. Feldarbeiten, Transport, Klimageräte und Generatoren sind in diesen Personalgrenzen nicht vollständig erfasst.

„Strom oder Aniimo?“ vergleicht die gewählte Stromversorgung mit der schnellsten eingetragenen passenden Aniimo-Stufe; ohne Eingaben gilt Stufe 3. Das ist ein Zeitvergleich pro Vorgang. Der gesamte Optimierungsplan berücksichtigt außerdem begrenzte Aniimo, Strom und Materialien und kann deshalb eine langsamere Betriebsart wählen. Aniipod Maker und Dance Pad Polisher haben keinen Persönlichkeitsbonus und verwenden ihre eigene Arbeitsstufenformel. Bei den verglichenen Rezepten wurden die Arbeitsstufen für Laminated Beams, Densified Timber Component, Refined Ore und Microcrystalline Ore Plate auf 3 sowie für Moondew Radish Slices, Umbral Hot Pot und Umbral Pickle auf 2 korrigiert.

Bei dichtem Aufbau kann die Stromplatzierung einzelne Gebäude ohne Klimaanforderung verschieben, um Platz für verbundene Poles zu schaffen. Das Netz wird danach erneut auf Versorgung geprüft. Die Platzierung folgt der 4×4-Grundstücksreihenfolge und verteilt benötigte Produktionsgebäude heuristisch auf gekaufte Flächen. Lager werden bis zur RV-Grenze verteilt; ihre Positionen minimieren näherungsweise gewichtete Luftlinien zu Produktionsstätten. Klimageräte, Generatoren und Poles werden näherungsweise ergänzt. Lagergrenzen: [Aniimo Camp](https://aniimocamp.com/). Jede platzierte Holzbank und jeder Ofen zeigt genau ein Rezept. Die angegebene Pole-Anzahl ist ein Vorschlag, kein nachgewiesenes globales Minimum. Das Aniimo-Limit umfasst im Modell ein Aniimo je manuell betriebenem Produktionsgebäude, Generatoren sowie mindestens je ein Aniimo für Transport und jede genutzte Feldfähigkeit. Klimapersonal wird je Gerät reserviert; der Planer gleicht die benötigte Zahl iterativ mit der Platzierung ab. Bei nicht abgeschlossener Abstimmung wird gewarnt. Gebäudebilder werden von [Aniimo Wiki / GameVault](https://aniimo.gamevault.in/en/homeland/furniture/) geladen; die Spielgrafiken gehören ihren Rechteinhabern.

## Bekannte Grenzen

- Der Katalog enthält 262 Rezepte, einschließlich Pearl Powder, Star Diamond und Pearl Face Cream. Der Datenbestand ist nicht vollständig. Aniidex zählt in seiner Kategorie „Home Materials“ auch Samen, Pflanzenvarianten, Baupläne und andere Gegenstände; diese Zahl ist daher keine Rezeptanzahl. Keine vollständige Home-Index-Prüfung; gesperrte Rezepte müssen selbst deaktiviert werden.
- Eventrezepte aus Harvest Moon sind im Datenbestand verzeichnet, werden jedoch derzeit vom Optimierer nicht freigeschaltet. Deren Eventwährung und Verfügbarkeit werden nicht mit Magical Wonder Night gleichgesetzt.
- Passendes Klima wird angenommen, ohne Standort- oder Reichweitenprüfung. Wege, Wechselzeiten, Ernte- und Transportarbeit, Essen und Personalanzahl werden nicht simuliert.
- Lagerbestand wird über den Zeitraum verteilt; Startzeiten und ganze Chargen werden nicht simuliert.
- Eventpunkte für Möbel, Aufträge, Mutationen und sonstige Quellen fehlen. Eventdaten und Preise im Spiel überprüfen.
- Klima- und Stromreichweiten beruhen auf einem vereinfachten Raster. Wege, Hindernisse und bereits vorhandene Möbel werden nicht geprüft. Nicht platzierte Gebäude sowie unvollständige Klima- und Stromversorgung werden angezeigt. Wenn sie auftreten, ist die errechnete Produktionsrate für das gezeigte Layout nicht abgesichert.
- Fähigkeiten und Stufen begrenzen die Produktionsarbeit. Für Spezialgebäude gelten Familienbindungen. Optional eingegebene Familienzahlen begrenzen die gleichzeitig belegten Gebäude. Die einzelnen Aniimo, ihre Familienstufen, Mehrfachfähigkeiten und Persönlichkeiten werden nicht individuell zugeordnet.
- Bei Erreichen des Zeitlimits wird keine Optimalität behauptet. Der Optimierer wird zwischen Klimarunden wiederverwendet; identische Auftragsziele werden nicht erneut gelöst. Vorläufige Lösungen, die bereits eine Klimanachrechnung benötigen, überspringen die Personal-Feinoptimierung bis zur letzten Runde.

## Daten und Quellen

CSV-Daten stammen aus dem lokalen Aniimax-Zweig `pr/49` (Kopie 2026-11-09); der öffentliche Hauptzweig stand beim Vergleich auf Commit `887b54c6687a953a86ab3d7b00fba1a44fe4a4f9`. Eventdaten aus dem lokalen Zweig sind nicht unabhängig vollständig geprüft. [Aniimax](https://github.com/ae-bii/aniimax) ist MIT-lizenziert; der Lizenztext liegt unter `data/ANIIMAX-LICENSE`.

RV-21/22-Rezeptdaten, Zutaten, Freischaltungen und Klima: [AniimoTools Rezepte](https://aniimotools.dev/systems/recipes/) und [RV-Level](https://aniimotools.dev/systems/homeland/rv-levels/). Verkaufspreise und Fähigkeiten: [AniimoGuide Gebäudeseiten](https://aniimoguide.com/homeland/facilities); Quick-Rezepte und deren Erträge: [AniimoGuide Gebäudeseiten](https://aniimoguide.com/homeland/facilities), [AniimoTools Rezepte](https://aniimotools.dev/systems/recipes/) und [RV-Level](https://aniimotools.dev/systems/homeland/rv-levels/). Saatgutpreise: [Beskor Home Coin Shop](https://www.aniimo.gg/shop/home-coin/).

Weitere vom Nutzer genannte Quelle: [Aniidex Home Materials](https://aniidex.com/items/home-materials/). Die Daten konnten bei diesem Abgleich nicht eingesehen werden.

Referenzen: [Arbeitsmechanik](https://aniimotools.dev/systems/homeland/aniimo-at-work/), [Pflanzen und Gebäude](https://aniimotools.dev/systems/homeland/crops-and-facilities/), [RV-Level](https://aniimotools.dev/systems/homeland/rv-levels/), [Home Index](https://aniimotools.dev/systems/homeland/home-index/), [Home Season](https://aniimotools.dev/systems/homeland/home-season/) und [Produktionssimulator](https://aniimotools.dev/systems/homeland/production-simulator/). Der zuvor als ungeprüft markierte Star aus dem Starfall Hammock wurde mit AniimoTools und AniimoGuide abgeglichen. Quellenwerte können abweichen. Quick Agave: 40 Minuten und Ertrag 10 wurden vom Spieler im Spiel bestätigt; AniimoGuide nennt eine abweichende Grundzeit.

Strombedarf, E-Mode und Generatorwerte: [MOANIIMO E-Mode Guide](https://aniimo.kr/en/systems/camper-home-electric-mode-guide); Plot-Reihenfolge und Reichweiten wurden mit [Aniiland Floor Layout](https://aniiland.wintira.win/homeland/floor-layout/) abgeglichen.

Die Fähigkeitssymbole in `assets/abilities` stammen von [AniimoTools](https://aniimotools.dev/systems/homeland/aniimo-at-work/). Aniimo-Beispiele und deren Porträts stammen von [AniimoGuide](https://aniimoguide.com/homeland/workers); sie beschreiben keine tatsächlich besessenen Aniimo. Spielgrafiken gehören ihren jeweiligen Rechteinhabern.

Der Optimierer nutzt [HiGHS](https://highs.dev/) über WebAssembly; dessen MIT-Lizenz liegt unter `vendor/highs/LICENSE`.

## Lokal starten und prüfen

```sh
python tools/catalog.py
python -m unittest discover -s tests -v
npm test
python -m http.server 8080
```

Anschließend `http://localhost:8080/` öffnen. `file://` wird nicht unterstützt. GitHub Pages veröffentlicht erst nach erfolgreicher Katalogprüfung und bestandenen Python- und JavaScript-Tests; die Browserprüfung erfolgt separat.

Die geschätzte RV-Fertigstellungszeit des angezeigten Plans verwendet durchschnittliche Raten; Startverzögerungen, tägliche Reset-Zeiten und vollständige Chargen sind nicht simuliert. Die laufenden Jelly-Bean-Belohnungen werden gleichmäßig über die Zeit verteilt angenommen und sind nicht minutengenau verfügbar.

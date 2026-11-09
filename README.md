# Aniimo Homeland Planer

Browserbasierter, unabhängiger Produktionsplaner. **Beta: Datenstand und Modellannahmen sind unvollständig; Ergebnisse im Spiel prüfen.**

## Nutzung

RV-Level wählen: Der Planer übernimmt die maximal verfügbaren Gebäude und deren höchste freigeschaltete Stufe. Unter „Gebäude anpassen“ lassen sich Anzahl und unterschiedliche Stufen korrigieren. Gekaufte Grundstücke, Module, Lagerbestand und Rezeptnotizen ergänzen. Ziele in der gewünschten Reihenfolge aktivieren und berechnen. Daten bleiben im Browser und lassen sich als JSON exportieren und importieren. Die Anwendung benötigt keine Anmeldung.

## Berechnung

HiGHS löst ein gemischt-ganzzahliges Modell: Rohstoffe, Zwischenprodukte und Bestände werden bilanziert; die Kapazität der Gebäude ist begrenzt. Jedes Gebäude ist einem Rezept zugeordnet, einschließlich Woodworking Bench und Chimney Kiln. Ziele werden in Reihenfolge optimiert und vorher erreichte Werte erhalten. RV-Level-up maximiert den erreichbaren Anteil der Kosten im Zeitraum; es berechnet nicht die exakte Dauer.

Bei Magical Wonder Night werden Jelly Beans als begrenztes Saatgutbudget und Whimsy Points als eigenes Ziel behandelt. Vier bereits erhaltene Wonder-Daily-Belohnungen lassen sich einmalig zu je 200 Jelly Beans ergänzen, falls sie noch nicht im Vorrat enthalten sind. Shop-Rezepte müssen freigeschaltet werden. Einzelne Rezepte können bei fehlender Freischaltung deaktiviert werden. Die RV-Kosten 2–20 stammen aus Aniimax und lassen sich überschreiben.

Optional wählt der Solver E-Mode selbst. Für die Stromrechnung gelten die eingestellte Versorgung (bis 120 %) und ein gemeinsames Netz; die nötige Generatorzahl folgt aus der verwendeten Leistung. Der Planer nimmt passende Persönlichkeiten an. Ohne Eingaben verwendet er Arbeitsstufe 3; eingetragene Mengen pro Fähigkeit und Stufe begrenzen die berechnete Produktionsarbeit. Feldarbeiten, Transport, Klimageräte und Generatoren sind in diesen Personalgrenzen nicht vollständig erfasst.

Die Platzierung folgt der 4×4-Grundstücksreihenfolge und verteilt benötigte Produktionsgebäude heuristisch auf gekaufte Flächen. Lager werden bis zur RV-Grenze verteilt; ihre Positionen minimieren näherungsweise gewichtete Luftlinien zu Produktionsstätten. Klimageräte, Generatoren und Poles werden näherungsweise ergänzt. Lagergrenzen: [Aniimo Camp](https://aniimocamp.com/). Jede platzierte Holzbank und jeder Ofen zeigt genau ein Rezept. Die angegebene Pole-Anzahl ist ein Vorschlag, kein nachgewiesenes globales Minimum. Das Aniimo-Limit umfasst im Modell die geschätzte Produktionsarbeit, Generatoren sowie mindestens je ein Aniimo für Transport und jede genutzte Feldfähigkeit. Klimapersonal wird je Gerät reserviert; der Planer gleicht die benötigte Zahl iterativ mit der Platzierung ab. Bei nicht abgeschlossener Abstimmung wird gewarnt. Gebäudebilder werden von [Aniimo Wiki / GameVault](https://aniimo.gamevault.in/en/homeland/furniture/) geladen; die Spielgrafiken gehören ihren Rechteinhabern.

## Bekannte Grenzen

- Die 227 importierten Rezepte sind nicht vollständig. Insbesondere Rezepte für RV 21 und 22 fehlen; ihre Gebäudegrenzen, Gebäudelevel und Upgrade-Kosten sind ergänzt. Keine vollständige Home-Index-Prüfung; gesperrte Rezepte müssen selbst deaktiviert werden.
- Passendes Klima wird angenommen, ohne Standort- oder Reichweitenprüfung. Wege, Wechselzeiten, Ernte- und Transportarbeit, Essen und Personalanzahl werden nicht simuliert.
- Lagerbestand wird über den Zeitraum verteilt; Startzeiten und ganze Chargen werden nicht simuliert.
- Eventpunkte für Möbel, Aufträge, Mutationen und sonstige Quellen fehlen. Eventdaten und Preise im Spiel überprüfen.
- Klima- und Stromreichweiten beruhen auf einem vereinfachten Raster. Wege, Hindernisse und bereits vorhandene Möbel werden nicht geprüft. Nicht platzierte Gebäude sowie unvollständige Klima- und Stromversorgung werden angezeigt. Wenn sie auftreten, ist die errechnete Produktionsrate für das gezeigte Layout nicht abgesichert.
- Fähigkeiten und Stufen begrenzen die Produktionsarbeit. Dieselben Aniimo mit mehreren Fähigkeiten, die genaue Persönlichkeitsverteilung und Familienbindungen werden nicht individuell verfolgt.
- Bei Erreichen des Zeitlimits wird keine Optimalität behauptet.

## Daten und Quellen

CSV-Daten stammen aus dem lokalen Aniimax-Zweig `pr/49` (Kopie 2026-11-09); der öffentliche Hauptzweig stand beim Vergleich auf Commit `887b54c6687a953a86ab3d7b00fba1a44fe4a4f9`. Eventdaten aus dem lokalen Zweig sind nicht unabhängig vollständig geprüft. [Aniimax](https://github.com/ae-bii/aniimax) ist MIT-lizenziert; der Lizenztext liegt unter `data/ANIIMAX-LICENSE`.

Referenzen: [Arbeitsmechanik](https://aniimotools.dev/systems/homeland/aniimo-at-work/), [Pflanzen und Gebäude](https://aniimotools.dev/systems/homeland/crops-and-facilities/), [RV-Level](https://aniimotools.dev/systems/homeland/rv-levels/), [Home Index](https://aniimotools.dev/systems/homeland/home-index/), [Home Season](https://aniimotools.dev/systems/homeland/home-season/) und [Produktionssimulator](https://aniimotools.dev/systems/homeland/production-simulator/). Quellenwerte können abweichen.

Strombedarf, E-Mode und Generatorwerte: [MOANIIMO E-Mode Guide](https://aniimo.kr/en/systems/camper-home-electric-mode-guide); Plot-Reihenfolge und Reichweiten wurden mit [Aniiland Floor Layout](https://aniiland.wintira.win/homeland/floor-layout/) abgeglichen.

Die Fähigkeitssymbole in `assets/abilities` stammen von [AniimoTools](https://aniimotools.dev/systems/homeland/aniimo-at-work/); Spielgrafiken gehören ihren jeweiligen Rechteinhabern.

Der Optimierer nutzt [HiGHS](https://highs.dev/) über WebAssembly; dessen MIT-Lizenz liegt unter `vendor/highs/LICENSE`.

## Lokal starten und prüfen

```sh
python tools/catalog.py
python -m unittest discover -s tests -v
npm test
python -m http.server 8080
```

Anschließend `http://localhost:8080/` öffnen. `file://` wird nicht unterstützt.

Die geschätzte RV-Fertigstellungszeit verwendet durchschnittliche Raten; Startverzögerungen, tägliche Reset-Zeiten und vollständige Chargen sind nicht simuliert. Geplante tägliche Jelly-Bean-Belohnungen werden im Modell vorab verfügbar angenommen.

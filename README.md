# KD·2016 — 10 Jahre Wiedersehen

Website für das Alumni-Treffen des Jahrgangs 2016, Kommunikationsdesign,
Hochschule Niederrhein (Krefeld). Alumni tragen ein, wo sie heute leben; aus
allen Punkten wird der geografische **Mittelpunkt** berechnet und als
Passermarke auf einer Weltkarte gezeigt.

## Aufbau — nur drei Dateien

```
index.html   Komplette Seite: HTML, CSS und JavaScript sind eingebettet,
             alle Grafiken (Logo, Poster, Passermarke) als Inline-SVG.
data.json    Gemeinsame Einträge: pins / guestbook / rsvp
README.md    Diese Datei
```

Alles steckt in `index.html`. Es gibt bewusst **keine** separaten CSS-, JS- oder
Bilddateien mehr — so kann beim Hochladen nichts „verloren gehen" oder einen
falschen Pfad bekommen. Das einzige, was von außen geladen wird, ist die
Kartenbibliothek Leaflet (per CDN) und die Kartenkacheln.

## Was du anpassen kannst

Alles direkt in `index.html`:

- **Datum/Uhrzeit:** im `<script>`-Teil die Zeile
  `var EVENT_DATE = new Date(2027, 3, 10, 18, 0, 0);`
  (Monat ist 0-basiert: `3` = April.)
- **Orga-E-Mail:** Zeile `var ORGA_EMAIL = "orga@kd2016.example";`
  (und die Adresse im Footer-Text).
- **Texte, Programm, Ort:** im HTML-Teil.
- **Farben/Schriften:** im `<style>`-Teil ganz oben im `:root`-Block.

Die Einträge selbst stehen in `data.json`.

## So funktioniert das Speichern (ohne Server)

GitHub Pages liefert nur statische Dateien aus und kann keine Einträge von
Besuchern annehmen. Deshalb:

1. Die Seite liest beim Laden `data.json` — alle sehen dieselben Einträge.
2. Trägt jemand etwas ein, erscheint es sofort in seiner Ansicht, und er
   bekommt einen fertigen Text-Schnipsel zum Kopieren oder per E-Mail an dich.
3. Du fügst neue Einträge in `data.json` ein und committest. Danach sehen alle
   den Eintrag.

Neue Zeile ans passende Array in `data.json` hängen (auf Kommas achten):

```json
"pins": [
  { "name": "Sara", "city": "Wien", "lat": 48.2082, "lng": 16.3738 }
]
```

## Lokal ansehen

Nicht per Doppelklick öffnen (dann blockiert der Browser `data.json`), sondern
über einen kleinen Server:

```bash
cd alumni-kd-2016
python3 -m http.server 8000
# Browser: http://localhost:8000
```

## Auf GitHub Pages veröffentlichen

1. `index.html` und `data.json` ins Repo laden (am besten direkt ins
   Wurzelverzeichnis, neben die `LICENSE`).
2. **Settings → Pages → Source:** „Deploy from a branch", Branch `main`,
   Ordner `/ (root)` → Save. (Liegt alles in einem Unterordner, den Ordner
   `docs` nennen und dort auf `/docs` stellen.)
3. Nach 1–2 Minuten erscheint `https://deinname.github.io/repo/`.

**Wichtig:** iOS/Safari cached hartnäckig. Nach jedem Update die Seite einmal
mit geleertem Cache neu laden, sonst siehst du die alte Version.

## Technik

- Karte: Leaflet + CARTO-Kacheln; Geocoding über OpenStreetMap Nominatim.
- Mittelpunkt: sphärischer Schwerpunkt (3D-Vektormittel), auch über den
  180°-Meridian korrekt.
- Fällt Leaflet oder eine Kachel-Quelle aus, bleibt die restliche Seite voll
  funktionsfähig; Pins und Mittelpunkt erscheinen auf dunklem Grund.

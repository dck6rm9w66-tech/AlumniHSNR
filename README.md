# KD·2016 — 10 Jahre Wiedersehen

Website für das Alumni-Treffen des Jahrgangs 2016, Kommunikationsdesign,
Hochschule Niederrhein (Krefeld). Alumni tragen ein, wo sie heute leben; aus
allen Punkten wird der geografische **Mittelpunkt** berechnet und als
Passermarke auf einer Weltkarte gezeigt.

Diese Version kommt **ohne Firebase** aus: Alle Einträge liegen als Textdatei
`data.json` direkt im GitHub-Projekt.

## Dateien

```
index.html      Seitenstruktur
styles.css      Design-System (liegt neben index.html)
data.json       Gemeinsame Einträge: pins / guestbook / rsvp
js/app.js       Karte, Mittelpunkt, Countdown, Übergabe-Dialog
assets/         Logo, Passermarke (Favicon), Riso-Poster
```

## So funktioniert das Speichern

GitHub Pages liefert nur statische Dateien aus und kann keine Einträge von
Besuchern entgegennehmen. Deshalb:

1. Die Seite **liest** beim Laden `data.json` — alle sehen dieselben Einträge.
2. Trägt jemand etwas ein, erscheint es sofort in **seiner** Ansicht und er
   bekommt einen fertigen JSON-Schnipsel — zum **Kopieren** oder **per E-Mail**
   an die Orga.
3. Das Orga-Team fügt neue Einträge in `data.json` ein und committet. Danach
   sehen **alle** den Eintrag.

Kurz: Die Karte ist kuratiert. Für ein Jahrgangstreffen ist das meist ideal
(kein Spam), kostet nichts und braucht keinen zusätzlichen Dienst.

### Eintrag aufnehmen

Neue Zeile ans passende Array in `data.json` hängen (auf Kommas achten):

```json
"pins": [
  { "name": "Sara", "city": "Wien", "lat": 48.2082, "lng": 16.3738 }
]
```

E-Mail-Adresse der Orga ändern: Konstante `ORGA_EMAIL` oben in `js/app.js`
(und die Adresse im Footer der `index.html`).

## Lokal ansehen

Nicht per Doppelklick öffnen (dann blockiert der Browser `data.json`), sondern
über einen kleinen Server:

```bash
cd alumni-kd-2016
python3 -m http.server 8000
# Browser: http://localhost:8000
```

## Auf GitHub Pages veröffentlichen

1. Repo auf github.com anlegen.
2. Dateien so hochladen, dass `index.html`, `styles.css`, `data.json` sowie die
   Ordner `js/` und `assets/` **direkt im Wurzelverzeichnis** liegen.
3. **Settings → Pages → Source:** „Deploy from a branch", Branch `main`,
   Ordner `/ (root)` → Save. (Liegt alles in einem Unterordner, den Ordner
   stattdessen `docs` nennen und dort auf `/docs` stellen.)
4. Nach 1–2 Minuten erscheint die Adresse `https://deinname.github.io/repo/`.

## Anpassen

- **Datum/Uhrzeit:** `EVENT_DATE` in `js/app.js`.
- **Orga-E-Mail:** `ORGA_EMAIL` in `js/app.js` + Footer in `index.html`.
- **Farben/Schriften:** Tokens im `:root`-Block oben in `styles.css`.
- **Starteinträge:** direkt in `data.json`.

## Technik

- Karte: Leaflet + CARTO-Kacheln; Geocoding über OpenStreetMap Nominatim.
- Mittelpunkt: sphärischer Schwerpunkt (3D-Vektormittel), auch über den
  180°-Meridian korrekt.
- Barrierearm: sichtbarer Tastaturfokus, Dialog per Esc schließbar,
  `prefers-reduced-motion` respektiert.

## Optionaler Ausbau (self-service ohne Orga-Schritt)

Wer möchte, dass Einträge vollautomatisch landen, kann später GitHub Issues +
eine GitHub-Action nutzen (Besucher öffnet ein vorbefülltes Issue, die Action
schreibt es nach `data.json`). Das braucht allerdings ein GitHub-Login der
Besucher — sag Bescheid, dann liefere ich die Workflow-Datei dazu.

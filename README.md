# KD·2016 — 10 Jahre Wiedersehen

Website für das Alumni-Treffen des Jahrgangs 2016, Kommunikationsdesign,
Hochschule Niederrhein (Krefeld). Alumni tragen ein, wo sie heute leben; aus
allen Punkten wird live der **geografische Mittelpunkt** berechnet und als
Passermarke auf einer Weltkarte gezeigt. Keine Anmeldung nötig, Anbindung an
Google Firebase.

## Dateien

```
index.html            Seitenstruktur
css/styles.css        Design-System (Druckvorstufe / Riso)
js/app.js             Karte, Mittelpunkt, Countdown, Gästebuch, Zusagen
js/firebase-config.js  → hier deine Firebase-Zugangsdaten eintragen
assets/               Logo, Passermarke (Favicon), Riso-Poster
```

## Schnellstart (lokal ansehen)

Wegen der Karten- und Firebase-Einbindung nicht per Doppelklick öffnen,
sondern über einen kleinen Server:

```bash
cd alumni-kd-2016
python3 -m http.server 8000
# dann im Browser: http://localhost:8000
```

Ohne Firebase-Konfiguration läuft alles im **Demo-Modus**: voll bedienbar,
aber ohne dauerhafte Speicherung. Ein Hinweisband weist darauf hin.

## Mit Firebase verbinden (dauerhaft speichern & für alle synchron)

1. Projekt anlegen auf <https://console.firebase.google.com> (kostenlos).
2. Web-App hinzufügen (`</>`) und das angezeigte `firebaseConfig` kopieren.
3. Werte in `js/firebase-config.js` eintragen.
4. Im Menü **Realtime Database** aktivieren (Region z. B. `europe-west1`).
5. Testregeln (offen — nur zum Ausprobieren):
   ```json
   { "rules": { ".read": true, ".write": true } }
   ```
   Für den echten Betrieb einschränken, z. B. Schreibrate begrenzen und
   Feldlängen validieren.

Sobald ein gültiger `apiKey` hinterlegt ist, wechselt die Seite automatisch
vom Demo- in den Live-Modus. Daten liegen unter den Knoten `pins`,
`guestbook` und `rsvp`.

## Veröffentlichen

Rein statische Seite — funktioniert auf jedem Webhosting. Besonders einfach:

- **Firebase Hosting:** `firebase init hosting` → `firebase deploy`
- **Netlify / Vercel / GitHub Pages:** Ordner hochladen bzw. Repo verbinden.

## Anpassen

- **Datum/Uhrzeit:** `EVENT_DATE` in `js/app.js`.
- **Ort:** Abschnitt „Ort & Anreise" in `index.html` und die Kartendaten.
- **Farben/Schriften:** die Tokens ganz oben in `css/styles.css` (`:root`).
- **Beispiel-Alumni (Demo):** `SEED_PINS` in `js/app.js`.

## Technik

- Karte: [Leaflet](https://leafletjs.com) + CARTO-Kacheln, Geocoding über
  OpenStreetMap **Nominatim** (bitte deren Nutzungsrichtlinien beachten;
  für großen Andrang eigenen Geocoder erwägen).
- Mittelpunkt: sphärischer Schwerpunkt (3D-Vektormittel), damit er auch über
  den 180°-Meridian hinweg korrekt liegt.
- Barrierearm: Tastaturfokus sichtbar, `prefers-reduced-motion` respektiert.

## Hinweis

Ort, Datum und Kontaktadresse sind Platzhalter des Orga-Teams und sollten vor
Veröffentlichung angepasst werden.

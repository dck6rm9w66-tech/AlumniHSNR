# KD·2016 — 10 Jahre Wiedersehen

Website für das Alumni-Treffen des Jahrgangs 2016, Kommunikationsdesign,
Hochschule Niederrhein (Krefeld).

- Alumni melden sich mit ihrer **E-Mail** an (Login-Link, kein Passwort).
- Sie tragen ein: **Wohnort**, **Zusage**, **Gästebuch-Eintrag**.
- Alle Einträge sind sofort für alle folgenden Besucher sichtbar.
- Lesen geht ohne Anmeldung; nur zum Eintragen ist der Login nötig.
- Aus allen Wohnorten wird der geografische **Mittelpunkt** berechnet.

Hosting der Seite: GitHub Pages. Login + Datenbank: Supabase (kostenlos).
Karte: OpenStreetMap — **ohne API-Key**.

---

## Dateien

```
index.html   Komplette Seite: HTML, CSS, JavaScript und alle Grafiken
README.md    Diese Datei
```

Zwei Dateien, mehr nicht. Alle Nutzereinträge liegen ausschließlich in
Supabase — es gibt keine Datei, die das Orga-Team von Hand pflegen muss.

**Wichtig:** Ohne die Supabase-Zugangsdaten aus Schritt 6 ist die Seite noch
nicht verbunden. Sie wird dann zwar vollständig angezeigt, kann aber keine
Einträge laden oder speichern, und die Formulare bleiben gesperrt. Richte
Supabase also ein, bevor du die Einladung verschickst.

---

# Schritt für Schritt: Login und Datenbank einrichten

Dauer etwa 20 Minuten. Du brauchst kein Server-Wissen und keine Kreditkarte.

## Schritt 1 — Konto anlegen

Geh auf <https://supabase.com>, klick auf **Start your project** und melde
dich an (am einfachsten mit deinem GitHub-Konto).

## Schritt 2 — Projekt erstellen

**New project** anklicken. Vergib einen Namen (z. B. `kd-2016`), lass ein
Datenbank-Passwort erzeugen und **speichere es dir ab**. Als Region nimm
`Central EU (Frankfurt)` — das ist für deutsche Nutzer am schnellsten und
datenschutzrechtlich am einfachsten. Dann **Create new project**; die
Einrichtung dauert ein bis zwei Minuten.

## Schritt 3 — Tabellen anlegen

Im linken Menü auf **SQL Editor** → **New query**. Füge den folgenden Block
komplett ein und klick auf **Run**. Er legt die drei Tabellen an und regelt,
wer was darf.

```sql
-- Tabellen
create table pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  city text,
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now()
);

create table guestbook (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  msg text not null,
  created_at timestamptz default now()
);

create table rsvp (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  guests int default 0,
  diet text,
  created_at timestamptz default now()
);

-- Zugriffsschutz einschalten
alter table pins enable row level security;
alter table guestbook enable row level security;
alter table rsvp enable row level security;

-- Lesen darf jeder (auch ohne Login)
create policy "lesen_alle" on pins for select using (true);
create policy "lesen_alle" on guestbook for select using (true);
create policy "lesen_alle" on rsvp for select using (true);

-- Schreiben nur angemeldet, und nur im eigenen Namen
create policy "schreiben_eingeloggt" on pins
  for insert to authenticated with check (auth.uid() = user_id);
create policy "schreiben_eingeloggt" on guestbook
  for insert to authenticated with check (auth.uid() = user_id);
create policy "schreiben_eingeloggt" on rsvp
  for insert to authenticated with check (auth.uid() = user_id);

-- Eigene Einträge dürfen selbst gelöscht werden
create policy "loeschen_eigene" on pins for delete using (auth.uid() = user_id);
create policy "loeschen_eigene" on guestbook for delete using (auth.uid() = user_id);
create policy "loeschen_eigene" on rsvp for delete using (auth.uid() = user_id);
```

Das ist der wichtigste Teil: Ohne diese Regeln könnte entweder niemand oder
jeder alles ändern.

## Schritt 4 — Login-Verfahren einstellen

Links auf **Authentication** → **Sign In / Providers**. Stell sicher, dass
**Email** aktiviert ist. Schalte **Confirm email** ein und **Enable email
signup** ebenfalls. Passwörter brauchst du nicht — die Seite nutzt den
Login-Link („Magic Link"), der ist automatisch mit dabei.

## Schritt 5 — Erlaubte Adressen eintragen

Links auf **Authentication** → **URL Configuration**. Trag ein:

- **Site URL:** deine GitHub-Pages-Adresse, z. B.
  `https://deinname.github.io/kd-2016/`
- **Redirect URLs:** dieselbe Adresse noch einmal, plus
  `http://localhost:8000` fürs lokale Testen.

Das ist wichtig: Steht deine Adresse hier nicht drin, funktioniert der
Login-Link nicht.

## Schritt 6 — Zugangsdaten in die Seite eintragen

Links auf **Project Settings** (Zahnrad) → **API Keys**. Du brauchst zwei
Werte:

- **Project URL** (sieht aus wie `https://abcdefgh.supabase.co`)
- **anon public** key (ein langer Zeichensalat)

Öffne `index.html`, such nach `SUPABASE_URL` (steht weit unten im
`<script>`-Teil) und ersetze die Platzhalter:

```js
var SUPABASE_URL = "https://abcdefgh.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

Der `anon key` ist **kein Geheimnis** — er gehört in den öffentlichen Code und
darf auf GitHub liegen. Geschützt wird über die Regeln aus Schritt 3. Was du
niemals veröffentlichen darfst, ist der `service_role` key.

## Schritt 7 — Hochladen und testen

`index.html` ins GitHub-Repo laden, committen. Nach ein bis
zwei Minuten die Seite öffnen — im Bereich „Mittelpunkt" erscheint jetzt die
Login-Leiste.

Testlauf: E-Mail eintragen → **Link senden** → Mail öffnen → auf den Link
klicken → du landest zurück auf der Seite und bist angemeldet. Trag einen
Wohnort ein. Zur Kontrolle in Supabase unter **Table Editor → pins** nachsehen,
ob die Zeile angekommen ist. Dann in einem privaten Fenster die Seite öffnen:
Der Eintrag muss auch dort sichtbar sein.

---

## Wichtige Hinweise zum Betrieb

**Kostenloses Kontingent.** Der Free-Plan umfasst 500 MB Datenbank und 50.000
aktive Nutzer pro Monat — für ein Jahrgangstreffen um Größenordnungen mehr als
nötig. Eine Kreditkarte ist nicht erforderlich.

**Projekt-Pause.** Kostenlose Supabase-Projekte werden nach **7 Tagen ohne
Zugriff automatisch pausiert**. Dann geht das Eintragen nicht mehr, bis du im
Dashboard auf „Resume" klickst. Bei einer Seite, die monatelang ruhig
daliegt und dann plötzlich genutzt wird, ist das der wahrscheinlichste
Stolperstein — schau vor dem Verschicken der Einladung kurz ins Dashboard.

**E-Mail-Limit.** Der eingebaute Mailversand von Supabase ist auf wenige
Nachrichten pro Stunde begrenzt. Für einen ganzen Jahrgang, der sich am selben
Abend anmeldet, reicht das nicht. Hinterlege dafür unter **Authentication →
Emails → SMTP Settings** einen eigenen Versand (z. B. Brevo oder Resend, beide
mit kostenlosem Kontingent).

**Einträge moderieren.** Unerwünschtes löschst du im **Table Editor** per
Klick auf die Zeile.

**Datenschutz.** Gespeichert werden E-Mail-Adressen und die freiwilligen
Angaben. Weise die Alumni darauf hin, wer Zugriff hat, und lösche die
Datenbank nach dem Treffen, wenn sie nicht mehr gebraucht wird.

---

## Die Karte

Die Seite nutzt die Standard-Kacheln von OpenStreetMap
(`tile.openstreetmap.org`) — **kein API-Key, kein Konto, kostenlos**. Die
Nutzungsbedingungen verlangen sichtbare Attribution; die ist unten rechts in
der Karte eingebaut und darf nicht entfernt werden. Für die Größenordnung
eines Jahrgangstreffens ist die Nutzung ausdrücklich erlaubt.

Die Ortssuche läuft über Nominatim (ebenfalls OpenStreetMap, ohne Key).

---

## Anpassen

Alles direkt in `index.html`:

- **Datum:** `var EVENT_DATE = new Date(2027, 3, 10, 18, 0, 0);`
  (Monat 0-basiert: `3` = April)
- **Orga-E-Mail:** `var ORGA_EMAIL = ...` und der Footer-Text
- **Farben/Schriften:** `:root`-Block oben im `<style>`-Teil
- **Texte, Programm, Ort:** im HTML-Teil

## Lokal testen

```bash
python3 -m http.server 8000
# Browser: http://localhost:8000
```

Nicht per Doppelklick öffnen — der Browser blockiert dann den Login-Rücksprung.
Trag `http://localhost:8000` auch bei den Redirect URLs ein (Schritt 5).

**Tipp:** iOS/Safari cached hartnäckig. Nach jedem Update einmal hart neu
laden, sonst siehst du die alte Version.

# Übersetzungen: ein Master je Modul

Jedes Modul hat genau **einen inhaltlichen Master** (`module.json`; seine
Sprache steht im `language`-Feld). Sprachfassungen sind **automatisch
erzeugte** Dateien im selben Modulordner (`module.en.json`, …) – vollgültige
Module mit identischer Struktur (gleiche ids, gleiche Punkte: Lernstand,
Reports und Coins bleiben EIN Modul), übersetzten Texten und einem
`derivedFrom`-Stempel mit Prüfsummen. **Inhaltlich gearbeitet wird immer am
Master** – die CI lehnt jede Handänderung an einer Fassung ab und sagt, wie
es richtig geht.

Ausnahme: Sprachlernmodule (`"languageLearning": true`, z. B. die
Englischmodule) werden nie übersetzt – die Sprache ist dort der
Lerngegenstand. Aufgeschoben sind ausserdem Module mit planspiel-Blöcken,
eingesprochenen Audio-Dateien (`src`) oder satzbau-Aufgaben; das Werkzeug
und die CI verweigern sie mit Begründung.

## Befehle

```bash
npm run uebersetzungs-status                          # Matrix: aktuell / VERALTET / fehlt / ausgenommen
npm run uebersetze -- --modul <slug> --sprache en     # eine Fassung erzeugen oder nachführen
npm run uebersetze -- --sprache en --nur-veraltet     # alle fälligen Nachführungen
npm run uebersetze -- --sprache en --alle-fehlenden   # alle noch fehlenden Fassungen
```

Das Werkzeug schickt der KI **nie die JSON-Struktur**, nur nummerierte
Textstücke (plus Lückentext-Aufgaben als Paket) – Struktur, ids und Punkte
sind dadurch unverfälschbar, und eine harte Nachprüfung läuft vor jedem
Schreiben. Ein **Segment-Gedächtnis** (`uebersetzung/speicher/`, wird
mitcommittet) übersetzt bei Nachführungen nur geänderte Stücke neu – eine
Ein-Wort-Änderung am Master ergibt einen Ein-Segment-Diff.

**API-Weg (Standard):** `ANTHROPIC_API_KEY` in der eigenen Umgebung
exportieren; das Modell steht in `uebersetzung/konfig.json`. Bewusste
v1-Grenze: Das Werkzeug schickt EIN Auftrag je Modul (keine
automatische Stückelung, kein automatischer Zweitversuch) – bei einer
abgeschnittenen Antwort (`max_tokens`) oder fehlenden Stücken bricht
es mit klarer Meldung ab, ohne je eine Datei zu schreiben; dann
`maxAusgabeTokens` erhöhen oder erneut laufen lassen. Alle heutigen
Module passen in einen Auftrag.
**Datei-Weg (ohne Schlüssel/für Tests):** erst
`--auftrag-datei auftrag.json` (schreibt Prompt + offene Stücke), die
Übersetzungen extern erzeugen, dann mit `--antworten-datei` einspielen.

Danach: Fassung **sprachlich gegenlesen** (Fachbegriffe laut Glossar,
getippte Lücken-Antwortvarianten selbst durchspielen, Natürlichkeit),
Branch, Pull Request – nie direkt auf `main`. Das Werkzeug gibt einen
PR-Textvorschlag aus.

## Übersetzungsfehler melden und korrigieren

Fehler in einer Fassung werden **nie im JSON** korrigiert, sondern:

1. Melden über das Issue-Template «Übersetzungsfehler melden» (offen für
   alle, auch Lehrpersonen).
2. Die Korrektur landet als Anweisung in
   `uebersetzung/hinweise/<slug>.<lang>.md` – das dauerhafte
   Korrektur-Gedächtnis des Moduls; es fliesst in jede künftige
   Neuerzeugung ein. Modulunabhängige Begriffe gehören stattdessen ins
   Glossar (`uebersetzung/glossar.<lang>.json`).
3. Neu erzeugen (die geänderte Hinweis-Datei markiert die Fassung
   automatisch als VERALTET und löst eine Voll-Neuerzeugung aus),
   gegenlesen, PR.

## Was die CI prüft

- **Kanonform + selfHash:** Jede Handänderung an einer Fassung – auch eine
  blosse Umformatierung – schlägt fehl, mit Verweis auf den richtigen Weg.
- **Strukturgleichheit:** gleiche Blöcke/ids/Anzahlen wie der Master,
  byteidentische invariante Felder (u. a. `curricula[].subject`, credits,
  Medien-Pfade, Antworten von numerisch/term), gleiche Punktzahl je Block.
- **Übersetzte Texte:** kein Roh-HTML, keine neuen Markdown-Bild-URLs.
- **Veraltung:** Weicht `masterHash`/`hintsHash` vom aktuellen Stand ab,
  ist die Fassung VERALTET – das ist auf `main` erlaubt (Arbeitsvorrat,
  Status-Report listet sie); nur eine im PR **neu erzeugte** Fassung muss
  zum Master im selben PR passen.

## Neue Sprache

Wenn die Plattform eine Oberflächensprache dazubekommt (SPRACHEN in
`src/lib/i18n/sprache.ts` + Wörterbücher), hier nachziehen – sonst fehlt
der Status-Matrix genau die Spalte, deren Lücken sie zeigen soll:

1. `uebersetzung/sprachen.json` ergänzen.
2. `uebersetzung/konfig.json`: `sprachNamen` + `vorleseSprachen` ergänzen.
3. `uebersetzung/glossar.<lang>.json` anlegen.
4. Zielsprachen-Regel in `uebersetzung/PROMPT.md` ergänzen (für Deutsch
   gilt: Rechtschreibung MIT ß – die Anzeige ersetzt je Lehrplan).

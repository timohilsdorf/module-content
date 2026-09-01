# EveryCate Content-Schema (Version 3)

Dieses Dokument beschreibt das dateibasierte Format für Lernmodule –
vollständig genug, dass **Menschen und KIs** damit eigenständig gültige
Module erstellen können. Die maschinenlesbare Referenz (Zod-Schema) liegt in
[`schema/schema.ts`](schema/schema.ts); bei Widersprüchen gilt das
Zod-Schema. *(Das Schema ist eine synchron gehaltene Kopie aus dem
Plattform-Repository, wo es beim Build erzwungen wird.)*

## Versionsgeschichte

| `schemaVersion` | Stand | Änderung |
|---|---|---|
| 1 | initial | Grundformat: Blöcke `text`, `image`, `video`, `tasks`; Quiz mit drei Fragetypen. |
| 1 | Juli 2026 | Additiv: neuer, automatisch geprüfter Blocktyp [`lueckentext`](#lueckentext--lückentext-automatisch-geprüft) (Cloze). `schemaVersion` bleibt `1` – bestehende Module sind unverändert gültig; ältere Player-Versionen zeigen für den neuen Block einen Platzhalter. |
| 1 | Juli 2026 | Additiv: Konzept [«prüfender Block»](#prüfende-blöcke-und-modulabschluss) – Quiz und prüfende Blocktypen (`PRUEFENDE_BLOCK_TYPES` in `schema/schema.ts`, aktuell `lueckentext`) zählen gleichwertig für Modulabschluss, Punkte und Lernrate. Ein Modul braucht kein Quiz mehr; ohne prüfende Elemente gilt es nach dem Durchsehen als abgeschlossen. |
| 2 | 21. Juli 2026 | Additiv (kein Versionswechsel): optionale Katalog-Metadaten [`sequenz`](#aufbau-eines-moduls) (Lernreihenfolge innerhalb von Fach/Einheit, `1` = zuerst – der Katalog sortiert danach statt nach Dateinamen) und [`einheit`](#aufbau-eines-moduls) (Themengruppe, wenn mehrere Module eine Reihe bilden; der Katalog fasst Module mit identischem Wert sichtbar als Lernpfad zusammen). Bestehende Dateien bleiben unverändert gültig. |
| 2 | Juli 2026 | **Quiz ist ein regulärer Block** (`type: "quiz"`, Pflicht-`id`): beliebig viele Quizze pro Modul, an beliebiger Position, jedes wird einzeln ausgewertet (Prozent, Punkte, Versuche) und zählt als prüfender Block. Das frühere Sonderfeld `quiz` auf Modulebene entfällt in Version 2. **Version-1-Dateien bleiben gültig** und werden beim Einlesen verlustfrei migriert: Das Sonderfeld wird zum letzten Block mit der `id` `"quiz"` – derselbe Lernstand-Schlüssel, Fortschritt und Reports bleiben kompatibel. Coins gibt es weiterhin einmal pro bestandenem Modul, nicht pro Quiz. |
| 2 | 31. Juli 2026 | Additiv (kein Versionswechsel): zwei neue Blocktypen. [`simulation`](#simulation--verzweigter-rollenspiel-dialog) (verzweigter Rollenspiel-Dialog, vollständig skriptiert; mit optionaler `abschlussfrage` ein prüfender Block – löst den bisherigen gleichnamigen Zukunftstyp ab) und [`planspiel`](#planspiel--eingebettetes-lernspiel-nur-everycate-kernteam) (eingebettetes Lernspiel als HTML-Datei im Modulordner, streng gekapselt; **nur für das EveryCate-Kernteam**). Bestehende Dateien bleiben gültig; ältere Player zeigen für beide einen Platzhalter. Version-1-Dateien mit einem andersförmigen `simulation`-Zukunftsblock bleiben ebenfalls gültig (Platzhalter-Verhalten bleibt erhalten). |
| 2 | 1. August 2026 | Additiv (kein Versionswechsel): dritter Lückentext-Modus [`satzbau`](#lueckentext--lückentext-automatisch-geprüft) (Bausteine in die richtige Reihenfolge bringen; nutzt `bausteine`/`alternativen` statt `text`/`luecken` – **Achtung:** ältere Player lehnen satzbau-Blöcke ab, solche Module erst NACH dem zugehörigen Plattform-Deploy einreichen), neuer prüfender Blocktyp [`zuordnung`](#zuordnung--paare-zuordnen-automatisch-geprüft) (Paare zuordnen, Elemente Text oder Bild) und neuer Blocktyp [`audio`](#audio--hörverstehen) (moduleigene Hördatei mit Pflicht-Transkript, nicht prüfend). Ausserdem festgehalten: `language` ist die **Zielsprache** des Moduls – bei Fremdsprachenmodulen (z. B. `"en"`) antwortet der KI-Lernpartner Cate in dieser Sprache. |
| 2 | 2. August 2026 | Additiv (kein Versionswechsel): Zuordnung wird **rein per Antippen** bedient (beide Spalten gemischt nebeneinander, Paare in beliebiger Reihenfolge bilden, sichtbar verbunden und auflösbar – kein Drag-and-Drop mehr) und darf zusätzlich **linke Ablenker** tragen (`ablenkerLinks`). Audio: `transcript` ist **optional** (nur weglassen, wenn das Gehörte selbst eingetippt werden soll; `transkriptAnzeigen` steuert die Anzeige, Standard `true`) und als Alternative zur Datei gibt es die **Vorlese-Variante** `vorleseText` + `vorleseSprache` (Browser-Stimme, nur lokale Stimmen – die Datei bleibt der bevorzugte Weg). **Achtung:** ältere Player lehnen Module mit den neuen Feldern bzw. ohne `transcript` ab – erst nach dem zugehörigen Plattform-Deploy einreichen. |
| 2 | 3. August 2026 | Additiv (kein Versionswechsel, reine Lockerung): Audio-Blöcke dürfen `src` **und** `vorleseText` gleichzeitig tragen – die **Datei hat Vorrang**, der Vorlesetext ist das Backup, solange (noch) keine Datei hinterlegt ist. Mit `src` bleibt `transcript` erlaubt; nur ohne `src` ist es weiterhin verboten (der `vorleseText` ist dort bereits der Text). Bestehende Module bleiben unverändert gültig. |
| 2 | 3. August 2026 | Klarstellung (kein Versionswechsel, reine **Abspiel-Reihenfolge** im Player – die Validierung bleibt unverändert): Der Vorrang aus der Zeile darüber dreht sich um. Das **Browser-Vorlesen ist der bevorzugte Weg**, sobald eine passende Stimme der Zielsprache da ist (Lernende wählen unter «Cates Stimmen» zwischen Stimmen und Aussprachevarianten); die **hinterlegte Datei ist die Rückfallebene** (keine passende Stimme, oder die Vorlese-Ausgabe schlägt fehl); zuletzt greift wie bisher der Text bzw. bei verborgenem Transkript der Hinweis auf «Cates Stimmen». Für Autorinnen und Autoren heisst das: `vorleseText` **und** `src` gemeinsam eintragen ist der Idealzustand – Wahlfreiheit bei den Stimmen plus ein zuverlässiges Backup. |
| 2 | 5. August 2026 | **Verengung** (kein Versionswechsel): [Zuordnung](#zuordnung--paare-zuordnen-automatisch-geprüft) **ohne Ablenker** – die Felder `ablenker` und `ablenkerLinks` sind **entfernt** und werden von der Validierung abgelehnt. Begründung: Geprüft werden kann erst, wenn ALLE Elemente verbunden sind – Ablenker liessen sich so gar nicht «unbenutzt» lassen und erzwangen falsch bewertete Paare. Jedes linke Element hat genau ein rechtes Gegenstück, beide Spalten sind gleich lang. **Achtung Rollout (umgekehrt zu den additiven Fällen):** Module mit Ablenkern ZUERST bereinigen und mergen, DANN deployt die Plattform das strengere Schema – ältere Player zeigen bereinigte Module unverändert an (die Felder waren dort optional). |
| 2 | 9. August 2026 | Additiv (kein Versionswechsel): zwei neue **prüfende** Blocktypen. [`numerisch`](#numerisch--zahleneingabe-automatisch-geprüft) – Zahleneingabe mit Toleranz (absolut/prozentual), gleichwertigen Schreibweisen (`0,5` = `0.5` = `1/2` = `50 %`), optionaler **Einheit** mit Umrechnung gleichwertiger Einheiten (`42 cm` = `0,42 m`, mathjs) und mehreren akzeptierten Antworten. [`achse`](#achse--elemente-auf-achsen-platzieren-automatisch-geprüft) – Elemente (Zahlen, Jahreszahlen, Textkarten) auf einer oder zwei Achsen platzieren: Zahlenstrahl, Zeitstrahl, Koordinatensystem; Achsen numerisch oder mit Textkategorien; Wertung nach Position (Toleranz), Reihenfolge oder Kategorie (Darstellung: JSXGraph, dual MIT/LGPL). Zusätzlich rendert `$$…$$` in allen Markdown-Feldern **Mathe-Notation** (KaTeX; einzelne \$-Zeichen bleiben Text). Bestehende Dateien bleiben gültig; ältere Player zeigen für die neuen Typen einen Platzhalter. |
| 2 | 11. August 2026 | Additiv (kein Versionswechsel): neuer **prüfender** Blocktyp [`term`](#term--mathematischen-term-eingeben-automatisch-geprüft) – Eingabe eines mathematischen Terms, bei dem jede **äquivalente Umformung** als richtig gilt (`2*(x+3)` = `2x+6`). Geprüft wird mit mathjs: symbolische Vereinfachung der Differenz, ergänzt durch deterministische numerische Stichproben, wo die Vereinfachung nicht eindeutig entscheidet. Syntaktisch ungültige Eingaben werden nie als falsch gewertet, sondern mit einer Korrektur-Aufforderung abgefangen. Bestehende Dateien bleiben gültig; ältere Player zeigen einen Platzhalter. |
| 2 | 11. August 2026 | Additiv (kein Versionswechsel): [**Aufgaben-Varianten**](#aufgaben-varianten) für `lueckentext`, `zuordnung`, `numerisch` und `term`. Ein Block darf neben seinem normalen Inhalt (= Variante A) eine Liste `varianten` mit weiteren, vollständig ausformulierten Fassungen tragen; der Player zieht beim Öffnen zufällig eine, «Wiederholen» zieht eine andere. Jede Fassung muss dieselbe Punktzahl ergeben; der Lernstand bleibt pro Block, die gezogene Fassung wird weder gespeichert noch übermittelt. **Bewusst ohne Varianten:** `tasks`, `quiz`, `simulation`, `planspiel` (die Validierung lehnt das Feld dort ab). **Achtung Rollout:** Ältere Player lehnen Module MIT `varianten` hart ab (kein Platzhalter) – erst nach dem zugehörigen Plattform-Deploy einreichen. |
| 2 | 11. August 2026 | Additiv (kein Versionswechsel): optionale **Zuordnungstabelle [`lehrplaene`](#mehrere-lehrpläne)** auf Modulebene – dasselbe Modul liegt ohne Duplikat in mehreren Lehrplänen (pro Kennung Fach, Stufe im Modell des Lehrplans und optionale Kompetenzverweise); die Startseite bekommt dazu eine Lehrplan-Auswahl mit Flagge. Bestehende Module funktionieren unverändert (implizite Migration aus `subject`/`cycle`/`curriculum`). **Achtung Rollout wie beim satzbau:** Ältere Player lehnen Module MIT `lehrplaene` ab (striktes Schema) – solche Module erst NACH dem zugehörigen Plattform-Deploy einreichen. |
| 2 | 13. August 2026 | Additiv (kein Versionswechsel): Lehrplan-Einträge dürfen statt einer Schulstufe die Stufe **`selbststudium: true`** tragen – für Module oberhalb der Schulzeit (z. B. das technische Demo-Modul); der Katalog führt sie unter der eigenen Stufe «Selbststudium» NACH der höchsten Klassenstufe. Zugleich zeigt die Modulseite die **Kompetenzverweise je Lehrplan**: Bei gewähltem Lehrplan erscheinen die `kompetenzen` des passenden `lehrplaene`-Eintrags (bzw. der impliziten Migration aus `competencies`); **fehlen sie für die Wahl, entfällt die Kompetenz-Zeile** – wer sie behalten will, pflegt `kompetenzen` in jedem Eintrag. **Achtung Rollout wie bei `lehrplaene`:** Module MIT `selbststudium` erst NACH dem zugehörigen Plattform-Deploy einreichen. |
| **3** | 14. August 2026 | **Vereinheitlichte Lehrplan-Metadaten.** Die sechs Top-Level-Felder `subject`/`subjectName`/`cycle`/`grades`/`curriculum`/`competencies` **und** die Zuordnungstabelle `lehrplaene` sind ersetzt durch **ein** Feld [`curricula`](#mehrere-lehrpläne-curricula): eine **Liste** von Zuordnungen, je Eintrag `curriculum` (Kennung `li`/`ch`/`de`/`at`), `subject`/`subjectName`, Stufe und `competencies` (Code-Format frei). Die **Stufe** ist vereinheitlicht: Klassenstufen-**Zahlen** in `grades` (`[9]`, `[7, 8, 9]` – der Zyklus-Begriff entfällt, auch `li`/`ch` tragen Zahlen), davor ein **Bezeichner** («Stufe» bei `li`/`ch`, «Klasse» bei `de`/`at` – Standard-Wort aus der Lehrplan-Registry, per `gradesText` übersteuerbar; Anzeige «Stufe 7–9», «Klasse 9»). Module **ohne** Klassenstufe tragen nur `gradesText` (z. B. `"Erwachsene"` – ersetzt `selbststudium`, erscheint im Stufen-Filter nach allen Klassenstufen). Version-1/2-Dateien liest die **Plattform** weiterhin (verlustfreie Migration, wichtig für lokal eingeladene Module) – **dieses Repo nimmt nur noch Version 3 an** (Validator-Policy lehnt `schemaVersion` < 3 und die alten Top-Level-Felder mit Klartext-Meldung ab). Migrations-Mapping: siehe [Mehrere Lehrpläne](#mehrere-lehrpläne-curricula). **Achtung Rollout:** Ältere Player lehnen Version-3-Dateien hart ab – Module erst NACH dem zugehörigen Plattform-Deploy einreichen. |
| **3** (additiv) | 18. August 2026 | KEIN Versionswechsel: `languageLearning` am Master (Sprachlernmodule, werden nie übersetzt), `_hinweis` + `derivedFrom` in Sprachfassungen (`module.<lang>.json`). ACHTUNG Rollout: Plattform-Schema ZUERST deployen, erst danach Module/Fassungen mit den neuen Feldern mergen – ältere Plattform-Stände lehnen sie strikt ab. |

## Ablage

Ein Modul = ein Ordner unter `modules/` – die `module.json` und alle
Bilder liegen **zusammen in diesem Ordner**:

```
modules/
  mein-modul/            ← Ordnername = Slug = "id" im JSON
    module.json          ← das Modul (dieses Format)
    karte.jpg            ← Bilder direkt daneben
```

Referenziert werden Bilder im JSON trotzdem als
`/content/mein-modul/karte.jpg` – unter diesem Pfad liefert die Plattform
sie aus (sie kopiert die Bilder beim Build dorthin).

Regeln:

- **Format:** eine `module.json` pro Modul, UTF-8, gültiges JSON (keine Kommentare).
- **Slug/`id`:** nur `a-z`, `0-9`, `-`; muss exakt dem Ordnernamen entsprechen.
- **Sprache:** Inhalte auf Deutsch (Schweizer Kontext: «ss» statt «ß» ist erwünscht, Anrede «du»).
- **Strikte Felder:** Unbekannte Feldnamen sind ein Fehler (Tippfehler-Schutz).
- **Validierung:** `npm run validate` prüft alle Module; dieselbe Prüfung
  läuft bei jedem Pull Request und markiert ihn bei Verstössen als
  fehlgeschlagen. Geprüft werden auch: erlaubte Blocktypen, Video-Provider
  und Bild-Hosts laut [`schema/whitelist.json`](schema/whitelist.json)
  (auch für Markdown-Bilder in Textfeldern und Zuordnungs-Bilder), kein
  Roh-HTML in Textfeldern, Existenz/Endung/Grösse der Bild-, Video- und
  Audiodateien, maximale Grösse der `module.json` (`maxModuleJsonKB`),
  Planspiel-Dateien (Dokumentanfang, Grössenlimit, keine externen
  Verweise), Eindeutigkeit von IDs, Pflicht-`id` bei Quizfragen und
  saubere Modulordner (nur `module.json`, Bilder, Videos, Hördateien und
  referenzierte Planspiel-Dateien, keine Symlinks).
  `requires`-Verweise auf (noch) nicht existierende
  Module ergeben nur einen Hinweis, keinen Fehler – Slug trotzdem auf
  Tippfehler prüfen.

## Aufbau eines Moduls

```json
{
  "schemaVersion": 3,
  "id": "mein-modul",
  "title": "Titel des Moduls",
  "description": "1–3 Sätze für den Katalog.",
  "curricula": [
    {
      "curriculum": "li",
      "subject": "RZG",
      "subjectName": "Räume, Zeiten, Gesellschaften",
      "grades": [7, 8, 9],
      "competencies": [
        { "code": "RZG.4.2.c", "description": "…" }
      ]
    }
  ],
  "language": "de",
  "learningObjectives": [
    "Ich kann …"
  ],
  "durationMinutes": 45,
  "difficulty": "mittel",
  "keywords": ["…"],
  "authors": ["…"],
  "sources": [{ "title": "…", "url": "https://…" }],
  "license": "CC BY-SA 4.0",
  "requires": [],
  "blocks": [ …, { "type": "quiz", "id": "quiz", "questions": [ … ] } ]
}
```

### Metadaten-Felder

| Feld | Pflicht | Typ | Bedeutung |
|---|---|---|---|
| `schemaVersion` | ✅ | `3` | Version dieses Formats. Dieses Repo nimmt nur noch `3` an; ältere Dateien liest die Plattform weiterhin (automatische Migration, siehe Versionsgeschichte). |
| `id` | ✅ | string | Slug, identisch mit dem Ordnernamen. |
| `title` | ✅ | string | Modultitel. |
| `description` | ✅ | string | Kurzbeschreibung für den Katalog (1–3 Sätze). |
| `curricula` | ✅* | Liste | **Lehrplan-Zuordnungen** (seit Version 3 die einzige Quelle für Fach, Stufe und Kompetenzen): je Eintrag ein Lehrplan, Felder siehe Tabelle unten. Die Reihenfolge der Liste ist die Anzeige-Reihenfolge der «alle Lehrpläne»-Zeile. **Fehlt ein Lehrplan, erscheint das Modul bei dieser Auswahl nicht.** *Für Repo-Module verlangt der Validator mindestens einen Eintrag. Siehe [Mehrere Lehrpläne](#mehrere-lehrpläne-curricula). |
| `sequenz` | – | int > 0 | Lernreihenfolge innerhalb des Fachs bzw. der Einheit (`1` = zuerst). Der Katalog sortiert danach – unabhängig vom Dateinamen; Module ohne Wert folgen alphabetisch nach Titel. |
| `einheit` | – | string (≤ 120) | Themengruppe/Einheit, wenn mehrere Module eine Reihe bilden (z. B. `"Themenblock A: Grundbegriffe und Wirtschaftskreislauf"`). Module mit identischem Wert fasst der Katalog sichtbar als Lernpfad zusammen. |
| `language` | – | string | BCP-47-Code, Standard `"de"`. **Zielsprache des Moduls:** Bei Fremdsprachenmodulen (z. B. `"en"` für Englisch) stehen die Inhalte in dieser Sprache, und der KI-Lernpartner Cate antwortet bei Aufgaben-Rückmeldungen und Rückfragen ebenfalls darin (einfach, dem Sprachniveau der Stufe angemessen). |
| `learningObjectives` | ✅ | string[] | Lernziele aus Schülersicht («Ich kann …»), mind. 1. |
| `durationMinutes` | – | int > 0 | Geschätzte Bearbeitungszeit. |
| `difficulty` | – | enum | `"leicht"`, `"mittel"` oder `"anspruchsvoll"`. |
| `keywords` | – | string[] | Schlagwörter (Suche, spätere Video-Vorschläge). |
| `authors` | – | string[] | Autorinnen/Autoren. |
| `sources` | – | Liste | Verwendete Quellen (`title`, optional `url`); wird im Modul angezeigt. |
| `license` | – | enum | Lizenz der Inhalte – eine bekannte Schreibweise: `"CC BY-SA 4.0"`, `"CC BY 4.0"`, `"CC BY-SA 3.0"`, `"CC0"` oder `"CC0 1.0"`. Standard für dieses Repo ist `"CC BY-SA 4.0"`. |
| `requires` | – | string[] | Slugs vorausgesetzter Module (für spätere Lernpfade). |
| `blocks` | ✅ | Block[] | Inhaltsblöcke in Anzeigereihenfolge, mind. 1 (Quiz: als Block vom Typ `quiz`). |

## Inhaltsblöcke (`blocks`)

Jeder Block hat ein `type`-Feld sowie optional `id` (stabile Referenz),
`title` (Zwischenüberschrift) und `teilkompetenzen` (Kennungen aus dem
Register `kompetenzen/teilkompetenzen.json`, sinnvoll nur an
Aufgaben-Blöcken – siehe [Teilkompetenzen](#teilkompetenzen-teilkompetenzen--ordner-kompetenzen)). In allen als *Markdown* markierten Feldern ist
GitHub Flavored Markdown erlaubt (Absätze, Listen, Tabellen, Links, `**fett**`).
**Roh-HTML ist nicht erlaubt** – der Player rendert es nicht, und die
Validierung weist es zurück. *(Ausnahmen: Tags als Beispiel in
`Code`-Spans/-Blöcken sowie Autolinks wie `<https://…>` sind erlaubt – so
lassen sich z. B. HTML-Inhalte unterrichten.)* Markdown-Bilder
(`![Beschreibung](/content/mein-modul/bild.jpg)`) sind möglich und
unterliegen denselben Regeln wie `image`-Blöcke; Referenz-Stil
(`![alt][ref]`) ist nicht erlaubt.

### `text` – Fliesstext

```json
{ "type": "text", "title": "Optionale Überschrift", "body": "Markdown-Text …" }
```

**Mathe-Notation** (seit 9. August 2026, in ALLEN Markdown-Feldern):
`$$…$$` rendert eine Formel (KaTeX) – inline im Satz oder als eigener
Absatz. Einzelne \$-Zeichen bleiben bewusst normaler Text (Geldbeträge
wie «$5»). Beispiel: `Berechne $$\tfrac{3}{4} + \tfrac{1}{8}$$.`

### `image` – Bild

```json
{
  "type": "image",
  "src": "/content/mein-modul/karte.jpg",
  "alt": "Pflicht: Beschreibung für Screenreader",
  "caption": "Optionale Bildunterschrift",
  "credit": "Optional: Quelle/Lizenz, z. B. «Foto: NASA, Public Domain»"
}
```

- Die Bilddatei liegt **im Modulordner** (`modules/mein-modul/karte.jpg`),
  referenziert wird sie als `/content/mein-modul/karte.jpg`.
- Erlaubte Endungen und maximale Dateigrösse: siehe
  [`schema/whitelist.json`](schema/whitelist.json) (`imageExtensions`,
  `maxImageSizeKB` – Bilder vor dem Hochladen auf Webgrösse verkleinern).
- Alternativ ist eine `https://`-URL möglich – aber nur von Hosts, die in
  der Whitelist (`imageHosts`) freigegeben sind. Im Zweifel: Bild (mit
  geklärter Lizenz!) herunterladen und in den Modulordner legen.
- Nur Bilder mit geklärter Lizenz verwenden und den Nachweis in `credit`
  angeben.

### `video` – Video-Einbettung

```json
{
  "type": "video",
  "provider": "youtube",
  "videoId": "jNQXAC9IVRw",
  "title": "Optionale Überschrift",
  "description": "Optional: Worauf beim Schauen achten?",
  "startSeconds": 90,
  "transcript": "Optional, Markdown: Textalternative/Zusammenfassung des Videos."
}
```

- `provider`: `"youtube"` (Standard) oder `"vimeo"` – die erlaubten
  Provider stehen in [`schema/whitelist.json`](schema/whitelist.json).
- **Eigenes Video im Modulordner** (seit 28.7.2026): `provider: "url"`
  zusammen mit `"url": "/content/<modul-id>/<datei>.mp4"` – die Datei
  liegt dann neben der `module.json`, genau wie die Bilder (erlaubt sind
  `.mp4` und `.webm`, höchstens 8 MB, siehe `videoExtensions` und
  `maxVideoSizeKB` in der Whitelist). Der Player spielt sie ohne
  Fremdanbieter direkt ab – kein Klick-zum-Laden nötig, weil keine
  Verbindung nach aussen entsteht. `videoId` entfällt dabei.
  Video-Dateien von FREMDEN Servern bleiben gesperrt (`videoUrlHosts`
  ist leer).
- Bei `youtube`/`vimeo` nur die **Video-ID**, nicht die ganze URL
  (YouTube: 6–20 Zeichen aus `A–Z a–z 0–9 _ -`, üblich sind 11;
  Vimeo: 6–12 Ziffern). Die Validierung weist ganze URLs zurück.
- `transcript` (empfohlen): kurze Textalternative fürs Video – wichtig für
  Barrierefreiheit und falls das Video offline oder gesperrt ist.
- Der Player lädt Embeds erst nach Klick (Datenschutz); YouTube läuft über
  `youtube-nocookie.com`.
- Kuratieren statt produzieren: existierende, gute freie Videos einbetten.
  Vor dem Eintragen prüfen, ob das Video verfügbar, seriös und stufengerecht ist.

### `tasks` – offene Aufgaben (ohne automatische Auswertung)

```json
{
  "type": "tasks",
  "title": "Aufgaben",
  "intro": "Optionaler Einleitungstext (Markdown).",
  "tasks": [
    {
      "id": "optional-stabile-id",
      "prompt": "Aufgabenstellung (Markdown).",
      "hint": "Optionaler Tipp (aufklappbar).",
      "solution": "Optionale Musterlösung (aufklappbar)."
    }
  ]
}
```

Didaktischer Tipp: Als letzte Aufgabe eignet sich oft «Erkläre es jemandem»
oder «Erstelle selbst eine Quizfrage zu diesem Thema» (Lernen durch Lehren).

### `lueckentext` – Lückentext (automatisch geprüft)

Ein Text mit Lücken, die der Player direkt auswertet – als Wortauswahl
zum Antippen (`wortbank`) oder mit freien Textfeldern (`eingabe`):

```json
{
  "type": "lueckentext",
  "id": "lt1",
  "title": "Setze die richtigen Begriffe ein",
  "intro": "Optional: Arbeitsanweisung (Markdown).",
  "modus": "wortbank",
  "text": "Wasser verdunstet durch die {{1}} und bildet {{2}}.\nFällt es zu Boden, nennt man das {{3}}.",
  "luecken": [
    { "antworten": ["Sonnenwärme", "Sonne"] },
    { "antworten": ["Wolken"] },
    { "antworten": ["Niederschlag"], "caseSensitive": true }
  ],
  "ablenker": ["Blitze", "Nebel"]
}
```

Regeln:

- **`id`** (Pflicht, wie bei Quizfragen): Der Lernstand speichert
  Ergebnisse und Punkte pro Block – ohne stabile `id` würden sie bei
  Content-Änderungen vermischt.
- **`text`** ist **reiner Text, kein Markdown** – Zeilenumbrüche (`\n`)
  bleiben erhalten. Die Lücken werden exakt als `{{1}}`, `{{2}}`, …
  geschrieben (doppelte geschweifte Klammern, fortlaufende Zahl, keine
  Leerzeichen) und verweisen 1-basiert auf die Liste `luecken`. **Jede
  Lücke kommt genau einmal vor**; die Validierung prüft das.
- **`luecken`**: pro Lücke ein Objekt mit `antworten` (Liste akzeptierter
  Antworten, mind. 1 – Synonyme und gängige Schreibvarianten hier
  eintragen) und optional `caseSensitive` (Standard `false`).
- **`modus`** (Pflicht): `"wortbank"` bietet die Lösungswörter als
  Auswahl an – auf grossen Bildschirmen und Tablets per Drag-and-Drop,
  auf Smartphones per Antippen (erst Wort, dann Lücke); angezeigt wird
  pro Lücke die **erste** Antwort aus `antworten`, alphabetisch gemischt
  mit den `ablenker`-Wörtern. `"eingabe"` zeigt stattdessen ein Textfeld
  pro Lücke, inline im Textfluss.
- **`ablenker`** (nur `wortbank`): zusätzliche falsche Wörter in der
  Auswahl. Sie dürfen mit keiner akzeptierten Antwort übereinstimmen.
- **Auswertung** (im Player): Eingabe und akzeptierte Antworten
  durchlaufen dieselbe Normalisierung – Unicode-NFC (Umlaute von jeder
  Tastatur/Diktierfunktion zählen gleich), Leerraum am Rand wird immer
  ignoriert, ohne `caseSensitive` auch die Gross-/Kleinschreibung. Eine
  Lücke ist richtig, wenn die Eingabe so einer der akzeptierten
  Antworten entspricht. Nach dem Prüfen markiert der Player jede Lücke
  einzeln (✓/✗) und bietet Lösung und Wiederholen an.
- **Punkte** wie beim Quiz: Jeder Durchlauf zählt eine richtige Lücke
  als einen Punkt; der Lernstand hält alle Durchläufe pro Block fest,
  angezeigt werden der beste Versuch und die Versuchszahl. Bestanden ist
  der Block, wenn **alle** Lücken richtig sind. Coins gibt es fürs
  erstmals **bestandene Modul** (alle prüfenden Blöcke 100 %), nicht pro
  Einzelblock – siehe
  [Prüfende Blöcke und Modulabschluss](#prüfende-blöcke-und-modulabschluss).
- Der Blocktyp ist eine **additive Erweiterung von Schema-Version 1**
  (Juli 2026, siehe [Versionsgeschichte](#versionsgeschichte)) – ältere
  Player-Versionen zeigen dafür einen Platzhalter.

**Modus `satzbau`** (seit 1. August 2026): Statt Lücken zu füllen, bringen
die Lernenden vorgegebene Wörter oder Satzteile in die richtige
Reihenfolge – per Drag-and-Drop in eine Zielreihe oder per Antippen;
platzierte Bausteine lassen sich umsortieren und zurücklegen.

```json
{
  "type": "lueckentext",
  "id": "sb1",
  "title": "Bilde den Satz",
  "modus": "satzbau",
  "bausteine": ["Die Validierung", "prüft", "vor dem Merge", "jedes Modul"],
  "alternativen": [[1, 2, 4, 3]],
  "ablenker": ["per E-Mail"]
}
```

- **`bausteine`** (Pflicht in diesem Modus, 2–40): die Bausteine in der
  KORREKTEN Reihenfolge. Angezeigt werden sie gemischt. `text` und
  `luecken` entfallen in diesem Modus (die Validierung lehnt sie ab).
- **`alternativen`** (optional): weitere gültige Reihenfolgen – z. B. für
  verschiebbare Adverbien – als 1-basierte Indizes auf `bausteine`. Jede
  Alternative stellt ALLE Bausteine um (vollständige Permutation).
- **`ablenker`** (optional): zusätzliche Bausteine, die nicht in die
  Lösung gehören (dürfen keinem Baustein gleichen).
- **Punkte**: ein Punkt pro richtig platziertem Baustein, gewertet gegen
  die wohlwollendste gültige Reihenfolge; bestanden bei komplett
  richtiger Reihenfolge. Ergebnisanzeige und «Wiederholen» wie in den
  anderen Modi.
- **Achtung Rollout:** Ältere Player-Versionen lehnen Module mit
  satzbau-Blöcken ab (kein Platzhalter – der Modus steckt im bestehenden
  Blocktyp). Solche Module erst einreichen, wenn die Plattform den Modus
  ausliefert.

### `zuordnung` – Paare zuordnen (automatisch geprüft)

Paare werden einander zugeordnet: Wort–Definition, Wort–Bild,
Begriff–Beispiel. Beide Spalten stehen gemischt nebeneinander (auch auf
dem Handy); bedient wird **rein per Antippen**: ein Element links und
eines rechts antippen bildet ein Paar – mit welcher Seite man beginnt,
ist egal. Ein angetipptes Element ist markiert und durch erneutes
Antippen abwählbar; gebildete Paare sind über gleiche Nummern sichtbar
verbunden und durch Antippen eines Partners wieder auflösbar.

```json
{
  "type": "zuordnung",
  "id": "zu1",
  "title": "Ordne die Begriffe zu",
  "intro": "Optional: Arbeitsanweisung (Markdown).",
  "paare": [
    { "links": { "text": "Fotosynthese" }, "rechts": { "text": "Pflanzen erzeugen Zucker aus Licht, Wasser und CO₂." } },
    {
      "links": { "text": "Chloroplast" },
      "rechts": { "bild": { "src": "/content/mein-modul/chloroplast.jpg", "alt": "Mikroskopaufnahme eines Chloroplasten", "credit": "Foto: …, CC BY-SA 4.0" } }
    }
  ]
}
```

- **`id`** (Pflicht): Lernstand und Punkte hängen am Block.
- **`paare`** (2–12): Jedes Element hat entweder `text` ODER `bild`
  (genau eines). Bilder brauchen `src` (Modulordner oder freigegebener
  Host, gleiche Regeln wie der [Bild-Block](#image--bild)), `alt` und
  `credit` – Quelle/Lizenz sind hier PFLICHT und erscheinen gesammelt
  unter dem Block.
- **Keine Ablenker** (seit 5. August 2026): Jedes linke Element hat
  genau ein passendes rechtes Gegenstück, beide Spalten sind gleich
  lang – die früheren Felder `ablenker`/`ablenkerLinks` werden von der
  Validierung abgelehnt (Begründung in der Versionsgeschichte). Die
  Elemente jeder Spalte müssen unterscheidbar sein (die Validierung
  lehnt Doppelte ab; Bilder zählen über die Bilddatei).
- **Punkte**: ein Punkt pro korrektem Paar; Prozent-/Punkteanzeige und
  «Wiederholen» wie bei Quiz und Lückentext. PRÜFENDER Block (zählt zum
  Modulabschluss).
- Additive Ergänzung von Schema-Version 2 (1. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `numerisch` – Zahleneingabe (automatisch geprüft)

Eine oder mehrere Teilaufgaben, je ein Zahlen-Eingabefeld. Gleichwertige
Schreibweisen zählen automatisch gleich: Dezimalpunkt und -komma
(`0.5` = `0,5`), Brüche (`1/2`) und die Prozent-Schreibweise (`50 %`,
abschaltbar). Mit `einheit` muss die Eingabe eine Einheit tragen –
gleichwertige Einheiten werden umgerechnet (`42 cm` = `0,42 m`).

```json
{
  "type": "numerisch",
  "id": "num1",
  "title": "Rechne um",
  "aufgaben": [
    {
      "prompt": "Wie viele **Meter** sind 4,2 km? Antworte mit Einheit.",
      "antworten": ["4200"],
      "einheit": "m",
      "toleranz": { "art": "absolut", "wert": 10 }
    },
    {
      "prompt": "Welchen Wert ergibt $$\\tfrac{1}{2} + \\tfrac{1}{4}$$?",
      "antworten": ["0.75"]
    }
  ]
}
```

- **`id`** (Pflicht): Lernstand und Punkte hängen am Block.
- **`aufgaben`** (1–12): je `prompt` (Markdown, Mathe-Notation mit
  `$$…$$` erlaubt) und `antworten` (1–8 akzeptierte Werte als
  Schreibweisen OHNE Einheit; gleichwertige Schreibweisen desselben
  Werts muss niemand doppelt listen – mehrere Einträge sind für
  WIRKLICH verschiedene akzeptierte Werte).
- **`toleranz`** (optional): `{ "art": "absolut", "wert": 10 }` =
  Spanne in der Zieleinheit; `{ "art": "prozent", "wert": 5 }` =
  relativ zum Zielwert. Ohne Toleranz zählt Wertgleichheit.
- **`einheit`** (optional): erwartete Einheit in mathjs-ASCII-Schreibweise
  (`m`, `km/h`, `kg`, `m^2`, `degC` – NICHT `°C`/`m²`; die Validierung
  prüft die Einheit gegen mathjs). Wenn gesetzt, MUSS die Eingabe eine
  Einheit tragen; ohne das Feld sind Eingaben mit Einheit falsch.
- **`prozentErlaubt`** (optional, Standard `true`): `false` lehnt
  %-Eingaben ab (z. B. wenn `5000 %` als Antwort auf «10 · 5» absurd
  richtig wäre).
- **Punkte**: ein Punkt pro Teilaufgabe; Auswertung/«Wiederholen» wie
  bei Lückentext und Zuordnung. PRÜFENDER Block.
- Additive Ergänzung von Schema-Version 2 (9. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `achse` – Elemente auf Achsen platzieren (automatisch geprüft)

EIN Blocktyp für Zahlenstrahl (Mathematik), Zeitstrahl
(Geschichte/RZG) und Koordinatensystem: Elemente – Zahlen, Jahreszahlen
oder Textkarten – werden an Positionen auf einer oder zwei Achsen
platziert. Bedienung wie die Zuordnung: Karte antippen, dann die Stelle
antippen; mit feiner Zeigereingabe lassen sich Karten auch direkt
ziehen, gesetzte Punkte sind immer nachziehbar.

```json
{
  "type": "achse",
  "id": "achse1",
  "title": "Ordne die Brüche auf dem Zahlenstrahl",
  "x": { "min": 0, "max": 2, "schritt": 0.25, "teilstriche": 0.5 },
  "elemente": [
    { "text": "0,75", "x": 0.75 },
    { "text": "5/4", "x": 1.25 }
  ]
}
```

- **`id`** (Pflicht): Lernstand und Punkte hängen am Block.
- **`x`** (Pflicht): numerische Achse mit `min`/`max` (dazu optional
  `schritt` = Einrast-Raster, `teilstriche` = Abstand beschrifteter
  Striche, `beschriftung`) ODER Kategorien-Achse mit
  `kategorien: ["Antike", "Mittelalter", …]` (2–12 benannte
  Abschnitte; Elemente tragen dann `xKategorie` statt `x`).
- **`y`** (optional): zweite, immer numerische Achse – macht aus dem
  Strahl ein Koordinatensystem; Elemente brauchen dann auch `y`.
- **`elemente`** (1–12): je `text` (Karten-Beschriftung) und das Ziel
  (`x`, `xKategorie` bzw. `x`+`y`); optional eigene `toleranz`.
- **`wertung`** (optional, Standard `"position"`): `"position"` =
  Zielposition mit Toleranz (Element-Toleranz vor Block-`toleranz`
  vor Standard: halber `schritt` bzw. 1/40 des Bereichs);
  `"reihenfolge"` = nur die Ordnung der Elemente entlang der Achse
  zählt (Zeitstrahl: Ereignisse richtig einordnen, ohne das exakte
  Jahr zu treffen – nur 1D, Zielpositionen müssen verschieden sein).
  Auf einer Kategorien-Achse zählt automatisch die richtige Kategorie.
- **Punkte**: ein Punkt pro Element; Auswertung/«Wiederholen» wie bei
  den übrigen prüfenden Blöcken. PRÜFENDER Block. Dargestellt mit
  JSXGraph (dual MIT/LGPL-lizenziert).
- Additive Ergänzung von Schema-Version 2 (9. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `term` – mathematischen Term eingeben (automatisch geprüft)

Eine oder mehrere Teilaufgaben, je ein Eingabefeld für einen
mathematischen Term. Geprüft wird **Äquivalenz**, nicht die Form: Jede
gleichwertige Umformung der Musterlösung zählt als richtig (`2*(x+3)`
ist so richtig wie `2x+6`, `0,5x` so richtig wie `x/2`). Eine
KaTeX-Live-Vorschau zeigt den Lernenden, wie ihre Eingabe gelesen wird;
eine Symbol-Leiste hilft bei `√`, `·`, `²`, `^` und `π`.

```json
{
  "type": "term",
  "id": "term1",
  "title": "Terme umformen",
  "aufgaben": [
    {
      "prompt": "Multipliziere aus: $$2\\cdot(x+3)$$",
      "antworten": ["2x+6"]
    },
    {
      "prompt": "Gib einen Term für den Flächeninhalt eines Kreises mit Radius $$r$$ an.",
      "antworten": ["pi*r^2"]
    }
  ]
}
```

- **`id`** (Pflicht): Lernstand und Punkte hängen am Block.
- **`aufgaben`** (1–12): je `prompt` (Markdown, Mathe-Notation mit
  `$$…$$` erlaubt) und `antworten` (1–8 akzeptierte Musterlösungen).
  Äquivalente Umformungen muss niemand listen – mehrere Einträge sind
  für WIRKLICH verschiedene akzeptierte Terme.
- **Schreibweise der `antworten`** (mathjs-ASCII, die Validierung prüft
  sie): Zahlen mit Dezimal-**Punkt**, Operatoren `+ - * / ^`, Klammern,
  die Funktionen `sqrt` `abs` `sin` `cos` `tan` `log` (natürlicher
  Logarithmus, `ln(…)` geht auch) `exp` sowie `pi` und `e`. **Kein
  Gleichheitszeichen** – Musterlösungen sind Terme, keine Gleichungen
  (statt `A = pi*r^2` nur `pi*r^2`; die Aufgabenstellung nennt die
  gesuchte Grösse). Implizite Multiplikation ist erlaubt (`2x`), aber
  **zusammengeschriebene Variablen sind EINE Variable**: `ab` ist die
  Variable «ab», ein Produkt heisst `a*b`. Zwei technische Grenzen
  (Schutz vor sekundenlangen Prüf-Blockaden, die Validierung lehnt
  Verstösse ab): höchstens **16 Verschachtelungs-Ebenen** und
  konstante Potenz-Exponenten bis Betrag **10 000** (`2^64` geht,
  `9^9^9` nicht; Variablen-Exponenten wie `x^n` sind frei).
- **Die Variablen der Aufgabe** ergeben sich aus den Musterlösungen:
  Eingaben mit anderen Variablen bekommen einen ehrlichen Hinweis
  («Die Variable ‹y› kommt in dieser Aufgabe nicht vor») und werden
  nicht gewertet.
- **Lernende dürfen natürlich schreiben**: `×`, `·`, `÷`, `:`,
  Dezimal-Komma, `²`/`³`, `√(…)`, `π` und `ln(…)` werden vor der
  Prüfung automatisch in die mathjs-Schreibweise übersetzt; die
  implizite Multiplikation (`2x`) versteht der Parser direkt.
- **Syntaktisch ungültige Eingaben werden NIE als falsch gewertet**:
  Sie blockieren das Prüfen und zeigen eine Korrektur-Aufforderung
  («Das ist noch kein lesbarer Term …», «Nach ‹sqrt› gehören
  Klammern») – gewertet wird erst, wenn alle Felder lesbar sind.
- **Wie geprüft wird**: symbolische Vereinfachung der Differenz
  (mathjs `simplify`; eine konstante Differenz entscheidet exakt),
  ergänzt durch deterministische numerische Stichproben an bis zu 80
  Pseudozufallspunkten, wo die Vereinfachung nicht eindeutig
  entscheidet. Äquivalenz gilt dabei **bis auf einzelne
  Definitionslücken** (CAS-Standard: `(x^2-1)/(x-1)` = `x+1` zählt
  als richtig).
- **Bewusste Grenze**: Geprüft wird Äquivalenz, nicht die Form – eine
  «Vereinfache …»-Aufgabe gilt auch als gelöst, wenn die unvereinfachte
  (äquivalente) Form eingegeben wird. Wer das vermeiden will,
  formuliert die Aufgabe so, dass der Zielterm hergeleitet werden muss
  (z. B. «Gib einen Term für … an») statt ihn abzudrucken.
- **Punkte**: ein Punkt pro Teilaufgabe; Auswertung/«Wiederholen» wie
  bei den übrigen prüfenden Blöcken. PRÜFENDER Block.
- Additive Ergänzung von Schema-Version 2 (11. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `audio` – Hörverstehen

Zwei Quellen, seit 3. August 2026 **kombinierbar** (mindestens eine
pro Block; Abspiel-Reihenfolge: Vorlesen bevorzugt → Datei →
Text/Hinweis):

1. **Vorlese-Variante** (`vorleseText` + `vorleseSprache`, seit
   2. August 2026) – der **bevorzugte** Weg, sobald das Gerät eine
   passende Stimme der angegebenen Sprache hat (BCP-47, z. B.
   `"en-GB"`): Der Browser liest den Text vor (die Automatik wählt nur
   **lokale** Stimmen), und die Lernenden können unter «Cates Stimmen»
   zwischen verschiedenen Stimmen und Aussprachevarianten wählen.
2. **Hinterlegte Hördatei** (`src`) – die **Rückfallebene**, wenn keine
   passende Stimme da ist oder die Vorlese-Ausgabe fehlschlägt (offline
   zuverlässig, feste Aussprache). Abspielsteuerung: Start/Pause,
   Fortschrittsleiste, «von vorn» und verlangsamte Wiedergabe (0.75× –
   wichtig für Fremdsprachen).

Steht beides nicht zur Verfügung, zeigt der Player den Text – bzw. bei
Höraufgaben (`transkriptAnzeigen: false`) einen ehrlichen Hinweis mit
dem Weg zu den Stimmen-Einstellungen («Cates Stimmen»). Beides
gemeinsam einzutragen ist der Idealzustand; ein Modul kann aber auch
zuerst nur mit Browser-Vorlesen erscheinen und die Aufnahme später
ergänzen, ohne die Aufgaben zu ändern.

```json
{
  "type": "audio",
  "id": "hoeren-1",
  "title": "Interview: Leben am Vulkan",
  "vorleseText": "Ich lebe seit vierzig Jahren am Fuss des Vulkans …",
  "vorleseSprache": "de-DE",
  "src": "/content/mein-modul/interview.mp3",
  "description": "Hör zu und achte darauf, welche zwei Gründe genannt werden.",
  "credit": "Aufnahme: …, CC BY-SA 4.0"
}
```

- **`title` ist PFLICHT**; sobald `src` dabei ist, zusätzlich
  **`credit`** (Quelle und Lizenz der Aufnahme).
- **Kombinierte Blöcke**: Aufnahme und `vorleseText` müssen
  **wortgleich** sein – die Lernenden sollen unabhängig vom
  Abspielweg dasselbe hören (nachfolgende Aufgaben fragen das
  Gehörte ab).
- **`transcript`** (Markdown) – nur für Blöcke mit `src` ALLEIN: das
  vollständige Transkript, dringend empfohlen (Barrierefreiheit!).
  Seit 2. August 2026 optional: Weglassen dort NUR bei Höraufgaben,
  bei denen die Lernenden das Gehörte selbst eintippen sollen. In
  **kombinierten** Blöcken (`src` + `vorleseText`, wie im Beispiel
  oben) übernimmt der `vorleseText` die Text-Rolle – ein zusätzliches
  `transcript` ist erlaubt, aber unnötig (drei wortgleiche Texte zu
  pflegen schafft nur Abweichungs-Risiko). Ohne `src` entfällt
  `transcript` – der `vorleseText` ist dort bereits der Text.
  **`transkriptAnzeigen`** (Standard `true`) blendet das Transkript
  bzw. den Vorlesetext bei Bedarf aus, ohne ihn zu löschen.
- **`src`**: Datei im **eigenen** Modulordner
  (`/content/<modul-id>/<datei>.mp3`, auch `.m4a`) – fremde Audio-Hosts
  gibt es nicht. Erlaubte Endungen und Maximalgrösse: siehe
  [`schema/whitelist.json`](schema/whitelist.json) (`audioExtensions`,
  `maxAudioSizeKB`).
- **Eigene Aufnahmen beisteuern**: Format `.mp3` oder `.m4a` (mono,
  64–96 kbit/s genügen für Sprache – so bleibt eine Minute unter 1 MB),
  Datei im selben Pull Request in den Modulordner hochladen (wie
  Bilder). Nur Aufnahmen mit geklärter Lizenz verwenden und den Nachweis
  in `credit` angeben; bei eigenen Aufnahmen mit erkennbaren Stimmen die
  Einwilligung der Sprechenden einholen.
- **Kein prüfender Block**: Die Auswertung übernehmen nachfolgende
  Aufgabenblöcke im selben Modul – ein Hörverstehen besteht typisch aus
  einem `audio`-Block plus Lückentext, Quiz oder Zuordnung direkt
  danach.
- **Achtung Rollout:** Ältere Player-Versionen lehnen Module mit den
  Feldern vom 2. August 2026 (`vorleseText`, `vorleseSprache`,
  `transkriptAnzeigen`) oder ohne `transcript` ab (kein Platzhalter –
  die Felder stecken im bestehenden Blocktyp). Solche Module erst
  einreichen, wenn die Plattform sie ausliefert.
- Additive Ergänzung von Schema-Version 2 (1. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `simulation` – verzweigter Rollenspiel-Dialog

Ein skriptiertes Gespräch mit einer Figur: Sie spricht Knoten für Knoten,
die Lernenden wählen aus 2–4 Antworten, und je nach Wahl verzweigt der
Dialog – bis zu einem Endpunkt. Der Block funktioniert **vollständig ohne
KI und ohne Internet** (alles steht im Skript); ist auf einem Gerät der
KI-Lernpartner Cate aktiviert, darf die Figur zusätzlich freie Rückfragen
beantworten – streng im Rahmen von `figur.rollenPrompt`, ohne den
skriptierten Pfad zu verändern.

```json
{
  "type": "simulation",
  "id": "sim1",
  "title": "Gespräch mit der Gemeindepräsidentin",
  "intro": "Optional: Szenario und Auftrag (Markdown).",
  "figur": {
    "name": "Frau Keller",
    "rolle": "Gemeindepräsidentin von Brienz",
    "rollenPrompt": "Optional, wird nie angezeigt: Wer ist die Figur, was weiss sie, wie spricht sie? Nur für freie KI-Rückfragen."
  },
  "start": "begruessung",
  "knoten": [
    {
      "id": "begruessung",
      "text": "Schön, dass du da bist! Was möchtest du wissen?",
      "antworten": [
        { "text": "Wie schützt ihr das Dorf vor Murgängen?", "weiter": "schutz" },
        { "text": "Warum zieht ihr nicht einfach weg?", "weiter": "wegzug" }
      ]
    },
    { "id": "schutz", "text": "…", "antworten": [ { "text": "…", "weiter": "ende" }, { "text": "…", "weiter": "wegzug" } ] },
    { "id": "wegzug", "text": "…", "antworten": [ { "text": "…", "weiter": "ende" }, { "text": "…", "weiter": "schutz" } ] },
    {
      "id": "ende",
      "text": "Danke für das Gespräch!",
      "auswertung": "Optional, nur auf Endknoten: Rückblick auf den gewählten Weg (Markdown)."
    }
  ],
  "abschlussfrage": {
    "id": "sim1-frage",
    "type": "single_choice",
    "prompt": "…",
    "options": [ { "text": "…", "correct": true }, { "text": "…" } ],
    "explanation": "…"
  }
}
```

Regeln:

- **`id`** (Pflicht, wie bei Lückentext/Quiz): Lernstand und Punkte
  hängen am Block.
- **`figur`**: `name` (Pflicht, wird angezeigt), optional `rolle`
  (angezeigte Kurzbeschreibung) und `rollenPrompt` (nie angezeigt; nur
  für die optionale KI-Anreicherung – ohne aktivierten Assistenten ohne
  Wirkung).
- **`knoten`**: Jeder Knoten hat eine blockinterne `id`, den Figurentext
  (`text`, Markdown) und entweder 2–4 `antworten` (je `text` +
  `weiter` = Ziel-Knoten-id) ODER keine – dann ist er ein **Endpunkt**
  und darf eine `auswertung` (Markdown) tragen. `start` nennt den
  Anfangsknoten. Die Validierung prüft: alle Verweise existieren, jeder
  Knoten ist vom Start aus erreichbar, mindestens ein Endpunkt ist
  erreichbar. Schleifen (zurück zu einem früheren Knoten) sind erlaubt.
- **`abschlussfrage`** (optional): eine einzelne Quiz-Frage (gleiche
  Fragetypen und Regeln wie im [Quiz](#quiz-type-quiz), Pflicht-`id`).
  Sie erscheint nach dem Erreichen eines Endpunkts und macht den Block
  zu einem [prüfenden Block](#prüfende-blöcke-und-modulabschluss)
  (Punkte, 100-%-Regel, Modulabschluss). **Ohne** Abschlussfrage ist der
  Block nicht prüfend – er zählt als bearbeitet, sobald ein Endpunkt
  erreicht wurde.
- Der Blocktyp ist eine **additive Ergänzung von Schema-Version 2**
  (31. Juli 2026) – ältere Player zeigen einen Platzhalter.

### `planspiel` – eingebettetes Lernspiel (nur EveryCate-Kernteam)

Ein eigenständiges interaktives Lernspiel (HTML/JS in einer einzigen
Datei im Modulordner), das der Player streng gekapselt in einem
sandbox-iframe ausführt – ohne Netzzugriff und ohne jeden Zugriff auf die
Plattform. **Dieser Blocktyp steht Lehrpersonen und externen Autorinnen
und Autoren NICHT offen:** Eingebetteter Code braucht eine technische
Sicherheitsprüfung, die nur das EveryCate-Kernteam im Review leisten
kann; entsprechende PRs werden abgelehnt. Er läuft ausserdem NUR in
Modulen aus diesem geprüften Repository – in lokal eingeladenen oder
geteilten Modulen zeigt der Player statt des Spiels einen Hinweis.

```json
{
  "type": "planspiel",
  "id": "spiel1",
  "title": "Handelssimulation",
  "intro": "Optional: Spielanleitung (Markdown).",
  "datei": "/content/mein-modul/spiel.html",
  "hoehe": 480
}
```

Regeln (erzwingt die Validierung):

- **`id`** (Pflicht): Der Lernstand merkt sich, dass das Spiel geöffnet
  wurde.
- **`datei`**: HTML-Datei im **eigenen** Modulordner, referenziert wie
  Bilder (`/content/<modul-id>/<datei>.html`). Höchstens
  `maxPlanspielSizeKB` (Whitelist; die Plattform setzt zusätzlich ein
  eigenes, nicht per Content-PR änderbares Hartlimit – eine Erhöhung des
  Whitelist-Werts darüber hinaus lässt den Plattform-Build bewusst
  scheitern), muss mit
  `<!doctype html><html><head>` beginnen (dort injiziert der Player
  seine Content-Security-Policy) und darf **keine externen Verweise**
  enthalten – kein `<script src>`, `<link>`, `<iframe>`, kein
  `fetch`/`XMLHttpRequest`/`WebSocket`, keine `http(s)://`-Ressourcen.
  Alles (Skripte, Styles, Grafiken als Daten-URIs) steckt in der einen
  Datei. `.html`-Dateien ohne referenzierenden Block sind ein Fehler.
- **`hoehe`** (optional): Höhe des Spielbereichs in Pixeln (240–1200,
  Standard 480).
- **Kein prüfender Block, keine Punkte:** Das Spiel zählt als
  bearbeitet, sobald es geöffnet wurde. Die inhaltliche Auswertung
  übernimmt ein nachgelagertes Quiz im selben Modul.
- Der Blocktyp ist eine **additive Ergänzung von Schema-Version 2**
  (31. Juli 2026) – ältere Player zeigen einen Platzhalter.

## Aufgaben-Varianten

Die Blocktypen [`lueckentext`](#lueckentext--lückentext-automatisch-geprüft),
[`zuordnung`](#zuordnung--paare-zuordnen-automatisch-geprüft),
[`numerisch`](#numerisch--zahleneingabe-automatisch-geprüft) und
[`term`](#term--mathematischen-term-eingeben-automatisch-geprüft) dürfen
neben ihrem normalen Inhalt (= **Variante A**) eine Liste `varianten`
mit weiteren, **vollständig ausformulierten** Fassungen tragen (B, C, …;
ab der 27. zweistellig AA, AB, …). Der Player zieht beim Öffnen des
Blocks zufällig eine Fassung und kennzeichnet sie dezent oben rechts
(«Variante B»); **«Wiederholen» zieht eine andere** – so bleibt die
Übung wiederholbar, ohne dass direkt dieselbe Aufgabe erscheint.

```json
{
  "type": "numerisch",
  "id": "num1",
  "title": "Rechne um",
  "aufgaben": [
    { "prompt": "Wie viele Meter sind 4,2 km?", "antworten": ["4200"], "einheit": "m" }
  ],
  "varianten": [
    {
      "aufgaben": [
        { "prompt": "Wie viele Meter sind 7,5 km?", "antworten": ["7500"], "einheit": "m" }
      ]
    }
  ]
}
```

Regeln:

- Jede Variante enthält den **kompletten Aufgabeninhalt** des Blocktyps
  (bei `numerisch`/`term`: `aufgaben`; bei `zuordnung`: `paare`; bei
  `lueckentext`: `modus` samt zugehörigen Feldern – und bei ALLEN vier
  Typen optional ein `intro`) – **fertig ausformuliert in der
  Moduldatei**. Es wird nichts
  zur Laufzeit berechnet oder generiert: keine Formelausdrücke, kein
  Code – Moduldateien bleiben reine Daten.
- **Gleiche Punktzahl in jeder Fassung** (gleich viele Lücken/Bausteine/
  Paare/Teilaufgaben) – die Validierung lehnt Abweichungen ab, denn der
  Lernstand zählt pro **Block**: Ergebnis, Punkte und Versuche werden
  wie bisher gespeichert; **welche Variante gezogen wurde, wird weder
  gespeichert noch an die Lehrperson übermittelt.**
- Ein `intro` gehört in JEDE Fassung, die es zeigen soll (Varianten
  erben nichts vom Hauptinhalt).
- Höchstens 49 zusätzliche Fassungen (50 gesamt).
- **Lehrer-Ansicht:** Die aufklappbare Musterlösung (nur mit gültiger
  Lehrer-Lizenz) zeigt ALLE Varianten mit Bezeichnung und Lösung – so
  lässt sich bei einer Schülerfrage zuordnen, welche Fassung vorliegt.
- **Bewusst ohne Varianten:** `tasks` (die Antworten gehen an die
  Lehrperson – unterschiedliche Fragen machten das Dashboard
  unbrauchbar), `quiz` (meist inhaltlicher Modulabschluss – alle
  beantworten dieselben Kernfragen), `simulation` und `planspiel`.
  Die Validierung lehnt ein `varianten`-Feld bei diesen Typen ab.
- Jede Variante wird von der PR-Validierung **einzeln** gegen alle
  Regeln des Blocktyps geprüft (parsebare Antworten, bekannte
  Einheiten, Bild-Regeln, Modus-Regeln …).

**Wann sind Varianten sinnvoll?** Bei Übungsaufgaben, in denen das
VERFAHREN zählt (umrechnen, ausmultiplizieren, Vokabeln und Begriffe
festigen, Ereignisse ordnen) – die Fassungen üben dasselbe mit anderem
Material. **Wann nicht?** Bei inhaltlichen Fragen, bei denen die Frage
selbst der Lerninhalt ist und alle Lernenden dieselbe beantworten
sollen – dort bleibt es bei einer Fassung (oder beim Quiz, das bewusst
keine Varianten kennt).

**Achtung Rollout:** Ältere Player lehnen Module MIT `varianten` hart
ab (kein Platzhalter) – solche Module erst NACH dem zugehörigen
Plattform-Deploy einreichen. Bestehende Module ohne Varianten bleiben
unverändert gültig.

## Mehrere Lehrpläne (`curricula`)

`curricula` ist seit Version 3 die EINZIGE Quelle für Fach, Stufe und
Kompetenzen. Ein Modul kann sich mehreren Lehrplänen zuordnen, ohne
dupliziert zu werden – die Startseite zeigt es unter jeder gewählten
Lehrplan-Auswahl mit dem DORT geltenden Fach und der dortigen Stufe,
und auch der Modulkopf folgt der Auswahl:

```json
"curricula": [
  {
    "curriculum": "ch",
    "subject": "RZG",
    "subjectName": "Räume, Zeiten, Gesellschaften",
    "grades": [7, 8, 9],
    "competencies": [
      { "code": "RZG.4.2.c", "description": "…" }
    ]
  },
  {
    "curriculum": "de",
    "subject": "Geschichte",
    "grades": [9]
  }
]
```

### Felder eines `curricula`-Eintrags

| Feld | Pflicht | Typ | Bedeutung |
|---|---|---|---|
| `curriculum` | ✅ | string | Lehrplan-Kennung: `li` (Liechtenstein, LiLe), `ch` (Schweiz, Lehrplan 21), `de` (Deutschland), `at` (Österreich). Das Format erlaubt künftige Untergliederungen (`de-he`, `ch-zh`); neue Kennungen brauchen einen Registry-Eintrag (`LEHRPLAENE` in `schema/schema.ts`). Je Lehrplan ist genau EIN Eintrag erlaubt. |
| `subject` | ✅ | string | Fachkürzel oder Fachname im Ziel-Lehrplan, z. B. `RZG`, `WP`, `Geschichte`. |
| `subjectName` | – | string | Ausgeschriebener Fachname, wenn `subject` ein Kürzel ist (Gruppierung im Katalog). |
| `grades` | (✅) | int[] (1–13) | **Klassenstufen als Zahlen**, z. B. `[9]` oder `[7, 8, 9]` – einheitlich für ALLE Lehrpläne (der frühere Zyklus-Begriff ist entfallen). Kein Freitext: `"7.–9. Klasse"` gehört NICHT hierhin. |
| `gradesText` | (✅) | string | **Stufen-Bezeichner.** Mit `grades`: das Wort vor der Zahl – nur setzen, wenn es vom Standard-Wort des Lehrplans abweichen soll («Stufe» bei `li`/`ch`, «Klasse» bei `de`/`at`; die Anzeige komponiert «Stufe 7–9», «Klasse 9»). Ohne `grades`: die alleinstehende Stufe für Module ohne Klassenstufe, z. B. `"Erwachsene"` – erscheint im Stufen-Filter als eigener Chip NACH allen Klassenstufen. Jeder Eintrag braucht `grades` und/oder `gradesText`. |
| `competencies` | – | Liste | Kompetenzverweise DIESES Lehrplans (`code` frei formatiert – andere Lehrpläne nummerieren anders als der Lehrplan 21 –, optional `description`). Die Modulseite zeigt unter den Lernzielen die Kompetenzen des Eintrags, der zur Lehrplan-Wahl gehört (ohne passenden Eintrag: die des ERSTEN, ehrlich mit dessen Lehrplan-Namen beschriftet); leere `competencies` lassen die Zeile entfallen – also in JEDEM Eintrag pflegen, in dem sie erscheinen sollen. |

Weitere Regeln:

- **Fehlt ein Lehrplan in der Liste, erscheint das Modul bei dieser
  Auswahl nicht** – dann gibt es das Fach dort schlicht nicht. Der
  Heimat-Lehrplan gehört also immer mit in die Liste.
- Die **Reihenfolge** der Liste ist die Anzeige-Reihenfolge der
  «alle Lehrpläne»-Zeile auf der Modulseite; Konvention:
  Registry-Reihenfolge `li`, `ch`, `de`, `at`.

### Von Version 1/2 nach 3 (Mapping)

| Alt (Top-Level bzw. `lehrplaene`-Eintrag) | Neu (`curricula`-Eintrag) |
|---|---|
| `curriculum: "LiLe"` bzw. `"lehrplan21"` / Kennungs-Schlüssel | `curriculum: "li"` bzw. `"ch"` / Kennung als Feld |
| `subject`/`subjectName` bzw. `fach`/`fachName` | `subject`/`subjectName` |
| `cycle`/`zyklus` (1–3) | `grades` mit den echten Klassenzahlen (Zyklus 3 → `[7, 8, 9]`; wenn der alte Freitext genauer war – «9. Klasse» –, dessen Zahlen: `[9]`) |
| `klassen: [9]` | `grades: [9]` |
| `grades`-Freitext / `stufeText` («7.–9. Klasse (Sek I)») | entfällt – die Zahlen stehen in `grades`, das Wort kommt vom Lehrplan (Zusätze wie «(Sek I)» entfallen) |
| `selbststudium: true` | `gradesText: "Erwachsene"` (ohne `grades`) |
| `competencies`/`kompetenzen` | `competencies` (unverändert; leere Listen weglassen) |

## Teilkompetenzen (`teilkompetenzen` + Ordner `kompetenzen/`)

Jeder Block darf optional das Feld `teilkompetenzen` tragen: eine Liste
von **höchstens 8 lehrplanunabhängigen Teilkompetenz-Kennungen** (je
max. 64 Zeichen, keine Duplikate), auf die der Block einzahlt. Das
Lehrer-Dashboard der Plattform leitet daraus je Schüler:in eine
Kompetenz-Übersicht ab (Abdeckung + Sicherheit) – rein zur Diagnose,
keine Bewertung.

```json
{
 "type": "quiz",
 "id": "quiz1",
 "title": "Quiz: Geldfunktionen",
 "teilkompetenzen": [
  "wp.geld.funktionen-erklaeren"
 ],
 "questions": ["…"]
}
```

Regeln und Konventionen:

- **Format der Kennung:** `<fachbereich>.<thema>.<verb-objekt>`, nur
  Kleinbuchstaben/Ziffern und Punkte als Trenner, Bindestriche ab dem
  zweiten Segment (z. B. `wp.geld.funktionen-erklaeren`).
- **Nur registrierte Kennungen:** Jede referenzierte Kennung muss im
  Register [`kompetenzen/teilkompetenzen.json`](kompetenzen/teilkompetenzen.json)
  stehen – sonst schlägt die Validierung fehl. Neue Kennung zuerst dort
  eintragen (eigener, reviewter PR oder derselbe PR).
- **Sinnvoll nur an Aufgaben-Blöcken:** Das Schema erlaubt das Feld auf
  jedem Blocktyp, wirksam wird es aber nur dort, wo die Plattform eine
  Bearbeitung nachweisen kann – an den prüfenden Blöcken (`quiz`,
  `lueckentext`, `zuordnung`, `numerisch`, `achse`, `term`, `simulation`
  mit Abschlussfrage) und an `tasks`-Blöcken. Auf `text`/`image`/
  `video`/`audio` bleibt es wirkungslos – dort bitte weglassen.
- **1–3 Kennungen je Block** haben sich bewährt: nur, was die Aufgaben
  des Blocks wirklich üben.
- **Kennungen sind stabil wie Block-ids:** Umbenennen zerreisst die
  Zuordnung – lieber eine neue Kennung anlegen.

### Systematik: So werden Teilkompetenzen zugeschnitten (verbindlich)

- **Granularitäts-Anker sind die Lehrplankompetenzen, nicht
  Modul-Quoten.** Es gibt keine feste Zahl Teilkompetenzen pro Modul.
  Leitfrage je Aufgabenblock: *Welche Lehrplankompetenz(en) übt dieser
  Block?* Teilkompetenzen dürfen dabei FEINER geschnitten sein als die
  Lehrplan-Zuordnung – Zweck der Schicht ist das Re-Mapping bei neuen
  Lehrplan-Versionen und anderen Ländern.
- **Thema = Stoffgebiet über Modulgrenzen hinweg** (`wp.markt.…` deckt
  die Module 6–8 ab, `wp.frieden.…` die Module 29–31). Kein
  Modul-Präfix, keine Modulnummern in Kennungen.
- **Merge bei gemeinsamer Prüfung:** Was dieselben Aufgaben gemeinsam
  prüfen, bleibt EINE Teilkompetenz (Ursachen + Eskalationsstufen +
  Akteure → `wp.frieden.konflikte-analysieren`).
- **Fachbereichs-Kennungen:** `wp` (Wirtschaft & Politik), `en`
  (Englisch als Sprache), `geschichte`, `geografie`, `informatik` –
  RZG ist ein Lehrplan-Konstrukt und wird in der lehrplanunabhängigen
  Schicht in Geschichte und Geografie getrennt.
- **Operator-Verben** (drittes Segment, `<verb-objekt>`): bewährtes Set
  ist unterscheiden, anwenden, beschreiben, vergleichen, zuordnen,
  erklären, einordnen, erkennen, analysieren, bauen, abwägen,
  beurteilen, verstehen, erstellen sowie – seit dem Voll-Ausbau
  bestätigt – **berechnen** und **begründen**. Sparsam erweitern; bei
  Sprach-Teilkompetenzen dürfen fertigkeitstypische Formulierungen das
  Verb stellen (`verfassen`, `sich-vorstellen`).
- **Niveau-Suffixe bei Sprachen:** Sprach-Teilkompetenzen tragen als
  Suffix des dritten Segments das GER-Niveau (`-a1`, `-a2`, `-b1` …),
  z. B. `en.hoeren.hoertexte-videos-verstehen-a2`. Das Niveau kommt aus
  den offiziellen Kompetenzstufen (FS1E-Stufen tragen GER-Etiketten)
  plus der Modul-Realität; gleiche Fertigkeit auf anderem Niveau =
  eigene Kennung. Die Themen-Ebene ist bei Sprachen die FERTIGKEIT
  (`hoeren`, `lesen`, `schreiben`, `wortschatz`, `grammatik`) – eine
  Fertigkeit erscheint erst, wenn ein Block sie wirklich prüft.
- **Landeskunde einfalten:** Länderspezifische Anteile (Finanzplatz
  Liechtenstein, EWR-Doppelrolle, Franken-Einführung) bekommen keine
  eigene Teilkompetenz, sondern gehören in die fachliche Teilkompetenz
  des Blocks (`wp.banken.kernaufgaben-zuordnen` trägt den Finanzplatz
  mit).
- **Quermodul-Verweise sparsam:** Ein Block darf Teilkompetenzen
  anderer Stoffgebiete tragen, wenn er sie ausdrücklich wieder übt
  (Debatten-Module nutzen `wp.argumentieren.argumente-bauen` weiter,
  ein Standort-Task den Argument-Bauplan). Repetitions- und
  Anwendungsmodule verwenden ausschliesslich bestehende Kennungen.

### Die zwei Tabellen im Ordner `kompetenzen/`

Bedeutung bekommen die Kennungen durch zwei Tabellen (Pflege per Pull
Request; ein `_hinweis`-Feld auf oberster Ebene wird ignoriert; beide
Dateien in Kanonform `JSON.stringify(inhalt, null, 1) + "\n"`):

- [`kompetenzen/teilkompetenzen.json`](kompetenzen/teilkompetenzen.json)
  – das **Register**: je Kennung ein Name als Kann-Formulierung (de/en),
  optional eine Beschreibung und der `fachbereich` (erstes
  Kennungs-Segment als Gruppierungswert).
- [`kompetenzen/mapping.json`](kompetenzen/mapping.json) – das
  **Mapping** auf die Kompetenz-Codes der einzelnen Lehrpläne (je
  Kennung ein Objekt `{"li": ["WAH.2.1"], "ch": ["WAH.2.1"]}`; nur
  registrierte Lehrpläne, 1–8 Codes je Liste). Eine Teilkompetenz darf
  mehreren Codes zuliefern, ein Code mehrere Teilkompetenzen bündeln.
  Lehrpläne ohne Eintrag zeigen die Teilkompetenz im Dashboard unter
  «ohne Zuordnung».

Register-Einträge ohne Verwendung oder ohne Mapping meldet
`npm run validate` als Hinweis (ℹ), nicht als Fehler. Das vollständige
Format samt Dashboard-Rechnung beschreibt `docs/KOMPETENZEN.md` im
Plattform-Repo.

## Prüfende Blöcke und Modulabschluss

Blöcke mit automatischer Auswertung heissen **prüfende Blöcke**. Welche
Blöcke prüfend sind, steht versioniert im Schema
([`schema/schema.ts`](schema/schema.ts), Funktion `istPruefenderBlock`):
`lueckentext` (alle Modi inkl. `satzbau`), `quiz`, `zuordnung`,
`numerisch`, `achse` und `term` immer, `simulation` genau dann, wenn der Block
eine [`abschlussfrage`](#simulation--verzweigter-rollenspiel-dialog)
trägt. Künftige auto-geprüfte Aufgabentypen werden dort eingetragen und
zählen dann automatisch.

- Ein Modul gilt als **bestanden**, wenn **alle prüfenden Blöcke
  100 % erreicht** haben – jeder Lückentext (alle Lücken richtig) und
  jeder Quizblock (alle Punkte). Auch das Quiz selbst
  meldet «bestanden» erst bei 100 %; darunter zeigt es neutral
  «X % – noch nicht bestanden» mit Wiederholen-Möglichkeit.
  Wiederholen ist unbegrenzt möglich; es zählt der beste je erreichte
  Versuch. **Beim ersten Bestehen des Moduls gibt es Coins** (genau
  einmal). Quiz und prüfende Blöcke zählen **gleichwertig** in
  Abschluss, Punkte und Lernrate.
- **Punkte gibt es unabhängig davon** für jeden Aufgabenblock einzeln
  (ein Punkt pro richtiger Frage bzw. Lücke, gespeichert wird der beste
  Versuch) – auch wenn das Modul noch nicht vollständig bestanden ist.
- Ein Modul braucht **kein Quiz mehr**: Ein Modul, das mit einem
  Lückentext endet oder nur aus Lückentexten besteht (z. B. ein
  Vokabeltest), ist genauso abschliessbar.
- Enthält ein Modul **gar kein prüfendes Element** (reines Lesemodul),
  gilt es als abgeschlossen, sobald die Inhalte bis zum Ende durchgesehen
  wurden – bewusst ohne Coins (Coins belohnen nachgewiesenes Beherrschen).
- Die `id` `"quiz"` ist für **Quizblöcke** reserviert (Lernstand-Schlüssel
  des früheren Abschlussquiz; migrierte Module behalten so ihren
  Fortschritt) – andere prüfende Blöcke dürfen sie nicht tragen (die
  Validierung lehnt das ab).

### Zukünftige Blocktypen (`chat`, …)

Das Format ist offen für kommende Player-Funktionen: Ein Block mit noch
nicht implementiertem `type` wird vom Player als Platzhalter («wird noch
nicht unterstützt») angezeigt. In diesem Repository akzeptiert die
Validierung solche Blöcke nur, wenn der Typ in
[`schema/whitelist.json`](schema/whitelist.json) unter `futureBlockTypes`
freigegeben ist (aktuell `chat`), z. B.:

```json
{ "type": "chat", "persona": "tutor", "systemPrompt": "Du hilfst bei …" }
```

*(`simulation` war bis Juli 2026 ein solcher Zukunftstyp und ist seit dem
31. Juli 2026 ein
[echter Blocktyp](#simulation--verzweigter-rollenspiel-dialog) mit
eigener Detail-Validierung.)*

**Neuen Blocktyp implementieren** (passiert im Plattform-Repository
`everycate`): (1) Schema in `src/lib/content/schema.ts` ergänzen
(discriminatedUnion + `KNOWN_BLOCK_TYPES`), (2) Komponente unter
`src/components/blocks/` bauen, (3) in `src/components/BlockRenderer.tsx`
registrieren, (4) hier `schema/schema.ts` nachziehen und diese Doku
ergänzen.

## Quiz (`type: "quiz"`)

Seit Schema-Version 2 ein regulärer Inhaltsblock: Er darf **beliebig oft
und an beliebiger Position** in `blocks` stehen (z. B. ein kurzes Quiz
nach jedem Kapitel) und wird pro Block einzeln ausgewertet (Prozent,
Punkte, Versuche). Jeder Quizblock braucht eine eigene stabile `id`.

```json
{
  "type": "quiz",
  "id": "quiz-kapitel-1",
  "title": "Teste dein Wissen",
  "intro": "Optionale Einleitung (Markdown).",
  "questions": [ … ]
}
```

*(Version 1 kannte stattdessen das Sonderfeld `quiz` auf Modulebene –
solche Dateien bleiben gültig und werden beim Einlesen migriert. Das
dortige Feld `passingScorePercent` ist **veraltet**: Der Player wertet es
seit Juli 2026 nicht mehr aus – bestanden ist ein Aufgabenblock
einheitlich erst bei 100 %.)*

Drei Fragetypen; alle haben eine **stabile `id` (Pflicht** – die
Validierung erzwingt sie; der Lernstand speichert Statistiken pro Frage,
und ohne id würden sie bei Umsortierungen vermischt), `prompt` (Markdown),
optional `explanation` (wird nach dem Beantworten angezeigt – bitte immer
angeben, das ist der Lernmoment!) und `points` (ganzzahlig, 1–100;
Standard 1):

```json
{
  "id": "q1",
  "type": "single_choice",
  "prompt": "Frage …",
  "options": [
    { "text": "Antwort A", "correct": true },
    { "text": "Antwort B" }
  ],
  "explanation": "Darum ist A richtig …"
}
```

```json
{
  "id": "q2",
  "type": "multiple_choice",
  "prompt": "Welche Aussagen stimmen?",
  "options": [
    { "text": "…", "correct": true },
    { "text": "…", "correct": true },
    { "text": "…" }
  ],
  "explanation": "…",
  "points": 2
}
```

```json
{
  "id": "q3",
  "type": "true_false",
  "prompt": "Aussage, die stimmt oder nicht.",
  "answer": false,
  "explanation": "…"
}
```

Regeln:

- `single_choice`: **genau eine** Option mit `correct: true`.
- `multiple_choice`: **mindestens eine** korrekte Option; volle Punktzahl nur
  bei exakt richtiger Auswahl.
- 4–8 Fragen pro Modul sind ein guter Richtwert; Distraktoren (falsche
  Optionen) plausibel formulieren.

## Übersetzungen: Master und Sprachfassungen (seit 18.8.2026)

Jedes Modul hat genau **einen inhaltlichen Master** (`module.json`).
Sprachfassungen liegen als `module.<lang>.json` im selben Ordner und
werden **automatisch erzeugt** – nie von Hand schreiben oder ändern
(die Validierung lehnt das ab). Drei Felder gehören dazu:

- `languageLearning: true` am **Master** kennzeichnet Sprachlernmodule
  (z. B. die Englischmodule): Die Sprache ist Lerngegenstand, solche
  Module werden nie übersetzt.
- `_hinweis` und `derivedFrom` stehen **nur in Sprachfassungen**
  (sichtbare Warnung + Herkunfts-Stempel mit Prüfsummen) – das
  Übersetzungswerkzeug setzt sie selbst.

Sprachfassungen müssen dem Master strukturell exakt entsprechen
(gleiche Blöcke, ids und Punktzahlen – Lernstand und Reports bleiben
EIN Modul); übersetzt werden nur Textfelder. Ablauf, Befehle und
Korrektur-Weg: [`UEBERSETZUNG.md`](UEBERSETZUNG.md).

## Checkliste für KI-Autoren

1. Gültiges JSON, `schemaVersion: 3`, `id` = Ordnername.
2. `curricula` mit mindestens einem Eintrag: Lehrplan-Kennung, Fach,
   Klassenstufen als **Zahlen** in `grades` (Module ohne Klassenstufe:
   nur `gradesText`, z. B. `"Erwachsene"`) und die Kompetenzverweise
   des jeweiligen Lehrplans in `competencies`.
3. Lernziele als «Ich kann …»-Sätze.
4. Blöcke abwechslungsreich sequenzieren: kurzer Einstiegstext → Video oder
   Bild → vertiefender Text → Lückentext und/oder Aufgaben → Quiz; gern
   auch mehrere kleine Quizze zwischen den Kapiteln statt eines grossen.
5. Nur lizenzrechtlich unbedenkliche Bilder/Videos einbetten und Quellen in
   `sources`/`credit` ausweisen; Video-Provider und Bild-Hosts müssen der
   Whitelist entsprechen.
6. Jeden Quizblock und jede Quizfrage mit eindeutiger `id` versehen und
   Fragen mit `explanation` ergänzen.
7. Zum Schluss `npm run validate` laufen lassen (oder das Modul gegen
   `schema/schema.ts` prüfen).

Ein vollständiges Beispiel mit allen Blocktypen liegt unter
[`modules/demo-blockformat/module.json`](modules/demo-blockformat/module.json).

# EveryCate Content-Schema (Version 2)

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
  "schemaVersion": 2,
  "id": "mein-modul",
  "title": "Titel des Moduls",
  "description": "1–3 Sätze für den Katalog.",
  "subject": "RZG",
  "subjectName": "Räume, Zeiten, Gesellschaften",
  "cycle": 3,
  "grades": "7.–9. Klasse (Sek I)",
  "language": "de",
  "competencies": [
    { "code": "RZG.4.2.c", "description": "…" }
  ],
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
| `schemaVersion` | ✅ | `2` | Version dieses Formats. Aktuell `2`; Version-1-Dateien bleiben gültig (automatische Migration, siehe Versionsgeschichte). |
| `id` | ✅ | string | Slug, identisch mit dem Ordnernamen. |
| `title` | ✅ | string | Modultitel. |
| `description` | ✅ | string | Kurzbeschreibung für den Katalog (1–3 Sätze). |
| `subject` | ✅ | string | Fachkürzel nach Lehrplan 21, z. B. `RZG`, `NT`, `D`, `MA`, `NMG`. |
| `subjectName` | – | string | Ausgeschriebener Fachname (Gruppierung im Katalog). |
| `cycle` | ✅ | `1 \| 2 \| 3` | Lehrplan-21-Zyklus. `3` = Sekundarstufe I. |
| `grades` | – | string | Freitext-Stufe, z. B. `"7.–9. Klasse (Sek I)"`. |
| `sequenz` | – | int > 0 | Lernreihenfolge innerhalb des Fachs bzw. der Einheit (`1` = zuerst). Der Katalog sortiert danach – unabhängig vom Dateinamen; Module ohne Wert folgen alphabetisch nach Titel. |
| `einheit` | – | string (≤ 120) | Themengruppe/Einheit, wenn mehrere Module eine Reihe bilden (z. B. `"Themenblock A: Grundbegriffe und Wirtschaftskreislauf"`). Module mit identischem Wert fasst der Katalog sichtbar als Lernpfad zusammen. |
| `language` | – | string | BCP-47-Code, Standard `"de"`. **Zielsprache des Moduls:** Bei Fremdsprachenmodulen (z. B. `"en"` für Englisch) stehen die Inhalte in dieser Sprache, und der KI-Lernpartner Cate antwortet bei Aufgaben-Rückmeldungen und Rückfragen ebenfalls darin (einfach, dem Sprachniveau der Stufe angemessen). |
| `curriculum` | – | string | Lehrplan-Referenzrahmen für `cycle`/`competencies`, Standard `"lehrplan21"`. Wird beim Modul als Badge angezeigt; die Plattform selbst ist lehrplanneutral. |
| `competencies` | – | Liste | Lehrplan-21-Kompetenzcodes (`code` im Format `FACH.x.y.z`, z. B. `RZG.4.2.c`; optional `description`). |
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

Jeder Block hat ein `type`-Feld sowie optional `id` (stabile Referenz) und
`title` (Zwischenüberschrift). In allen als *Markdown* markierten Feldern ist
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
Begriff–Beispiel. Die linke Spalte steht fest, die rechten Elemente
(plus Ablenker) erscheinen gemischt; zugeordnet wird per Drag-and-Drop
oder Antippen (erst der Platz, dann das Element).

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
  ],
  "ablenker": [{ "text": "Passt zu keinem Paar." }]
}
```

- **`id`** (Pflicht): Lernstand und Punkte hängen am Block.
- **`paare`** (2–12): Jedes Element hat entweder `text` ODER `bild`
  (genau eines). Bilder brauchen `src` (Modulordner oder freigegebener
  Host, gleiche Regeln wie der [Bild-Block](#image--bild)), `alt` und
  `credit` – Quelle/Lizenz sind hier PFLICHT und erscheinen gesammelt
  unter dem Block.
- **`ablenker`** (optional, max. 6): zusätzliche RECHTE Elemente ohne
  Partner. Alle rechten Elemente (inkl. Ablenker) müssen unterscheidbar
  sein (die Validierung lehnt doppelte Anzeigetexte ab).
- **Punkte**: ein Punkt pro korrektem Paar; Prozent-/Punkteanzeige und
  «Wiederholen» wie bei Quiz und Lückentext. PRÜFENDER Block (zählt zum
  Modulabschluss).
- Additive Ergänzung von Schema-Version 2 (1. August 2026) – ältere
  Player zeigen einen Platzhalter.

### `audio` – Hörverstehen

Eine im Modulordner hinterlegte Hördatei (kein Text-to-Speech zur
Laufzeit) mit Abspielsteuerung: Start/Pause, Fortschrittsleiste, «von
vorn» und verlangsamte Wiedergabe (0.75× – wichtig für Fremdsprachen).

```json
{
  "type": "audio",
  "id": "hoeren-1",
  "title": "Interview: Leben am Vulkan",
  "src": "/content/mein-modul/interview.mp3",
  "description": "Hör zu und achte darauf, welche zwei Gründe genannt werden.",
  "transcript": "Pflicht (Markdown): das vollständige Transkript der Aufnahme.",
  "credit": "Aufnahme: …, CC BY-SA 4.0"
}
```

- **`title`, `transcript`, `credit` sind PFLICHT**: Überschrift, das
  vollständige Transkript (barrierefrei und zum Nachlesen) sowie Quelle
  und Lizenz der Aufnahme.
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

## Prüfende Blöcke und Modulabschluss

Blöcke mit automatischer Auswertung heissen **prüfende Blöcke**. Welche
Blöcke prüfend sind, steht versioniert im Schema
([`schema/schema.ts`](schema/schema.ts), Funktion `istPruefenderBlock`):
`lueckentext` (alle Modi inkl. `satzbau`), `quiz` und `zuordnung` immer,
`simulation` genau dann, wenn der Block eine
[`abschlussfrage`](#simulation--verzweigter-rollenspiel-dialog)
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

## Checkliste für KI-Autoren

1. Gültiges JSON, `schemaVersion: 2`, `id` = Ordnername.
2. Fach, Zyklus und Kompetenzcodes am **Lehrplan 21** ausrichten
   (Codes im Format `FACH.x.y.z`, z. B. `RZG.4.2.c`).
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

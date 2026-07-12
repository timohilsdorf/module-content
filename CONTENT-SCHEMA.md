# EveryCate Content-Schema (Version 1)

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
  (auch für Markdown-Bilder in Textfeldern), kein Roh-HTML in Textfeldern,
  Existenz/Endung/Grösse der Bilddateien, maximale Grösse der
  `module.json` (`maxModuleJsonKB`), Eindeutigkeit von IDs, Pflicht-`id`
  bei Quizfragen und saubere Modulordner (nur `module.json` + Bilder,
  keine Symlinks). `requires`-Verweise auf (noch) nicht existierende
  Module ergeben nur einen Hinweis, keinen Fehler – Slug trotzdem auf
  Tippfehler prüfen.

## Aufbau eines Moduls

```json
{
  "schemaVersion": 1,
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
  "blocks": [ … ],
  "quiz": { … }
}
```

### Metadaten-Felder

| Feld | Pflicht | Typ | Bedeutung |
|---|---|---|---|
| `schemaVersion` | ✅ | `1` | Version dieses Formats. Aktuell immer `1`. |
| `id` | ✅ | string | Slug, identisch mit dem Ordnernamen. |
| `title` | ✅ | string | Modultitel. |
| `description` | ✅ | string | Kurzbeschreibung für den Katalog (1–3 Sätze). |
| `subject` | ✅ | string | Fachkürzel nach Lehrplan 21, z. B. `RZG`, `NT`, `D`, `MA`, `NMG`. |
| `subjectName` | – | string | Ausgeschriebener Fachname (Gruppierung im Katalog). |
| `cycle` | ✅ | `1 \| 2 \| 3` | Lehrplan-21-Zyklus. `3` = Sekundarstufe I. |
| `grades` | – | string | Freitext-Stufe, z. B. `"7.–9. Klasse (Sek I)"`. |
| `language` | – | string | BCP-47-Code, Standard `"de"`. |
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
| `blocks` | ✅ | Block[] | Inhaltsblöcke in Anzeigereihenfolge, mind. 1. |
| `quiz` | – | Quiz | Abschlussquiz mit automatischer Auswertung. |

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
  Direkte Video-Datei-URLs (`provider: "url"`) sind nur zulässig, wenn der
  Host dort unter `videoUrlHosts` freigegeben ist (derzeit keiner).
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

## Prüfende Blöcke und Modulabschluss

Blöcke mit automatischer Auswertung heissen **prüfende Blöcke**. Welche
Typen prüfend sind, steht versioniert im Schema
([`schema/schema.ts`](schema/schema.ts), Konstante `PRUEFENDE_BLOCK_TYPES`
– aktuell `lueckentext`); künftige auto-geprüfte Aufgabentypen werden dort
eingetragen und zählen dann automatisch.

- Ein Modul gilt als **bestanden**, wenn **alle prüfenden Elemente
  100 % erreicht** haben – jeder Lückentext (alle Lücken richtig) und,
  falls vorhanden, das Abschlussquiz (alle Punkte). Auch das Quiz selbst
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
- Der Schlüssel `"quiz"` ist für das Abschlussquiz reserviert – prüfende
  Blöcke dürfen ihn nicht als `id` tragen (die Validierung lehnt das ab).

### Zukünftige Blocktypen (`simulation`, `chat`, …)

Das Format ist offen für kommende Player-Funktionen: Ein Block mit noch
nicht implementiertem `type` wird vom Player als Platzhalter («wird noch
nicht unterstützt») angezeigt. In diesem Repository akzeptiert die
Validierung solche Blöcke nur, wenn der Typ in
[`schema/whitelist.json`](schema/whitelist.json) unter `futureBlockTypes`
freigegeben ist (aktuell `simulation` und `chat`), z. B.:

```json
{ "type": "simulation", "engine": "physik-federpendel", "params": { "masse": 2 } }
{ "type": "chat", "persona": "tutor", "systemPrompt": "Du hilfst bei …" }
```

**Neuen Blocktyp implementieren** (passiert im Plattform-Repository
`everycate`): (1) Schema in `src/lib/content/schema.ts` ergänzen
(discriminatedUnion + `KNOWN_BLOCK_TYPES`), (2) Komponente unter
`src/components/blocks/` bauen, (3) in `src/components/BlockRenderer.tsx`
registrieren, (4) hier `schema/schema.ts` nachziehen und diese Doku
ergänzen.

## Quiz (`quiz`)

```json
{
  "title": "Teste dein Wissen",
  "questions": [ … ]
}
```

*(Das frühere Feld `passingScorePercent` ist **veraltet**: Der Player
wertet es seit Juli 2026 nicht mehr aus – bestanden ist ein Aufgabenblock
einheitlich erst bei 100 %. Module mit dem Feld bleiben gültig.)*

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

1. Gültiges JSON, `schemaVersion: 1`, `id` = Ordnername.
2. Fach, Zyklus und Kompetenzcodes am **Lehrplan 21** ausrichten
   (Codes im Format `FACH.x.y.z`, z. B. `RZG.4.2.c`).
3. Lernziele als «Ich kann …»-Sätze.
4. Blöcke abwechslungsreich sequenzieren: kurzer Einstiegstext → Video oder
   Bild → vertiefender Text → Lückentext und/oder Aufgaben → Quiz.
5. Nur lizenzrechtlich unbedenkliche Bilder/Videos einbetten und Quellen in
   `sources`/`credit` ausweisen; Video-Provider und Bild-Hosts müssen der
   Whitelist entsprechen.
6. Jede Quizfrage mit eindeutiger `id` und `explanation` versehen.
7. Zum Schluss `npm run validate` laufen lassen (oder das Modul gegen
   `schema/schema.ts` prüfen).

Ein vollständiges Beispiel mit allen Blocktypen liegt unter
[`modules/demo-blockformat/module.json`](modules/demo-blockformat/module.json).

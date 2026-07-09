# EveryCate Content-Schema (Version 1)

Dieses Dokument beschreibt das dateibasierte Format für Lernmodule –
vollständig genug, dass **Menschen und KIs** damit eigenständig gültige
Module erstellen können. Die maschinenlesbare Referenz (Zod-Schema) liegt in
[`schema/schema.ts`](schema/schema.ts); bei Widersprüchen gilt das
Zod-Schema. *(Das Schema ist eine synchron gehaltene Kopie aus dem
Plattform-Repository, wo es beim Build erzwungen wird.)*

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
  und Bild-Hosts laut [`schema/whitelist.json`](schema/whitelist.json),
  kein Roh-HTML in Textfeldern, Existenz und Endung der Bilddateien,
  Eindeutigkeit von IDs, Pflicht-`id` bei Quizfragen, `requires`-Verweise
  und saubere Modulordner (nur `module.json` + Bilder).

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
| `license` | – | string | Lizenz der Inhalte, z. B. `"CC BY-SA 4.0"`. |
| `requires` | – | string[] | Slugs vorausgesetzter Module (für spätere Lernpfade). |
| `blocks` | ✅ | Block[] | Inhaltsblöcke in Anzeigereihenfolge, mind. 1. |
| `quiz` | – | Quiz | Abschlussquiz mit automatischer Auswertung. |

## Inhaltsblöcke (`blocks`)

Jeder Block hat ein `type`-Feld sowie optional `id` (stabile Referenz) und
`title` (Zwischenüberschrift). In allen als *Markdown* markierten Feldern ist
GitHub Flavored Markdown erlaubt (Absätze, Listen, Tabellen, Links, `**fett**`).
**Roh-HTML ist nicht erlaubt** – der Player rendert es nicht, und die
Validierung weist es zurück.

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
- Erlaubte Endungen: siehe [`schema/whitelist.json`](schema/whitelist.json)
  (`imageExtensions`, z. B. `.jpg`, `.png`, `.webp`).
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
  (YouTube: 6–20 Zeichen aus `A–Z a–z 0–9 _ -`; Vimeo: nur Ziffern).
  Die Validierung weist ganze URLs zurück.
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
  "passingScorePercent": 60,
  "questions": [ … ]
}
```

Drei Fragetypen; alle haben eine **stabile `id` (Pflicht** – die
Validierung erzwingt sie; der Lernstand speichert Statistiken pro Frage,
und ohne id würden sie bei Umsortierungen vermischt), `prompt` (Markdown),
optional `explanation` (wird nach dem Beantworten angezeigt – bitte immer
angeben, das ist der Lernmoment!) und `points` (Standard 1):

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
   Bild → vertiefender Text → Aufgaben → Quiz.
5. Nur lizenzrechtlich unbedenkliche Bilder/Videos einbetten und Quellen in
   `sources`/`credit` ausweisen; Video-Provider und Bild-Hosts müssen der
   Whitelist entsprechen.
6. Jede Quizfrage mit eindeutiger `id` und `explanation` versehen.
7. Zum Schluss `npm run validate` laufen lassen (oder das Modul gegen
   `schema/schema.ts` prüfen).

Ein vollständiges Beispiel mit allen Blocktypen liegt unter
[`modules/demo-blockformat/module.json`](modules/demo-blockformat/module.json).

# Konventionen für neue Englisch-Module

Stand: 19. August 2026 · verifiziert gegen `schema/schema.ts` (Schema v3, `SCHEMA_VERSION = 3`),
`schema/validate.ts`, `CONTENT-SCHEMA.md`, `CONTENT-ERSTELLEN.md`, die fünf bestehenden
Englisch-Module (`englisch-01` … `englisch-05`) und das Katalog-Verhalten der Live-Plattform
(everycate.com). Bei Widersprüchen zwischen diesem Dossier und dem Zod-Schema gilt das Schema.

Dieses Dossier bündelt alles, was für ein neues Englisch-Modul nötig ist – Struktur, Schema,
Blocktypen, Qualitätsregeln, Validierung – und schließt mit einem validierten Minimalbeispiel.

---

## 1. Repo- und Modulstruktur

- **Ein Modul = ein Ordner** unter `modules/`. Ordnername = Slug = Feld `id` im JSON
  (Regex `^[a-z0-9][a-z0-9-]*$`; `validate.ts` erzwingt `id` == Ordnername).
- Im Ordner: `module.json` (Master, UTF-8, max. 1024 KB) plus Medien direkt daneben
  (Bilder `.png/.jpg/.jpeg/.webp/.avif/.gif` ≤ 4096 KB, Audio `.mp3/.m4a` ≤ 8192 KB,
  eigene Videos `.mp4/.webm` ≤ 8192 KB). Keine Unterordner, keine Symlinks.
- Referenziert wird immer als **`/content/<modul-id>/<datei>`** – nie relativ, nie fremder Host
  (Ausnahme Bilder: `https://upload.wikimedia.org/…` ist als einziger Remote-Host erlaubt).
- Sprachfassungen `module.<lang>.json` erzeugt ausschließlich das Übersetzungswerkzeug.
  **Englisch-Module tragen `"languageLearning": true` und werden nie übersetzt** – das Feld
  fehlt (Stand heute) in der Metadaten-Tabelle von CONTENT-SCHEMA.md und in der
  Prompt-Vorlage von CONTENT-ERSTELLEN.md, ist aber gültig und bei allen fünf
  Bestands-Modulen gesetzt.
- Benennungskonvention der Ordner: `<reihe>-<zweistellige-nr>-<thema>`
  (z. B. `englisch-03-watch-or-see`). Die Nummer im Ordnernamen ist reine Lesbarkeit –
  sortiert wird im Katalog nach `sequenz` (siehe Abschnitt 4).

## 2. Metadatenfelder (Schema v3)

Unbekannte Feldnamen sind ein Validierungsfehler (strikte Objekte). Pflichtfelder: ✅.

| Feld | Pflicht | Inhalt / Konvention Englisch |
|---|---|---|
| `schemaVersion` | ✅ | Literal `3` – das Repo nimmt nichts anderes mehr an |
| `id` | ✅ | Slug, identisch mit Ordnernamen |
| `title` | ✅ | Englisch; eigenständig, **kein Unit-Titel eines Lehrmittels** (Abschnitt 9.4) |
| `description` | ✅ | **Englisch** (bei `language: "en"`), 1–3 Sätze, ~300–350 Zeichen; nur Inhalt («Worum geht es?»). **Verboten: Modulnummern, Schulwochen, Schulstufen, Lernjahre, Zug-Angaben, Themenblock-Buchstaben.** Sprachniveau («Level A1») ist erlaubt und üblich |
| `curricula` | ✅ | mind. 1 Eintrag; einzige Quelle für Fach/Stufe/Kompetenzen (Abschnitt 3) |
| `sequenz` | empfohlen | Position im Lernpfad; wird im Katalog als Nummer angezeigt (Abschnitt 4) |
| `einheit` | empfohlen | Deutscher Lernpfad-Name (≤ 120 Zeichen); gleicher Wert = ein Lernpfad-Kasten im Katalog |
| `language` | ✅ (Konvention) | `"en"` – Zielsprache; ohne das Feld greift Default `"de"` und Cate (der KI-Lernpartner) antwortet deutsch |
| `languageLearning` | ✅ (Konvention) | `true` bei jedem Englisch-Modul |
| `learningObjectives` | ✅ | 3–4 englische «I can …»-Sätze, ohne deutsche Übersetzungsklammern (fachliche Klammern wie «(to)», «(80–120 words)» sind ok) |
| `durationMinutes` | empfohlen | bisher durchgängig `45` |
| `difficulty` | empfohlen | `"leicht"` / `"mittel"` / `"anspruchsvoll"` |
| `keywords` | empfohlen | englische + ggf. deutsche Schlagwörter |
| `authors` | empfohlen | z. B. `["Anna Rinderer"]` |
| `sources` | empfohlen | Liste `{title, url?}` – u. a. LiLe-Eintrag (https://www.lile.li bzw. fl.lehrplan.ch) |
| `license` | empfohlen | `"CC BY-SA 4.0"` (Repo-Standard) |
| `requires` | optional | Slugs vorausgesetzter Module; Verweis auf noch nicht existierende Module ist nur ein Hint |
| `blocks` | ✅ | mind. 1 Block (Abschnitt 5) |

**Sprachverteilung im Englisch-Modul:** Sämtliche Inhalte, Instruktionen, Intros, Hints,
Musterlösungen und Quiz-`explanation`s auf Englisch. Deutsch bleiben nur: `einheit`
(Katalog-Label), `credit`-Felder, LiLe-Kompetenztexte (verbatim) und gezielte didaktische
Glossen (deutsche Übersetzungen in Vokabel-Zuordnungen, Klammer-Glossen in Alt-Texten).

**Zusatzregel Stufe-7-Strang (A1, `englisch-stufe7-…`):** Der Welcome-Block ist deutsch
(bewusster Entscheid für den Wiedereinstieg aus der Primarschule); alle übrigen Erklär-,
Übungs- und Lösungstexte stehen in **einfachem A1-Englisch mit deutschen Glossen**
(«**to be** means **sein** in German», Pronomen-Glossen «I (ich)» in Tabellen). Der
A2–B1-Strang (`englisch-01…05`) bleibt durchgängig englisch.

## 3. Lehrplanbezug (`curricula`) und LiLe

Registrierte Lehrplan-Kennungen: `li`, `ch`, `de`, `at` – je Lehrplan genau ein Eintrag,
Reihenfolge = Anzeige-Reihenfolge (Konvention: li zuerst; Heimat-Lehrplan `li` immer eintragen,
sonst erscheint das Modul bei LiLe-Auswahl nicht). Felder je Eintrag: `curriculum` ✅,
`subject` ✅ (Englisch: `"E"`), `subjectName` (`"Englisch"`), `grades` (int-Array 1–13, z. B.
`[7]` – angezeigt als «Stufe 7»), `gradesText` (nur für Sonderfälle wie `"Erwachsene"`),
`competencies` (Liste `{code, description?}`).

**Kompetenz-Codes:** Das `code`-Format ist in v3 **frei** (1–60 Zeichen) – die alte
LP21-Regex existiert nur noch im Legacy-Schema. **FS1E-Codes sind damit direkt gültig**
(`"code": "FS1E.2.A.1"`); der frühere Workaround (`code: "E.2.A.1"` + FS1E-Code nur im
Beschreibungstext) ist obsolet. Die Bestands-Module 1–5 tragen noch den alten Stil –
für neue Module gilt: **FS1E-Code direkt ins `code`-Feld**, `description` beginnt verbatim
mit dem Code und dem LiLe-Wortlaut. LiLe-Nummerierung und -Wortlaut werden wörtlich von
fl.lehrplan.ch übernommen und von Anna auf lile.li geprüft, bevor ein PR gemerged wird.

## 4. Lernpfade: `einheit`, `sequenz` und neue Stränge

Verifiziert am ausgelieferten Katalog-Code der Live-Plattform (Stand 19.08.2026):

- Sortierung pro Fach: `sequenz` aufsteigend (Module ohne `sequenz` ganz hinten),
  Tie-Break alphabetisch nach Titel.
- Danach Gruppierung nach `einheit` über eine Map: **eine Einheit bleibt immer ein
  zusammenhängender Kasten**, auch wenn sich `sequenz`-Bereiche zweier Einheiten
  überlappen. Reihenfolge der Kästen = erstes Auftreten in der Sortierung.
- **Die im Lernpfad angezeigte Nummer ist der rohe `sequenz`-Wert** (WP-Themenblock B
  beginnt sichtbar mit «6»).

Konsequenzen:

- Innerhalb **eines** Strangs (eine Jahrgangs-Reihe): `sequenz` fortlaufend, `einheit`
  wechselt pro Themenblock (WP-Praxis: 1–31 über sechs Blöcke).
- Ein **neuer Strang für eine andere Stufe** (z. B. Stufe 7) bekommt eine **eigene
  `einheit` und startet wieder bei `sequenz: 1`** – die Anzeige zählt dann korrekt ab 1,
  und die Map-Gruppierung garantiert, dass sich die Stränge nicht vermischen.
  Slug-Präfix zur Unterscheidung: `englisch-stufe7-01-<thema>` (der Präfix `englisch-NN-`
  bleibt für den bestehenden Stufe-9-Strang reserviert).
- Die Stufe steht **nur** in `curricula[].grades` – nie im Titel, Slug-Thema oder in der
  `description`.

## 5. Blocktypen

13 Typen sind implementiert: `text`, `image`, `video`, `audio`, `tasks`, `lueckentext`,
`quiz`, `zuordnung`, `numerisch`, `achse`, `term`, `simulation`, `planspiel` (Letzteres nur
Kernteam – nicht einreichen). In Englisch-Modulen etabliert: die ersten acht.
Alle Blöcke: `id` (bei prüfenden Typen Pflicht; modulweit eindeutig, max. 64 Zeichen,
kein `:`, nicht mit `~` beginnend; `"quiz"` als id ist für Quiz-Blöcke reserviert) und
`title` (optional; bei `audio` Pflicht). Block-id-Konvention: Typ-Präfix
(`quiz-…`, `lt-…`, `sb-…`, `zu-…`, `audio-…`, `task-…`), Fragen-ids `<kürzel>-q<n>`.

### 5.1 `text`

`body` (Markdown, Pflicht). Muster: Welcome-Block («Welcome to …!», ~100–130 Wörter,
Alltagsbezug, Bullet-Liste «In this module you will …» mit Fettdruck, ermutigender
Schluss) und Theorie-Blöcke (Regel fett voran, 2–3 Beispielsätze als Liste, Merksatz
«**In short:** …», Verweis auf das folgende Merkbild). Kein Roh-HTML (Validierungsfehler);
Markdown-Tabellen und Blockquotes sind erlaubt. `$$…$$` rendert KaTeX.

### 5.2 `image`

```json
{
 "type": "image",
 "title": "Listen or hear?",
 "src": "/content/<modul-id>/listen-vs-hear.png",
 "alt": "Chart with two halves. Left half, blue, titled «LISTEN (+ to)»: …",
 "caption": "Left: you choose the music and give it your attention. …",
 "credit": "Eigene Darstellung, EveryCate, CC BY-SA 4.0"
}
```

`alt` beschreibt das Bild vollständig inhaltlich (alle sichtbaren Textzeilen!), 300–900
Zeichen. Eigene Grafiken: als SVG/HTML entwerfen, mit Headless-Chrome als PNG rendern
(Merkbilder 1600×1200, Sonderformate z. B. 1600×840; Zuordnungs-Icons 400×400 – dort
Inhalte per `translate/scale` ca. 25 % verkleinern, der Beschnitt ist stärker). SVG selbst
ist nicht in der Bild-Whitelist. Ergebnis-PNG immer visuell prüfen (Beschnitt rechts/unten).

### 5.3 `video`

Nur verifizierte Videos einbetten: `provider: "youtube"` (Standard, läuft über
youtube-nocookie) oder `"vimeo"`, jeweils **nur die `videoId`** (YouTube 6–20 Zeichen),
nie die URL. Vor dem Einbetten real prüfen (oEmbed/Watch-Seite: Titel, Kanal, Dauer,
`playableInEmbed`). `description` nennt Länge, Sprache/Untertitel und
«Watch out for …»-Beobachtungsaufträge; `transcript` (Zusammenfassung) empfohlen.
**explainity-Videos werden nicht eingebettet, nur extern verlinkt** (Text-Block +
`sources`-Eintrag «Video (extern): …») – Konvention aus PR #26. Fremde
Video-Datei-Hosts sind gesperrt (`videoUrlHosts: []`).

### 5.4 `audio` (Hörblock, TTS-Vorlese-Variante)

Exakte Felder: `src` (optional, nur eigener Modulordner, `.mp3/.m4a`), `credit` (Pflicht
sobald `src` gesetzt), `vorleseText` (max. 4000 Zeichen reiner Text), `vorleseSprache`
(BCP-47, Englisch-Standard: `"en-GB"`), `transcript` (nur zusammen mit `src` erlaubt),
`transkriptAnzeigen` (Default `true`; bei Höraufgaben `false`, damit der Text die Lösung
nicht verrät), `description`, `title` (Pflicht). Mindestens eine Quelle (`src` und/oder
`vorleseText`); es gibt **kein** Stimmen-Feld – die Stimme wählt der Player («Cates
Stimmen»), `vorleseSprache` steuert nur die Sprache. Reine Vorlese-Variante (ohne mp3)
ist gültig und die einfachste Form:

```json
{
 "type": "audio",
 "id": "audio-dialog-1",
 "title": "Listening 1",
 "vorleseText": "Hello! My name is …",
 "vorleseSprache": "en-GB",
 "transkriptAnzeigen": false,
 "description": "Press play and listen carefully. You can listen more than once."
}
```

`audio` ist **nicht prüfend** – direkt danach folgt konventionsgemäß ein Mini-Quiz
(1 Frage, 3–4 minimal unterschiedliche Sätze/Aussagen) zum Gehörten.

### 5.5 `tasks` (freie Texte, ohne Auto-Auswertung)

`tasks[]` mit je `prompt` (Pflicht; Auftrag + Markdown-Checkliste `- [ ]` zur
Selbstkontrolle), `hint` (Satzanfänge), `solution` («There is no single right answer …» +
vollständiges Beispiel, das die eigenen Vorgaben nachweislich erfüllt – Wortzahl
nachzählen!). Freitext geht in den Report an die Lehrperson. Aufgaben ans tatsächliche UI
anpassen («type your text», nicht «in dein Heft»).

### 5.6 `lueckentext` – drei Modi in einem Typ

Gemeinsam: `id` Pflicht, `modus` Pflicht, `intro` optional.

- **`"modus": "wortbank"`** (Antippen/Ziehen): `text` mit Markern `{{1}}`, `{{2}}` …,
  `luecken[].antworten` (erster Eintrag = Anzeigeform in der Wortbank), optional
  `ablenker` (dürfen keiner akzeptierten Antwort gleichen; das `intro` kündigt Anzahl an:
  «Careful: two forms in the list are wrong …»). Die Wortbank wird alphabetisch gemischt
  ausgespielt – Reihenfolge der Lücken ist daher unkritisch. Mobile-Hinweis im Intro:
  «on a phone: tap the word first, then the gap». Faustregel: Bei kleinen geschlossenen
  Wortmengen (2–3 Kandidaten) wortbank statt eingabe. Keine kleingeschriebenen Chips an
  Satzanfänge setzen.
- **`"modus": "eingabe"`** (freie Eingabe): wie wortbank, aber **ohne** `ablenker`
  (verboten). Mehrere akzeptierte Antworten pro Lücke möglich und oft nötig
  (`["had seen", "had ever seen", "saw", "ever saw"]`); faire gleichbuchstabige
  Alternativen bedenken, Hilfen in den Satz legen (Anfangsbuchstabe `(u…)` oder
  Infinitiv `(begin)`). Vergleich ist NFC-normalisiert, ß/ss-gefaltet und per Default
  case-insensitiv.
- **`"modus": "satzbau"`**: `bausteine` (2–40, korrekte Reihenfolge; Anzeige mischt),
  optional `alternativen` (1-basierte Voll-Permutationen) und `ablenker` (≠ Bausteine);
  `text`/`luecken` verboten. Chips tragen Groß-/Kleinschreibung und Satzzeichen und
  schließen so falsche Reihenfolgen aus.

### 5.7 `zuordnung` (Begriff–Bild, Vokabel–Übersetzung)

`paare` (2–12) mit `links`/`rechts`, je Element **genau eines** von `text` (≤ 200 Zeichen)
oder `bild` (`{src, alt, credit}` – `credit` ist hier Pflicht). **Keine Ablenker** – beide
Spalten gleich lang; die früheren Felder `ablenker`/`ablenkerLinks` werden hart abgelehnt
(seit 5.8.2026). Elemente je Spalte müssen unterscheidbar sein. Größere Mengen als zwei
Blöcke aufteilen (M5: 8 Sätze → zwei 4er-Zuordnungen). Bild-Paare: 6 Icons à 400×400 px
im Flat-Stil (Muster `englisch-04`).

### 5.8 `quiz` (MC)

`id` Pflicht, `questions` (min. 1, ids Pflicht), optional `intro`. Fragetypen:
`single_choice` (genau eine Option `"correct": true`), `multiple_choice`, `true_false`
(`answer`: boolean). Die Englisch-Module nutzen bislang ausschließlich `single_choice`
mit meist 4 Optionen (Hör-Diskrimination: 3). Jede Frage bekommt eine `explanation`
(1–3 Sätze, erklärt auch die Distraktoren – «das ist der Lernmoment»). Es gibt **kein
Shuffle-Flag**: die Plattform zeigt die Options-Reihenfolge der Quelldatei – daher die
Positionsregel in Abschnitt 9.1. Letzter Block jedes Moduls: `quiz` mit `"id": "quiz-final"`.

### 5.9 `varianten`

`lueckentext`, `zuordnung`, `numerisch`, `term` können alternative Voll-Fassungen für
Wiederholungen tragen (Punktzahl-Parität wird erzwungen). Nur für Verfahrens-Übungen
nutzen und **jede Fassung einzeln gegenlesen** – die Validierung prüft nur die Form.
In den Englisch-Modulen 1–5 bisher ungenutzt.

## 6. Prüfende Blöcke, Selbstchecks, Modulabschluss

`lueckentext`, `quiz`, `zuordnung`, `numerisch`, `achse`, `term` sind **immer prüfend**
(plus `simulation` mit `abschlussfrage`); Modul bestanden = 100 % über alle prüfenden
Blöcke, unbegrenzt wiederholbar, bester Versuch zählt. Ein `benotet`/`unbenotet`-Flag
existiert **nicht**. «Unbenotete Selbstchecks» werden rein **tonal** gelöst: das `intro`
nimmt den Druck raus («Just try – this is a warm-up, not a test!», «This check is for
you – the result stays on your device.»). Ergebnisse bleiben ohnehin lokal auf dem Gerät
(Plattform-Prinzip, keine Anmeldung). Wirklich nicht-prüfend sind nur `text`, `image`,
`video`, `audio`, `tasks` und `simulation` ohne Abschlussfrage.

## 7. Erweiterungs-Kennzeichnung (A-Zug)

Kein Schema-Feld – Konvention (Muster `englisch-03-watch-or-see`):

- Erweiterung als **eigenes Modul** oder klar markierter Zusatzabschnitt am Modulende,
- Titelzusatz «(extended)», `difficulty: "anspruchsvoll"` (nur bei eigenem Modul),
- `keywords` mit `"erweitert"` und `"extended"`,
- `description` benennt «extension module»/«optional extra»,
- der Einleitungstext lädt ausdrücklich alle ein («everybody else can use it as extra
  practice») – niemals als Pflicht für einen Zug formulieren.

Bei einem Zusatz-**Abschnitt** innerhalb eines Moduls gilt: Er darf keine prüfenden
Blöcke enthalten, die vor ihm liegende Lernende am 100-%-Abschluss hindern würden – doch
Vorsicht: **jeder** prüfende Block zählt zum Abschluss. Ein optionaler Challenge-Teil
nutzt daher nicht-prüfende Formen (`tasks`) oder bleibt ein eigenes Modul. (Ein
`level`/`zug`-Feld ist beim Betreiber angeregt, existiert aber nicht.)

## 8. Validierung und CI

```bash
npm install        # einmalig bzw. nach Upstream-Änderungen (tsx, zod, mathjs)
npm run validate   # prüft IMMER alle Module; Exit 1 bei erstem Fehler
```

- Kein Einzelmodul-Filter – die Ausgabe ist pro Modul gegliedert
  (`✓ <slug> – N Blöcke, M Quizfragen` bzw. `✗ <slug>` + Fehlerzeilen).
- Geprüft wird u. a.: Schema v3 + Verbot der Legacy-Felder, `id` == Ordnername,
  Blocktypen-Whitelist mit Tippfehler-Erkennung, Existenz/Größe/Ablage aller Medien,
  Markdown-Bilder in allen Stringfeldern, Roh-HTML-Verbot, modulweit eindeutige ids,
  Ablenker ≠ Lösung, Ordnerhygiene (unreferenzierte Bilder/Audios = Hint, `.html` = Fehler).
- **Nicht** geprüft werden: Pixelgrößen, Quiz-Antwortpositionen, Lösungswort-Leaks,
  didaktischer Gehalt – das bleibt Review-Arbeit (Abschnitt 9).
- CI (`.github/workflows/validate.yml`) läuft bei jedem PR; nach Merge auf `main` wird
  der Website-Neubau angestoßen. «Validierung grün» ist Pflicht-Schlusszeile jedes
  Content-Commits.

## 9. Qualitätsregeln (aus Reviews und Historie destilliert)

### 9.1 MC-Antwortpositionen variieren

Die Position der richtigen Antwort muss über die Fragen eines Moduls annähernd
gleichverteilt und musterfrei sein (keine Position dreimal in Folge, keine Periodik);
WP-Standard bei 8 Fragen: je 2× Position 1–4. Zusätzlich: kein **Längen-Muster** – die
richtige Antwort darf nicht systematisch die längste (oder kürzeste) Option sein, über
mehrere Fragen hinweg geprüft. Prüf-Snippet (kein Repo-Skript vorhanden – ad hoc ausführen):

```js
// node --input-type=module -e '…' bzw. als Datei; pro single_choice-Frage: Position/Anzahl
import fs from "node:fs";
const j = JSON.parse(fs.readFileSync("modules/<id>/module.json", "utf8"));
for (const b of j.blocks) if (b.type === "quiz")
  for (const q of b.questions) if (q.type === "single_choice")
    console.log(q.id, q.options.findIndex(o => o.correct) + 1, "/", q.options.length);
```

### 9.2 Keine Lösungswörter in Aufgaben- und Modulbeschreibungen

Intros, `description` und Prompts dürfen die Lösungen nicht enthalten oder lexikalisch
vorwegnehmen (kein «Signalwort», keine Überlappung zwischen Aufgabentext und
Lösungskategorie). Bei Eingabe-Lücken ist die einzige Hilfe z. B. der Anfangsbuchstabe;
Satz-/Item-Reihenfolgen dürfen keiner irgendwo gelisteten Reihenfolge entsprechen
(Intro-Listen, Grafiken, Wortbänke anderer Blöcke). Erlaubt: Anzahlen nennen («Every word
is used exactly once», «two forms are wrong») – diese Angaben müssen stimmen.
Erklärteil-Beispiele dürfen nicht wortgleich als Quiz-Option wiederkehren.

### 9.3 Keine Lernjahr-/Stufen-Angaben in der `description`

Keine Lernjahre, Schulstufen, Schulwochen, Modulnummern oder Zug-Angaben – die Stufe
liegt strukturiert in `curricula[].grades`. Erlaubt: das Sprachniveau («Level A1»).
Auch in Fließtexten Wochen-Referenzen vermeiden; auf andere Module lieber inhaltlich
verweisen («the adjectives from ‹Sound check›») statt «from Week 1».

### 9.4 Titel-Eigenständigkeit

Modul-, Einheits- und Abschnittstitel dürfen mit keinem Unit-/Kapitel-Titel eines
Englischlehrmittels identisch oder verwechselbar sein (Präzedenzfall: «Catchy tunes» →
vollständig ersetzt durch «Cate's Sound Lab», inkl. Slug und Grafik). Ebenso: keine
Figuren, Storylines, Vokabellisten-Zusammenstellungen oder Beispielsätze aus Lehrmitteln
übernehmen oder paraphrasieren; keine Verlags-/Lehrmittelnamen in den Inhalten. Fiktive
Namen (Bands, Songs, Personen) gegen real existierende bekannte Werke prüfen.

### 9.5 Sprachliche Regeln

- Englisch: natürliches, niveau-angemessenes Englisch; deutsche **Calques vermeiden**
  («do something against», «at one glance», «every audio»); Idiomatik prüfen
  («at the cinema», nicht «in»).
- MC-Grammatikfragen brauchen eindeutige Anker im Satz (Aktiv-/Passiv-Kontext für
  hear/listen; «by the time» für past perfect), sonst sind Zweitlösungen vertretbar und
  die Frage ist unfair. Distraktoren aus dem geschlossenen Modulwortschatz wählen.
- Deutschsprachige Teile (`einheit`, Glossen, credits): deutsche Rechtschreibung
  **mit ß** («heißt», «Größe») – die Plattform zeigt bei li/ch-Auswahl automatisch ss an.
  (Achtung: CONTENT-SCHEMA.md Z. 53 und die Fehlertabelle am Ende von
  CONTENT-ERSTELLEN.md behaupten noch das Gegenteil – beide Stellen sind veraltet,
  maßgeblich sind der Orthografie-Abschnitt in CONTENT-ERSTELLEN.md und
  `normalisiereLueckenAntwort` im Schema.)
- Anrede «du» (bzw. englisch «you»); keine Sie-Anrede.
- Alt-Texte geben **alle** sichtbaren Textzeilen der Grafik wieder.
- Neutralität: keine Produktnennungen, träger-/altersneutrale Formulierungen,
  Absolutaussagen nur wenn belegbar; KI-Figuren als solche kennzeichnen.

### 9.6 Verifikation von Fakten und Medien

Jede Zahl, jede Behauptung, jedes Video real prüfen (oEmbed + Watch-Seite; nichts aus dem
Gedächtnis). Videos: 3–6 Minuten als Richtfenster, Bildungskanäle, keine Affiliate-Links.
Eigene Texte, Dialoge und Wortlisten vollständig selbst verfassen. Musterlösungen müssen
die eigenen Vorgaben erfüllen. Nicht übernommene Review-Befunde werden im Commit begründet.

## 10. Minimalbeispiel eines gültigen Moduls

Hands-on gegen `parseModulDatei` (Zod-Schema) und `npm run validate` geprüft. Ordner:
`modules/englisch-stufe7-01-beispiel/`, Datei `module.json`:

```json
{
 "schemaVersion": 3,
 "id": "englisch-stufe7-01-beispiel",
 "title": "My First Steps",
 "description": "A short example module: you revise everyday words and answer one quiz question. Level A1.",
 "curricula": [
  {
   "curriculum": "li",
   "subject": "E",
   "subjectName": "Englisch",
   "grades": [7],
   "competencies": [
    {
     "code": "FS1E.5.B.1",
     "description": "FS1E.5.B.1 (LiLe, Englisch 1. Fremdsprache – Wortschatz): … (Wortlaut verbatim von fl.lehrplan.ch, vor Merge auf lile.li prüfen)"
    }
   ]
  }
 ],
 "sequenz": 1,
 "einheit": "Name des Lernpfads (deutsch, eigenständig)",
 "language": "en",
 "languageLearning": true,
 "learningObjectives": [
  "I can say hello and introduce myself."
 ],
 "durationMinutes": 45,
 "difficulty": "leicht",
 "keywords": ["vocabulary", "beginners"],
 "authors": ["Anna Rinderer"],
 "license": "CC BY-SA 4.0",
 "blocks": [
  {
   "type": "text",
   "title": "Welcome!",
   "body": "Hello! In this module you will revise words you already know."
  },
  {
   "type": "quiz",
   "id": "quiz-final",
   "title": "Final check",
   "questions": [
    {
     "id": "fi-q1",
     "type": "single_choice",
     "prompt": "Which word is a colour?",
     "options": [
      { "text": "table" },
      { "text": "green", "correct": true },
      { "text": "run" }
     ],
     "explanation": "Green is a colour. A table is a thing, and run is a verb."
    }
   ]
  }
 ]
}
```

Reale Module ergänzen `sources` und `requires` und folgen der Dramaturgie:
Welcome → (Warm-up) → Theorie → Merkbild → Übungen im Wechsel → Abschluss
(`tasks` und/oder `quiz-final`), 10–20 Blöcke, ca. 45 Minuten.

## 11. Bekannte offene Punkte

- Zwei veraltete ss/ß-Stellen in der Doku (CONTENT-SCHEMA.md «Ablage», Fehlertabelle in
  CONTENT-ERSTELLEN.md) und die fehlende `languageLearning`-Dokumentation in der
  Metadaten-Tabelle – Kandidaten für einen kleinen Doku-PR.
- Titel-Eigenständigkeit und explainity-Regel stehen bislang nur in Commit-/PR-Texten –
  mit diesem Dossier erstmals schriftlich.
- Kompetenzcode-Stil der Bestands-Module 1–5 (Legacy-Workaround `E.x.y.z`) könnte in
  einem eigenen PR auf direkte FS1E-Codes migriert werden.
- Ein `level`/`zug`-Feld für Erweiterungsmodule sowie eine Validator-Warnung für
  Quiz-Positionsmuster sind beim Betreiber angeregt, existieren aber nicht.

# Cate's First Day – Übergabe

Genau ein eigenständiges Zusatzmodul für **Englisch, Stufe 7,
Liechtenstein**, ungefähr **20 Minuten**. Reihe: **Cate's exchange year
in Scotland**, Reihenfolge 1.

- Moduldatei: [modules/englisch-01-cates-first-day/module.json](modules/englisch-01-cates-first-day/module.json)
- Format: **Schema-Version 3**, verbindlich ist
  [schema/schema.ts](schema/schema.ts), insbesondere `moduleSchema`,
  `knownBlockSchema` und `parseModulDatei`.
- Umfang: 13 Blöcke; ausschließlich `text`, `quiz`, `lueckentext` und
  `tasks`. Sieben automatisch geprüfte Blöcke ergeben maximal 17 Punkte.
- Diese Begleitdatei liegt außerhalb des Modulordners, weil dessen
  Validator keine Markdown-Dokumentation zulässt.

## Fachlicher Bezug und Geschichte

Grobe Orientierung: **Open World 1, Ausgabe ab 2018, Unit 1 «Going
places»**. Der Auftrag nennt als geprüften Language Companion
**ISBN 978-3-264-84251-7**. Das Buch lag bei dieser Umsetzung nicht vor;
ein eigener Abgleich mit Buchseiten oder Verlagswortlisten wurde deshalb
nicht durchgeführt. Die acht Zielwörter und ihre Bedeutungen stammen aus
dem Auftrag. Geschichte, Übungskontexte, Antwortalternativen und Hilfen
sind eigens für dieses Modul formuliert. Es werden keine Verlagstexte,
Bilder, Audios, Aufgabenfolgen oder vollständigen Wortlisten übernommen.
Die Quellenzeile im Modul benennt den Orientierungsbezug; sie behauptet
keine Freigabe oder Mitwirkung des Verlags.

Cate bleibt die vorhandene EveryCate-Lernroboterfigur. In der Fiktion
studiert sie während ihres Austauschjahres an der University of Glasgow.
Calum und Timo sind erfundene junge Studierende und ihre neuen Mitbewohner:
Calum kommt aus Schottland, Timo aus Deutschland und studiert Ingenieurwesen.
Cates Zimmer hat ein eigenes Badezimmer; die Küche ist gemeinsam.
Calum bewahrt sein teures Fahrrad aus Sorge vor Dieben im Zimmer auf.
Diese Wohnsituation beschreibt die Figuren, nicht sämtliche schottischen
Studierendenwohnheime.

Die widersprüchlichen Vorgaben wurden zugunsten dieser Glasgow-Geschichte
aufgelöst: Die Verständnisfrage nennt **students, Calum und Timo** statt
**pupils, Rowan und Sam**. Die Ortsfrage betrifft das **student
accommodation** statt einer nicht vorkommenden Schule. Beide Lösungen
stehen ausdrücklich im Text. `pupils` wird nur als Lesehilfe erklärt.
Der Bahnhof bleibt fiktiv und unspezifisch nahe Glasgow; es werden keine
Flughafenverbindung oder Fahrkartenverkaufsregeln behauptet. Timos
Handykarte konkretisiert seine Hilfe. Loch Lomond, Musik, Videos und
weitere Kulturthemen sind nicht Bestandteil dieses ersten Moduls.

## Ablauf und Lösungen

| Schritt | Zeit | Umsetzung und Lösung |
| --- | --- | --- |
| A – Auftrag | 1 Min. | Cate vorstellen, drei Tagebuchsätze als Auftrag, zwei verständliche Lernziele. |
| B – Wörter | 3 Min. | Wortbank; vier Bedeutungsfragen und vier Kontextlücken als Auswahlfragen. Lösungen in Reihenfolge: journey → eine Reise; railway station → Bahnhof; ticket → Fahrkarte; passenger → mitreisende Person; friendly; nearby; over there; diary. |
| C – Lesen | 4 Min. | Fünf kurze englische Absätze mit deutschen Lesehilfen; Verständnisfragen: **long**, **Calum and Timo**, **nearby**. |
| D – Sprachwerkzeug | 5 Min. | am/is/are → was/were; Aussagen, wasn't/weren't und Fragewortstellung. Lücken: **was**, **were**, **wasn't / was not**, **Were**. |
| E – Tagebuch | 5 Min. | Drei eigene Sätze aus Cates Sicht, mindestens drei verschiedene Zielwörter/-wendungen und mindestens zwei passende Formen von was/were; Wortbank, Satzanfänge, zwei mögliche Beispiele und Selbstprüfung. |
| F – Abschluss | 2 Min. | Neue Abrufsituationen: **were**, **diary**; danach Selbsteinschätzung mit den drei gewünschten Formulierungen. |

`railway station` und `over there` zählen jeweils als eine Lernwendung.
Mehrzahlformen wie `passengers` zählen zur Wortfamilie `passenger`, nicht
als zusätzliches Zielwort. Zweimal korrektes `was` erfüllt bereits die
Forderung nach zwei passenden Formen. Das erste Tagebuchbeispiel verwendet
`was`, `was`, `were` und die drei Ziele `journey`, `railway station`,
`friendly`. Es werden keine weiteren Vergangenheitsformen systematisch
eingeführt. Zusätzlicher Wortschatz wird durch Lesehilfen erschlossen.

## Zielwort → Inputstelle → gezielte Übung

Alle acht Bedeutungen stehen außerdem in `b-word-bank` und in der Hilfe
der Tagebuchaufgabe. Absatznummern beziehen sich auf die fünf englischen
Absätze in `c-scene`, ohne Arbeitsanweisung und Lesehilfen.

| Zielwort / Wendung | Inputstelle in `c-scene` | Übung (Frage-ID) |
| --- | --- | --- |
| journey – eine Reise | Absatz 2: «Yesterday my journey was long.» | `b-journey`: Bedeutung wählen; zusätzlich `c-journey`. |
| railway station – Bahnhof | Absatz 2: «At a small railway station near Glasgow …» | `b-railway-station`: Bedeutung der ganzen Wendung wählen. |
| ticket – Fahrkarte | Absatz 2: «My ticket was on my screen.» | `b-ticket`: Bedeutung im Reisekontext wählen. |
| passenger – eine Person, die in einem Verkehrsmittel mitreist | Absatz 2: «I was a passenger on a train.»; Absatz 3: weitere passengers | `b-passenger`: passende Personenbeschreibung wählen. |
| friendly – freundlich | Absatz 3: «They were friendly.» | `b-friendly`: Kontextlücke mit Lächeln und Willkommensgruß. |
| nearby – in der Nähe | Absatz 4: «Our student accommodation is nearby.» | `b-nearby`: Kontextlücke «not far away»; zusätzlich `c-nearby`. |
| over there – dort drüben | Absatz 4: «Look, it is over there, across the street.» | `b-over-there`: ganze Wendung in einer Kontextlücke am Busstopp. |
| diary – Tagebuch | Absatz 5: «… my diary is open.» | `b-diary`: Kontextlücke zum persönlichen Buch; zusätzlich `f-recall`, Lücke 2. |

## Bestehende Player-Funktionen

Die Umsetzung verwendet den dokumentierten EveryCate-Vertrag ohne neue
Felder, Schemaversionen oder Plattformfunktionen. Es gibt keine Varianten,
Medienpfade, Downloads, CDN-Abhängigkeiten, Datenbanken oder benötigten
KI-Dienste. Der gesamte Lernweg ist als Text bearbeitbar. Eine neue
Darstellung von Cate wird nicht erzeugt; Cate bleibt die vorhandene
Player-Figur. Im Content-Checkout ist kein separat benanntes Cate-Avatar-Asset
verfügbar, deshalb wurde kein Bildpfad geraten oder fremdes Bild kopiert.

- **Hinweise und Wiederholung:** Die acht Wortfragen nutzen `quiz` mit
  `explanation`, weil dieses Feld nach dem Beantworten Rückmeldung bietet.
  Die Kontextlücken werden daher als Auswahlfragen umgesetzt. Bei den
  Grammatiklücken stehen Hilfen im erlaubten `intro`; sie bleiben auch nach
  Fehlern lesbar. Die Anleitung verweist auf das vorhandene Wiederholen.
  Es gibt keine erfundenen `hint`-Felder an Quizfragen oder Lücken.
- **Verneinung:** Der vollständige Zielsatz wird mit einer Lücke für die
  Verbform gebildet. `wasn't`, `wasn’t` und `was not` werden akzeptiert;
  Groß-/Kleinschreibung und Rand-Leerraum folgen der vorhandenen
  `istLueckeRichtig`-Logik.
- **Freier Text:** `e-diary/e-diary-entry` ist eine normale offene
  `tasks`-Aufgabe mit `prompt`, aufklappbarem `hint` und `solution`.
  Es gibt keine String-Gleichheitsbewertung, keine Punktvergabe für
  Beispielähnlichkeit und keine KI-Abhängigkeit. Die Antwort soll über
  den vorhandenen Aufgaben-, Speicher- und Ergebnisweg des Players laufen;
  dieses Content-Repository implementiert ihn nicht selbst.
- **Selbsteinschätzung:** Die Lernenden tragen «Das kann ich schon»,
  «Mit Hilfe geschafft» oder «Das möchte ich weiter üben» in die zweite
  offene Aufgabe ein. Der vorhandene `einschaetzung`-Block verwendet eine
  feste Sechser-Skala und passt deshalb nicht zu dieser Dreierauswahl.
- **Ergebnisse:** Stabile Block-, Frage- und Aufgaben-IDs nutzen den
  vorhandenen Lernstand. Laut Schema zählt der technische Modulabschluss
  die sieben automatisch geprüften Blöcke; Tagebuch und Selbsteinschätzung
  sind unbenotet. Ein technisches «bestanden» belegt deshalb nicht die
  Qualität des freien Textes. Die angegebenen curricularen Codes sind
  Übungsbezüge, keine umfassenden Kompetenznachweise. Die vorhandenen
  Teilkompetenz-Kennungen passen teilweise zu anderen Inhalten (etwa
  past perfect); deshalb werden keine unpassenden Kennungen angehängt.
  Hör- oder Sprechkompetenz wird weder geprüft noch als nachgewiesen
  ausgewiesen.

## Ausgeführte Prüfungen

Geprüft am **10. Oktober 2026**, Ausgangsstand des Content-Repositories:
`84a7e74`. Vorab gelesen: README, CONTENT-ERSTELLEN, relevante Abschnitte
von CONTENT-SCHEMA, maschinenlesbares Schema einschließlich
`parseModulDatei`, Validator samt Whitelist, CI-Workflow sowie das durch
den Validator bestätigte Beispiel
`modules/englisch-stufe7-01-wake-up-your-english/module.json`.
Es gibt in diesem Checkout keine `AGENTS.md`.

- JSON mit `JSON.stringify(module, null, 1) + "\n"` erzeugt; Einlesen und
  identische erneute Serialisierung geprüft. Das Projekt definiert keinen
  separaten Formatierer für Moduldateien.
- `npm run validate`: **alle 43 Module gültig**, einschließlich des
  einzigen neuen Moduls (13 Blöcke, 11 Quizfragen). Der Ausgangsstand
  bestand zuvor mit 42 Modulen.
- `npx tsc --noEmit`: bestanden.
- `npm run test:uebersetzung`: **36 Tests bestanden**. Das Modul selbst
  trägt `languageLearning: true` und erhält keine Übersetzungsdatei.
- Direkter Ladecheck mit `JSON.parse` → **dem vorhandenen
  `parseModulDatei`**: erfolgreich. Zusätzlich geprüft: bekannte Blocktypen,
  Lehrplan/Stufe, alle acht Zielwörter im Lesetext und in gezielten
  Aufgaben, Rückmeldungen, akzeptierte und falsche Verbformen mit
  `istLueckeRichtig`, sieben Prüfschlüssel und 17 Punkte. Tagebuch und
  Reflexion liegen außerhalb der automatisch geprüften Schlüssel.
- Inhaltlich gegengelesen: Lösungen aus der Szene ableitbar;
  Namens-/Ortswidersprüche korrigiert; freie Texte mit Selbstprüfung;
  Abrufsätze ausdrücklich als neue Übungssituationen gekennzeichnet.
- `git diff --check`: ohne Befund.

Den Parser-Ladecheck kann man vom Repository-Stamm so wiederholen:

```bash
node --import tsx --input-type=module <<'JS'
import fs from 'node:fs';
import { parseModulDatei, pruefSchluessel } from './schema/schema.ts';
const raw = JSON.parse(fs.readFileSync(
  'modules/englisch-01-cates-first-day/module.json', 'utf8'));
const result = parseModulDatei(raw);
if (!result.success) throw result.error;
console.log(result.data.id, pruefSchluessel(result.data));
JS
```

## Nicht ausführbar und verbleibende Grenzen

Der README zufolge findet der separate private EveryCate-Player die
Sammlung als benachbartes `module-content`-Repository oder über
`EVERYCATE_CONTENT_DIR`. Sein Quellcode, seine Cate-Assets und ein
lauffähiger Browser-Player stehen in dieser Umgebung nicht zur Verfügung;
die Zugriffsversuche auf die naheliegenden Plattform-Repositories lieferten
HTTP 404. Die Content-Kopie des Parsers wurde ausgeführt, **kein echter
Browser-Import oder Plattform-Build**. Auch die Bytegleichheit mit dem
aktuell ausgelieferten Plattform-Schema ist hier nicht nachgewiesen.

Vor Freigabe in einer vorhandenen Player-Vorschau noch praktisch prüfen:

1. Modul im Katalog für Liechtenstein / Englisch / Stufe 7 laden oder mit
   dem vorhandenen Modulimport öffnen; alle 13 Blöcke lesen und bedienen.
2. Einen Wortfehler machen, Rückmeldung lesen und erfolgreich wiederholen;
   Grammatiklücken mit `wasn't`, `wasn’t` und `was not` durchgehen.
3. Einen eigenen Tagebuchtext eingeben, Tipp und Beispiel öffnen; nach
   Neuladen prüfen, dass der Text und die Selbsteinschätzung erhalten sind.
   Den bestehenden Ergebnis-/Reportweg einschließlich freier Antworten
   kontrollieren.
4. Den Textweg ohne aktivierte Sprach-/KI-Funktionen durchführen. Die
   lokale Speicherung, Offline-Verfügbarkeit der bereits geladenen
   Plattform und tatsächliche Darstellung der Hilfen sind noch nicht
   zur Laufzeit geprüft. Die geschätzten 20 Minuten sind nicht mit einer
   Lerngruppe erprobt.

Der Auftrag endet mit einem Pull Request. Kein Merge und kein Deployment:
Laut vorhandenem CI-Workflow würde erst ein Merge nach `main` den
Deployment-Hook auslösen.

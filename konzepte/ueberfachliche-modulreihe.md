# Überfachliche Kompetenzen als Modulreihe – Konzept

Stand: 20.11.2026. Dieses Konzept beschreibt, wie aus dem heutigen Modul
`ueberfachlich-wie-lerne-ich` eine Modulreihe wird: ein Lernmodul je
Einschätzungsblock. Umgesetzt ist bisher das **Pilotmodul**
`ueberfachlich-selbststeuerung`; die übrigen Module folgen erst nach der
Freigabe der Reihe. Die technischen Angaben zur Plattform (Abschnitt 4)
sind am Code vom 20.11.2026 geprüft.

## 1. Ausgangslage

Das Modul «Wie lerne ich? Selbsteinschätzung» besteht aus einem
Einstiegstext, sechs Einschätzungsblöcken und einem Schlusstext. Es hat
keine Aufgaben und keine Punkte. Die sechs Blöcke decken die 32
überfachlichen Teilkompetenzen des Registers ab
(`kompetenzen/teilkompetenzen.json`, Fachbereich `uef`):

| Block (id) | Titel | Bereich (LeSiMa / Liechtenstein) | Teilkompetenzen |
|---|---|---|---|
| `selbst-selbststeuerung` | Wie ich mein Handeln und Lernen steure | Selbständigkeit | 4 |
| `selbst-reflexion` | Wie ich mich und andere einschätze | Reflexion | 4 |
| `selbst-herausforderungen` | Wie ich mit Herausforderungen umgehe | Resilienz | 5 |
| `selbst-antrieb` | Was mich antreibt | Bereitschaft | 5 |
| `selbst-zusammenarbeit` | Wie ich mit anderen zusammenarbeite | Miteinander | 6 |
| `selbst-lernen` | Wie ich lerne und arbeite | Lernkompetenz | 8 |

Die Kennungen im Einzelnen:

- **Selbständigkeit:** `uef.selbststeuerung.entscheidungen-treffen`,
  `…prioritaeten-setzen`, `…ziele-verfolgen`, `…selbststaendig-arbeiten`
- **Reflexion:** `uef.reflexion.staerken-schwaechen-kennen`,
  `…eigene-arbeit-einschaetzen`, `…verhalten-anderer-einschaetzen`,
  `…meinungen-vertreten`
- **Resilienz:** `uef.herausforderungen.gefuehle-regulieren`,
  `…frustration-aushalten`, `…rueckschlaege-meistern`, `…fehler-nutzen`,
  `…ausdauer-zeigen`
- **Bereitschaft:** `uef.antrieb.interesse-zeigen`, `…motivation-finden`,
  `…arbeitsbereitschaft-zeigen`, `…anstrengung-zeigen`,
  `…lernbereitschaft-zeigen`
- **Miteinander:** `uef.zusammenarbeit.empathie-zeigen`,
  `…im-team-arbeiten`, `…verstaendlich-kommunizieren`,
  `…regeln-einhalten`, `…konflikte-loesen`, `…vielfalt-achten`
- **Lernkompetenz:** `uef.lernen.informationen-verarbeiten`,
  `…lernstrategien-nutzen`, `…planen-organisieren`, `…arbeit-evaluieren`,
  `…konzentriert-arbeiten`, `…probleme-loesen`, `…zeit-einteilen`,
  `…kritisch-denken`

**Quellenlage.** Im Repo liegen von LeSiMa die sechs Bereichsnamen, fünf
Leitfragen und die Namen der 32 Unterkriterien (als Codes der
Lehrplan-Zuordnung). Ausführliche Beschreibungen der Kriterien
(Verhaltensanker, Stufen) liegen nicht vor. Die Modultexte sind darum
eigene Formulierungen, die sich an Namen und Leitfragen halten; die
Ich-Sätze des Registers sind ebenfalls Eigenformulierungen der Plattform.

## 2. Die Reihe

Alle Module stehen in der bestehenden Einheit **«Überfachliche
Kompetenzen»** (`einheit`), die Reihenfolge gibt `sequenz` – derselbe
Mechanismus, mit dem der Katalog schon die Reihen «Nationalsozialismus»
und «Wirtschaft und Politik» gruppiert. Fach `UEF`, Lehrpläne `li` und
`ch`, Stufen 7–9.

| sequenz | Ordner / id | Titel | Einschätzungsblock |
|---|---|---|---|
| 1 | `ueberfachlich-wie-lerne-ich` (bleibt) | Wie lerne ich? Selbsteinschätzung | alle sechs |
| 2 | `ueberfachlich-selbststeuerung` (**Pilot**) | Wie ich mein Handeln und Lernen steuere | `selbst-selbststeuerung` |
| 3 | `ueberfachlich-reflexion` | Wie ich mich und andere einschätze | `selbst-reflexion` |
| 4 | `ueberfachlich-herausforderungen` | Wie ich mit Herausforderungen umgehe | `selbst-herausforderungen` |
| 5 | `ueberfachlich-antrieb` | Was mich antreibt | `selbst-antrieb` |
| 6 | `ueberfachlich-zusammenarbeit` | Wie ich mit anderen zusammenarbeite | `selbst-zusammenarbeit` |
| 7 | `ueberfachlich-lernen` | Wie ich lerne und arbeite | `selbst-lernen` |

Die Titel sind die bewährten Blocktitel; die Ordnernamen folgen dem
zweiten Segment der Kennungen.

## 3. Aufbau je Modul

1. **Einschätzungsblock** – wörtlich der Block des Überblicksmoduls
   (gleiche id, gleicher Titel, gleiche Einleitung, dieselben
   Teilkompetenz-Kennungen in derselben Reihenfolge). Das KI-Interview
   hängt wie überall unter den Reglern.
2. **Kurze Theorie** – zwei bis drei Textblöcke von je 120 bis 200
   Wörtern: Du-Anrede, kurze Sätze, Beispiele aus dem Schulalltag.
3. **Aufgaben**, denen die Teilkompetenzen des Moduls zugeordnet sind
   (ein bis drei Kennungen je Aufgabe, jede Kennung mindestens einmal).
   Bevorzugt werden Aufgaben, die Anwenden verlangen:
   - **Simulation mit Abschlussfrage** für soziale Situationen,
   - **Freitext mit KI-Rückmeldung** für die Reflexion eigener
     Erfahrungen,
   - **Zuordnung** und **Quiz** für Strategien,
   - bei Bedarf ein **Lückentext** für Begriffe.
4. **Schlusstext «Wie weiter?»** – nennt den Unterschied zwischen Wissen
   und Können, lädt ein, die Einschätzung nach einigen Wochen zu
   wiederholen, und verweist auf den Überblick.

Der Block zeigt die frühere eigene Einschätzung als Marke am Regler;
jede weitere Einschätzung kommt als eigener Datenpunkt dazu. Den Hinweis
«Schätze dich jetzt noch einmal ein» am Modulende, den fachliche Module
tragen, gibt es in dieser Reihe bewusst nicht: Die überfachlichen
Ich-Sätze fragen nach Gewohnheiten («wie oft tust du das?»), und die
ändern sich nicht innerhalb einer Lektion. Sinnvoll ist die zweite
Einschätzung nach einigen Wochen – so sagt es der Schlusstext.

## 4. Wissen ist nicht Können

Aufgabenpunkte zeigen in diesen Modulen, dass jemand eine Strategie
**kennt** – nicht, wie oft sie oder er sie **anwendet**. So geht die
Plattform heute damit um (geprüft am Code, nichts geändert):

- **Netzdiagramm, Notenvorschlag, Lernstandsbericht:** Punkte aus
  Aufgaben mit überfachlichen Kennungen gehen dort **nicht** ein. Die
  Regel, die aus Aufgaben Datenpunkte macht, lässt überfachliche
  Kennungen aus. Im Netz stehen für diese Kompetenzen nur
  Einschätzungen (selbst, Mitschüler:innen, Lehrperson, KI-Interview).
- **Ausnahme Ausdauer und Rückschläge:** Aus dem Verhalten bei
  *jeder* Aufgabe der Plattform mit Punkten (auch in Fachmodulen)
  entstehen Belege für «Ich gehe mit Rückschlägen um» und «Ich zeige
  Ausdauer» – je Aufgabe, deren erster Versuch nicht ganz gelang: Wer
  weitermacht und sie löst, bekommt einen hohen Wert, wer sie liegen
  lässt, einen tiefen. Das misst Verhalten, nicht Wissen, hängt nicht an
  den Kennungen der Aufgabe und gilt für die Aufgaben der Reihe wie für
  alle anderen.
- **Kompetenz-Heatmap und Kompetenzprofil:** Dort erscheinen die
  Aufgaben der Reihe unter dem Ich-Satz der Teilkompetenz mit Punkten
  und Abdeckung. Das liest sich wie Können, misst aber Wissen. Eine
  Einstellung, um diese Zeilen auszublenden, gibt es nicht.

Folgerungen für die Reihe:

- Der Schlusstext jedes Moduls sagt den Unterschied ausdrücklich.
- Lehrpersonen lesen die Heatmap-Zeilen der überfachlichen Kompetenzen
  als «Strategien bekannt», das Netzdiagramm als «angewendet».
- Offen bleibt, ob die Heatmap diese Zeilen künftig anders beschriften
  oder eigene Wissens-Kennungen bekommen soll (siehe Abschnitt 7).

## 5. Übergang

- **Die Teilkompetenz-Kennungen ändern sich nicht.** Gespeicherte
  Einschätzungen hängen an der Kennung, nicht am Modul: Sie bleiben im
  Netzdiagramm sichtbar, gleich in welchem Modul sie entstanden sind.
- **Das bestehende Modul bleibt unverändert im Katalog**, bis die Reihe
  freigegeben ist.

Für die Zeit danach gibt es drei Wege:

| Weg | Folgen |
|---|---|
| **A – Überblick behalten** (empfohlen): Das bestehende Modul bleibt mit allen sechs Blöcken als Überblick (sequenz 1), die sechs Lernmodule kommen dazu. | Nichts geht verloren: Lernstand, Abschluss, Verweise der Belegspur und die Modul-id bleiben. Dieselbe Einschätzung ist dann an zwei Stellen erreichbar; das ist unschädlich, weil jeder Speichervorgang ein eigener Datenpunkt ist. Der Überblick bleibt die schnelle Gesamt-Einschätzung, die das Modul selbst alle paar Monate empfiehlt. |
| **B – Umbau zum ersten Reihenmodul:** Das bestehende Modul behält Ordner und id, verliert fünf Blöcke und bekommt Theorie und Aufgaben. | Die Modul-id bleibt erhalten. Aber: Titel und Beschreibung passen nicht mehr; die schnelle Gesamt-Einschätzung entfällt; Verweise der Belegspur auf die fünf entfernten Blöcke zeigen auf Blöcke, die es dort nicht mehr gibt; wer das heutige Modul schon abgeschlossen hat, behielte den Haken, obwohl neue Aufgaben dazukämen, und bekäme beim ersten Versuch sofort die Modul-Coins. |
| **C – später entfernen** | Einschätzungen bleiben im Netz. Lernstand und Belegspur zeigen dann aber nur noch den rohen Ordnernamen, und der Ordnername dürfte nie wiederverwendet werden. Kein Gewinn gegenüber A. |

**Zur Frage «bleibt die Modul-id erhalten, wenn das bestehende Modul das
erste der Reihe wird?»** Ja – in beiden Lesarten. Bei Weg A ist das
bestehende Modul unverändert das erste Modul der Reihe (sequenz 1), und
die weiteren kommen einfach dazu; id, Lernstand und Verweise bleiben
vollständig gültig. Bei Weg B bliebe die id ebenfalls, aber mit den
oben genannten Nebenwirkungen. Empfohlen ist darum Weg A.

Nach der Freigabe der Reihe genügt ein kleiner Nachzug im Überblick:
der Schlusstext verweist mit `[[modul:…]]` auf die sechs Lernmodule.

## 6. Pilot

`modules/ueberfachlich-selbststeuerung` – «Wie ich mein Handeln und
Lernen steuere» (LeSiMa-Bereich Selbständigkeit, Leitfrage «Wie steure
ich mein Handeln und Lernen?»):

1. Einschätzungsblock `selbst-selbststeuerung` (wörtlich aus dem
   Überblick, vier Teilkompetenzen)
2. Theorie: «Wichtig oder dringend?», «Ziele, an denen du dranbleibst»,
   «Selbst anfangen – und selbst entscheiden»
3. Quiz «Was kommt zuerst?» (Situationen entscheiden)
4. Zuordnung «Stolpersteine und Strategien»
5. Lückentext «Aus einem Wunsch wird ein Ziel»
6. Simulation «Der Nachmittag vor der Abgabe» mit Abschlussfrage
7. Freitext «Deine Erfahrung, dein Plan» (zwei Aufgaben mit
   KI-Rückmeldung)
8. Schlusstext «Wie weiter?»

Zusammen 18 Punkte in vier prüfenden Blöcken; jede der vier
Teilkompetenzen steht an mindestens einer Aufgabe. Die englische Fassung
ist über den Datei-Weg des Übersetzungswerkzeugs entstanden, wie die
Fassung des Überblicksmoduls; sie ist maschinell auf Struktur, ids und
Punkte geprüft, das sprachliche Gegenlesen steht aus.

## 7. Offene Entscheide

1. **Weg A, B oder C** für das bestehende Modul (Empfehlung: A).
2. **Heatmap-Lesart:** Sollen Aufgaben zu überfachlichen Kennungen in
   Heatmap und Kompetenzprofil als «Strategien bekannt» beschriftet
   werden, oder bekommen die Lernmodule eigene Wissens-Kennungen (neue
   Register-Einträge)? Bis dahin gilt die Lesart aus Abschnitt 4.
3. **Reihenfolge und Tempo** der übrigen fünf Module.
4. **Quellen:** Liegen die LeSiMa-Unterlagen mit den Beschreibungen der
   Kriterien vor, sollten die Theorie-Texte der Reihe daran geprüft
   werden.
5. **Kleiner Nachzug im Überblick:** Sein `ch`-Eintrag nennt die
   Kompetenz «Aufgaben und Probleme lösen»; die Lehrplan-Tabellen und
   das Pilotmodul schreiben «Aufgaben/Probleme lösen». Angleichen, wenn
   der Überblick ohnehin angefasst wird (Verweise auf die Reihe).

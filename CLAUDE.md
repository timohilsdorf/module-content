# module-content – Lernmodule für EveryCate

Öffentliches Content-Repo (CC BY-SA 4.0, Marken-Vorbehalt fürs Branding)
der Lernplattform [everycate](https://github.com/timohilsdorf/everycate)
(privat; Live: https://www.everycate.com). Ein Ordner je Modul unter
`modules/<slug>/` mit `module.json` (deutscher MASTER, Rechtschreibung
MIT ß – die Plattform zeigt bei ss-Lehrplänen automatisch «ss») und den
Bildern daneben; Sprachfassungen `module.<lang>.json` werden automatisch
aus dem Master erzeugt und NIE von Hand bearbeitet (UEBERSETZUNG.md).
Kompetenz-Tabellen unter `kompetenzen/`. Autoren-Doku: README.md,
CONTENT-ERSTELLEN.md, CONTENT-SCHEMA.md, UEBERSETZUNG.md; die Architektur-
und Rollout-Regeln der Plattform stehen in deren CLAUDE.md.

## Schema-Kopie (SYNC-Region)

`schema/schema.ts` ist die Kopie des Plattform-Schemas
(`src/lib/content/schema.ts` im everycate-Repo). Unterhalb der Zeile
`// ---- SYNC-BEGINN` müssen beide Dateien byteidentisch sein; die CI des
Plattform-Repos erzwingt das («Schema-Drift prüfen»). Welche Seite zuerst
gemerged wird (Plattform vor Content bei neuen Feldern/Typen, Content vor
Plattform bei Verengungen), regelt die Plattform-CLAUDE.md je Änderung.
Die Kopie wird hier mit dem `zod` DIESES Repos ausgeführt – die
zod-Version darum in beiden Repos gleich halten (seit 10.11.2026: 4.6.7,
angehoben wegen GHSA-mrhx-c7xc-m3w5). Folgen für Autor:innen seit zod
4.6 – für den Bestand ohne Wirkung (alle Moduldateien parsen
byteidentisch): (1) Liegt eine Liste ÜBER ihrer Längengrenze (z. B. mehr
als 12 Teilaufgaben), meldet der Validator nur noch «Too big …»; Fehler
in den einzelnen Elementen erscheinen erst nach dem Kürzen. (2)
Längengrenzen von Texten zählen Zeichen (Codepoints, ein Emoji = 1)
statt UTF-16-Einheiten. (3) Ein Schlüssel «__proto__» ist unzulässig
(vorher still entfernt). (4) `grades: []` oder mehr als 13 Klassenstufen
melden derzeit den Hinweis «… gehört in gradesText», obwohl die ANZAHL
falsch ist (offener Punkt in der Plattform-CLAUDE.md). Wegen (2) und (3)
sind Gültigkeit und Rollout nur deckungsgleich, solange beide Repos
dieselbe zod-Version tragen – die Hebungen zeitnah nacheinander mergen
und dazwischen keine fremden Content-PRs mergen (viele Emoji in einem
längenbegrenzten Feld nähme nur der neue Stand an, der Deploy-Hook-Build
der Plattform liefe dann rot).
Die Commit-Nachricht e5e69f5 («Gültig/ungültig ändert sich nicht») ist
in diesem Sinn zu eng gefasst.

## Einschätzungsblock in fachlichen Modulen (20.11.2026)

Der `einschaetzung`-Block kann seine Teilkompetenzen selbst bestimmen:
`{ "type": "einschaetzung", "id": "selbsteinschaetzung", "automatisch":
true }` schätzt über genau die Teilkompetenzen ein, die an den AUFGABEN
des Moduls stehen (Vereinigung ohne Dubletten, Reihenfolge des ersten
Vorkommens; Kern `wirksameEinschaetzungsKennungen` in der SYNC-Region).
Optional `ausgeschlossen` (einzelne Kennungen herausnehmen, Register-
Pflicht) und `kiInterview: false` (Interview unter den Reglern aus;
Standard: ein). Die explizite Liste bleibt (überfachliche Module).

- **Bestand (21.11.2026):** Der automatische Block steht als ERSTER
  Block in allen 51 fachlichen Modulen – seit 21.11.2026 auch in
  `englisch-cates-first-day`, dessen Aufgaben bis dahin keine
  Teilkompetenzen trugen (darum blieb der Block dort unsichtbar). Die
  sechs Lernmodule der überfachlichen Reihe haben an dieser Stelle den
  expliziten Block aus dem Überblick; `ueberfachlich-wie-lerne-ich` hat
  keine Aufgaben und sechs explizite Blöcke. Kein Modul ist mehr ohne
  Einschätzungsblock. Im Modus `automatisch` haben mehr als sechs
  Teilkompetenzen: `nationalsozialismus-erinnerung-heute` (15),
  `wirtschaft-politik-16-repetition-wirtschaft` (11) und
  `wirtschaft-politik-18-pausenkiosk-finanzberater` (8) – der Player
  klappt die Regler dort ein. Explizite Listen klappt er nie ein: Der
  Block `selbst-lernen` (acht Teilkompetenzen) in
  `ueberfachlich-wie-lerne-ich` und in `ueberfachlich-lernen` bleibt
  offen.
- **Folgen für Geräte mit Lernstand:** Jede Aufgabe, die neu eine
  Teilkompetenz bekommt, zählt in der Kompetenz-Heatmap ab sofort im
  Nenner dieser Teilkompetenz mit (die Heatmap rechnet über ALLE
  Aufgaben des Katalogs, Unbearbeitetes zählt 0). Mit den zwölf
  Aufgaben von `englisch-cates-first-day` sinken darum die Prozentwerte
  derer, die diese Aufgaben noch nicht bearbeitet haben (Beispiel:
  mögliche Punkte auf `en.grammatik.satzstrukturen-anwenden-a2`
  34 → 74). Die 28 Kennungen der fünf neuen Lernmodule standen bisher an
  keiner Aufgabe: Ihre Zeilen kommen neu dazu, in der Teilkompetenz-Sicht
  und unter dem Liechtensteiner Lehrplan sinkt dadurch kein Wert. Nur
  unter dem Lehrplan 21 (ch) teilen sie sich zwei Codes
  («Aufgaben/Probleme lösen.Lernprozesse gestalten»,
  «Selbstständigkeit.Aufgaben selbst beginnen») und drei Bereiche
  («Eigenständigkeit», «Aufgaben/Probleme lösen», «Selbstständigkeit»)
  mit Kennungen des Pilotmoduls – dort sinken die Werte derer, die den
  Pilot schon bearbeitet haben, die neuen Aufgaben aber noch nicht. Wer
  die Aufgaben schon gelöst hat, bekommt die Aufgabenpunkte im
  Netzdiagramm rückwirkend (Zeitpunkt des Versuchs). Modulfortschritt
  und gespeicherte Antworten ändern sich nicht.
- **Der Block trägt bewusst keine Texte** (Standardtitel und -einleitung
  kommen aus der Oberfläche, de/en). Darum liessen sich die 41
  englischen Fassungen ohne Schlüssel aus dem Speicher nachführen
  (`npm run uebersetze -- --sprache en --nur-veraltet`, Stempel
  `model: "speicher"`). Wer dem Block `title`/`intro` gibt, löst eine
  echte Übersetzung aus.
- **Validierung:** `einschaetzungsHinweise` (SYNC-Region, eine Regel mit
  der Plattform) meldet als HINWEIS, nie als Fehler: Aufgaben mit
  Teilkompetenzen ohne Einschätzungsblock, leere automatische Liste,
  wirkungsloser Ausschluss. Nur über Master (`checkModule`).
  `uebersetzung/test-einschaetzung.ts` beweist die Verdrahtung –
  bewusst OHNE Pflicht-Prüfung «jedes Modul hat den Block» (ein Test,
  der daran scheitert, machte den Hinweis zur Pflicht).
- **ROLLOUT:** Felder in einem bestehenden Blocktyp – die Plattform muss
  ZUERST deployt sein. Ältere Plattform-Stände lehnen `automatisch` hart
  ab (der Deploy-Hook-Build liefe rot, die Produktion bliebe auf dem
  alten Stand).
- **Gespeicherte Antworten hängen an der Block-POSITION:** 40
  `tasks`-Blöcke des Bestands haben keine `id`; ihre Antworten liegen
  unter `~tasks-<Position>`. Die Plattform zählt automatische
  Einschätzungsblöcke bei dieser Position nicht mit
  (`lernstandPosition` in deren `src/lib/content/meta.ts`) – nur darum
  durfte der Block an den Anfang. Für jeden ANDEREN Block gilt: nie vor
  einem `tasks`-Block ohne `id` einfügen, und einem veröffentlichten
  `tasks`-Block nie nachträglich eine `id` geben (beides trennt
  gespeicherte Antworten und bereits eingesammelte Reports von ihrer
  Aufgabe).

## Aufgaben ohne Teilkompetenzen (Stand 21.11.2026)

Nur Aufgaben MIT Teilkompetenzen erscheinen in Heatmap und Profil
(Aufgaben mit Punkten auch im Netzdiagramm) und speisen den
automatischen Einschätzungsblock. Bewusst ohne Kennung sind noch sechs
Aufgaben in vier Modulen:

- `demo-blockformat`: `num-blocktypen`, `term-blocktypen`,
  `achse-blocktypen` (reine Vorführ-Aufgaben für Zahlen, Terme und
  Zahlenstrahl; das Register hat keinen Mathematik-Bereich),
- `englisch-01-cates-sound-lab`: `quiz-warmup` (Musik-Wissensfragen zum
  Einstieg, keine Sprachkompetenz),
- `englisch-cates-first-day`: `f-reflection` (ist selbst eine
  Selbsteinschätzung),
- `wirtschaft-politik-16-repetition-wirtschaft`: der Freitext-Block
  «Vertiefung: Dein Weg zur Lernkontrolle» (Lernplanung; passende
  Kennungen wären überfachlich und liessen die automatische Liste von 11
  auf 13 wachsen).

Hausregel für Module des Betreibers: Wer eine neue Aufgabe schreibt,
gibt ihr `teilkompetenzen` (ein bis drei Kennungen aus
`kompetenzen/teilkompetenzen.json`). Für externe Autor:innen bleibt das
Feld freiwillig (CONTENT-ERSTELLEN.md); die Validierung verlangt es
nicht.

## Modulreihe «Überfachliche Kompetenzen» (20./21.11.2026)

`konzepte/ueberfachliche-modulreihe.md` beschreibt die Reihe: ein
Lernmodul je Einschätzungsblock des Überblicksmoduls
`ueberfachlich-wie-lerne-ich` (bleibt als `sequenz` 1 unverändert –
Weg A), Einheit «Überfachliche Kompetenzen». Gebaut sind alle sechs
Lernmodule (`sequenz` 2 bis 7): `ueberfachlich-selbststeuerung` (Pilot),
`-reflexion`, `-herausforderungen`, `-antrieb`, `-zusammenarbeit`,
`-lernen`. Bauplan je Modul: der Einschätzungsblock wörtlich aus dem
Überblick (gleiche id, gleiche Kennungen), drei Theorietexte mit
benannten Werkzeugen (mindestens eines je Text), Quiz, Zuordnung,
Lückentext, Rollenspiel mit
Abschlussfrage, ein Freitext-Block mit zwei Aufgaben, Schlusstext «Wie
weiter?» (`-lernen` hat wegen acht Teilkompetenzen ein zweites Quiz).
Die Teilkompetenz-Kennungen ändern sich nie (Kennungsschutz).

- **Keine Unterscheidung «Wissen ist nicht Können» mehr**
  (Betreiber-Entscheid 21.11.2026): Der Schlusstext sagt, was geübt
  wurde, und lädt zur zweiten Einschätzung nach einigen Wochen ein.
- **Auswertung** (Plattform-Stand 21.11.2026): Aufgabenpunkte auf
  `uef`-Kennungen erscheinen in Heatmap, Profil und Lernstandsbericht
  UND im Netzdiagramm samt Notenvorschlag – gleiche Rechnung wie
  fachliche Aufgabenpunkte. Ein Rollenspiel mit Abschlussfrage zählt
  einen Punkt und wiegt im Netz entsprechend wenig (im Bestwert-Verlauf
  ein Zehntel einer 10-Punkte-Aufgabe, unter «versuchsgewichtet» den
  einen erreichten Punkt); darum steht JEDE Teilkompetenz eines Moduls
  an mindestens einer prüfenden Aufgabe mit vier oder mehr Punkten.
- **Die zwei Quoten-Kennungen**
  (`uef.herausforderungen.rueckschlaege-meistern`, `…ausdauer-zeigen`)
  speist die Plattform zusätzlich aus dem Verhalten bei allen Aufgaben
  (Quoten). Sie dürfen an NEUEN Aufgaben stehen (so im Modul
  `-herausforderungen`), aber nie nachträglich an eine Aufgabe gehängt
  werden, an der zwischen 26.9. und 12.10.2026 gearbeitet wurde (ein
  Alt-Punkt der früheren Regel verdrängte sonst den echten Wert –
  Plattform-CLAUDE.md, «Überfachliche Aufgabenpunkte im Netzdiagramm»).
- **Rollenspiele:** vollständig vorgegeben, Figur ist eine Mitschülerin
  oder ein Mitschüler in schwacher Ausgangslage, nie gemein; der
  Rollen-Auftrag verbietet Privates, Beleidigungen und Ratschläge im Ton
  einer Lehrperson. Jede Auswertung muss für JEDEN Weg zu ihrem Endpunkt
  stimmen (häufigster Fund der Prüfrunden).
- **Offen:** LeSiMa-Originalunterlagen liegen im Repo nicht vor, die
  Texte sind eigene Formulierungen. Vor der Veröffentlichung sollte eine
  Lehrperson gegenlesen – besonders die heiklen Stellen (Hinweis auf
  Hilfe bei starker Belastung in `-herausforderungen`; abwertender Witz
  über einen Akzent und die Mitschülerin, die erst Deutsch lernt, in
  `-zusammenarbeit`). Die englischen Fassungen entstanden über den
  Datei-Weg (`--auftrag-datei` / `--antworten-datei`); ein Gegenlesen
  durch eine Person mit Englisch als Unterrichtssprache steht aus. Der
  Überblick verweist noch nicht auf die Lernmodule.

## Prüfläufe (entsprechen `.github/workflows/validate.yml`)

```bash
npm ci                           # Node 26 laut .nvmrc (CI); Node 22 der Cloud-VM genügt ebenso
npx tsc --noEmit                 # Typecheck Validator + Übersetzungs-Werkzeug
npm run test:uebersetzung        # Unit-Nachweis der Übersetzungs-Verdrahtung
npm run validate                 # alle Module gegen Schema, Whitelist, Medien, IDs
npm run uebersetzungs-status     # Matrix Modul × Sprache (informativ)
```

Stand 5.11.2026 in der Cloud (Node 22): alle vier Prüfungen grün
(52 Module gültig, 22 Unit-Fälle, 42 Fassungen aktuell, 10 ausgenommen);
am 10.11.2026 mit zod 4.6.7 unter Node 22 und 26 unverändert grün, `npm audit`
meldet 0.
Stand 20.11.2026: 53 Module gültig, 50 Unit-Fälle (14 + 22 + 14),
43 Fassungen aktuell, 10 ausgenommen.
Stand 21.11.2026: 58 Module gültig, 50 Unit-Fälle, 48 Fassungen aktuell,
10 ausgenommen.
`npm run uebersetze` braucht `ANTHROPIC_API_KEY` (api.anthropic.com).

## Konventionen

- Der Betreiber committet mit `8818560+timohilsdorf@users.noreply.github.com`
  (repo-lokal konfiguriert); externe Autor:innen committen unter ihrer
  eigenen GitHub-Identität – `scripts/install_pkgs.sh` setzt bewusst KEINE
  Identität (öffentliches Repo, auch allein in fremden Cloud-Sessions in
  Gebrauch). Commit-Messages und Doku in Schweizer Schreibweise («ss»),
  Modulinhalte in deutscher Rechtschreibung mit ß.
- Branch Protection auf `main` (auch für Admins): PR mit 1 Freigabe und
  grünem `validate`-Check; direkte Pushes werden abgelehnt. Eigene
  Betreiber-PRs: enforce_admins kurz aus, mergen, sofort wieder an
  (`gh api -X DELETE/POST repos/timohilsdorf/module-content/branches/main/protection/enforce_admins`).
- Nach dem Merge löscht GitHub den PR-Branch automatisch; nie mehr auf
  einen gemergten Branch pushen (Merge-Timing-Falle). Der pre-push-Guard
  `scripts/git-hooks/pre-push` prüft das per REST und blockt nur, wenn der
  gemergte PR-Stand im eigenen Verlauf liegt und lokale Commits am
  Merge-Commit vorbei darauf aufsetzen (alter Branch nach dem Merge
  weitergeführt, auch mit nachgezogenem main) – ein wiederverwendeter
  Name, frisch von origin/main abgezweigt oder darauf rebased, bleibt
  erlaubt und bekommt nur den Hinweis, dass der Push an keinem offenen
  PR hängt (seit 9.11.2026 auch nach Merge-Commit-Merges). Aktiv als KOPIE in `.git/hooks/pre-push` (lokal
  einmal je Klon `cp scripts/git-hooks/pre-push .git/hooks/`, in
  Cloud-Sessions kopiert `scripts/install_pkgs.sh` sie aus origin/main) –
  bewusst kein `core.hooksPath` in den Arbeitsbaum, weil ein ausgecheckter
  fremder PR-Branch den Hook ersetzen könnte. Grenze bei Fork-Workflows:
  Das Upstream-Repo wird nur geprüft, wenn ein Remote «upstream»
  eingetragen ist.
- Der `deploy`-Job ruft nach jedem Merge auf `main` den Vercel Deploy
  Hook der Plattform auf – neue Inhalte gehen DIREKT auf Produktion; die
  PR-Freigabe ist die Freigabe.

## Arbeiten in der Cloud (Claude-Code-Cloud-Sessions, seit 5.11.2026)

- **Inhaltsänderungen ausschliesslich per Pull Request von einem
  Feature-Branch**; `main` ist geschützt. Vorschau vor dem Merge: im
  Plattform-Repo den Actions-Workflow «Content-PR-Vorschau»
  (workflow_dispatch mit PR-Nummer) starten.
- **PRs und Issues über die eingebauten GitHub-Werkzeuge oder `gh api`
  (REST).** `gh pr`/`gh issue` nutzen GraphQL und bekommen in
  Cloud-Sessions 403.
- **Keine lokalen Pfade.** Kein `~/…`, kein vorausgesetztes
  Nachbarverzeichnis. Das Plattform-Repo wird bei Bedarf als zweites
  Repo in die Session geholt (beim Start auswählen oder `add_repo`), etwa
  für den Abgleich der SYNC-Region (`diff` der Bereiche ab
  `// ---- SYNC-BEGINN`) oder einen Doppel-Lauf des Plattform-Validators
  (dessen `scripts/sync-content.mjs` verlinkt dann `content/` auf diesen
  Checkout). In einer Zwei-Repo-Session liegt das Arbeitsverzeichnis eine
  Ebene über den Klonen – Bash-Aufrufe mit absoluten Pfaden.
- **SessionStart-Hook:** `.claude/settings.json` ruft bei `startup|resume`
  `scripts/install_pkgs.sh` auf (`npm ci`, nur bei
  `CLAUDE_CODE_REMOTE=true`, übersprungen solange package.json,
  package-lock.json und das Skript unverändert sind – Hash-Datei in
  `node_modules/`; kopiert zudem den pre-push-Guard nach .git/hooks/,
  setzt aber keine Commit-Identität). Das ist der Normalfall für Content-Autor:innen, die
  dieses Repo ALLEIN in ihrer eigenen Cloud-Umgebung öffnen (Ein-Repo-
  Session → Hook greift, Node 22 der VM reicht). Nur in Sessions mit
  mehreren Repos lädt Claude Code keine Hooks aus den Repo-Settings; dort
  ruft das Setup-Skript der Cloud-Umgebung des Betreibers das Skript auf
  (Vorlage in der Plattform-CLAUDE.md, Abschnitt «Arbeiten in der Cloud»).
- **Netzwerk per Allowlist:** npm-Registry und GitHub (Proxy, nur
  angehängte Repos) sind erreichbar, Bild-Hosts wie commons.wikimedia.org
  nicht – die Medienprüfung des Validators arbeitet ohnehin auf den
  Dateien im Modulordner und der Host-Whitelist, nicht per Download.

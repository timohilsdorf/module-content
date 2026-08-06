# Ein neues Lernmodul erstellen – Anleitung für Lehrpersonen

Du brauchst **keine Programmierkenntnisse**. Du brauchst nur:

1. einen KI-Chat deiner Wahl (z. B. [Claude](https://claude.ai),
   ChatGPT, …),
2. einen GitHub-Account (kostenlos, [github.com/signup](https://github.com/signup)) mit
   Zugriff auf dieses Repository *(solange das Repository privat ist, muss
   dich der Betreiber einmalig als Mitarbeiterin einladen)*,
3. etwa 30–60 Minuten.

Der Weg: Die KI schreibt dir das Modul als eine einzige Datei
(`module.json`), du liest sie kritisch gegen, lädst sie über die
GitHub-Webseite hoch und reichst sie als «Pull Request» ein – das ist ein
Änderungsvorschlag, den jemand prüft und freischaltet. Solange du wie
unten beschrieben den Weg über den Pull Request wählst, geht **nichts
direkt live** – du kannst also nichts kaputt machen.

*(Hinweis für den Repository-Betreiber: Sobald das Repository öffentlich
ist, Branch-Schutz für `main` aktivieren – Settings → Branches bzw.
Rules → «Require a pull request before merging» –, damit das auch
technisch garantiert ist. Auf dem GitHub-Free-Plan ist das bei privaten
Repositories nicht verfügbar; bis dahin keine Schreibrechte an
Mitwirkende vergeben, sondern PRs aus Forks arbeiten lassen.)*

---

## Schritt 1: Modul mit der KI entwerfen

Öffne deinen KI-Chat und kopiere die folgende Vorlage hinein. Ersetze nur
die vier Angaben in den ersten Zeilen (Thema, Fach, Zyklus, Kompetenzen —
Kompetenzcodes findest du auf [lehrplan21.ch](https://www.lehrplan21.ch)
oder du lässt die KI Vorschläge machen und prüfst sie dort nach).

> **Prompt-Vorlage (kopieren und ausfüllen):**
>
> ```text
> Erstelle mir ein Lernmodul für die Lernplattform EveryCate.
>
> Thema: [DEIN THEMA, z. B. «Der Wasserkreislauf»]
> Fach (Lehrplan-21-Kürzel): [z. B. NT, RZG, D, MA, NMG]
> Zyklus: [1, 2 oder 3 — Zyklus 3 = Sekundarstufe I]
> Lehrplan-21-Kompetenzen: [z. B. NT.3.2 — oder: «schlage passende vor»]
>
> Das Modul ist eine einzige JSON-Datei nach folgendem Format. Halte dich
> exakt daran:
>
> - Pflichtfelder: "schemaVersion": 2, "id" (nur Kleinbuchstaben, Ziffern,
>   Bindestriche), "title", "description" (1–3 Sätze), "subject",
>   "cycle", "learningObjectives" (Liste von «Ich kann …»-Sätzen),
>   "blocks" (Liste der Inhaltsblöcke).
> - Empfohlen: "subjectName" (ausgeschriebener Fachname), "grades",
>   "durationMinutes", "difficulty" («leicht», «mittel» oder
>   «anspruchsvoll»), "keywords", "competencies" (Liste von
>   {"code", "description"}), "curriculum" (Lehrplan-Referenzrahmen,
>   Standard "lehrplan21"), "sources" (Liste von {"title", "url"}),
>   "license": "CC BY-SA 4.0", "authors".
> - Gehört das Modul zu einer Reihe: "sequenz" (Lernreihenfolge innerhalb
>   von Fach/Einheit, ganze Zahl, 1 = zuerst – der Katalog sortiert
>   danach, nicht nach Dateinamen) und "einheit" (Name der Themengruppe,
>   z. B. "Themenblock A: Grundbegriffe und Wirtschaftskreislauf" –
>   Module mit gleichem Wert erscheinen im Katalog als ein Lernpfad).
> - Blocktypen für "blocks":
>   1. {"type":"text","title":"…","body":"… Markdown erlaubt, KEIN HTML …"}
>   2. {"type":"video","provider":"youtube","videoId":"NUR die Video-ID
>      (bei YouTube die ca. 11 Zeichen nach watch?v=), nicht die
>      URL","title":"…","description":"Worauf achten?",
>      "transcript":"kurze Textzusammenfassung des Videos"}
>      (nur YouTube oder Vimeo – fremde Videoquellen werden abgelehnt;
>      ein eigenes Video im Modulordner geht mit
>      {"type":"video","provider":"url","url":"/content/<id>/film.mp4"})
>   3. {"type":"image","src":"/content/<id>/bild.jpg","alt":"Pflicht:
>      Bildbeschreibung","caption":"…","credit":"Quelle & Lizenz"}
>   4. {"type":"tasks","title":"Aufgaben","tasks":[{"prompt":"…",
>      "hint":"…","solution":"…"}]}
>   5. {"type":"lueckentext","id":"lt1","modus":"wortbank","title":"…",
>      "text":"Satz mit {{1}} und {{2}} als Lücken.",
>      "luecken":[{"antworten":["Lösung 1","Synonym"]},
>      {"antworten":["Lösung 2"]}],"ablenker":["falsches Wort"]}
>      – automatisch geprüfter Lückentext mit eindeutiger "id" (Pflicht,
>      wie bei Quizfragen). "text" ist reiner Text (kein Markdown);
>      {{1}}, {{2}}, … markieren die Lücken, jede genau einmal.
>      "antworten" = akzeptierte Lösungen inkl. Synonyme (Gross-/
>      Kleinschreibung ist standardmässig egal). Modus "wortbank" bietet
>      die Wörter als Auswahl an ("ablenker" = zusätzliche falsche
>      Wörter); Modus "eingabe" zeigt Freitextfelder (dann kein "ablenker").
>   6. {"type":"lueckentext","id":"sb1","modus":"satzbau","title":"…",
>      "bausteine":["Die Validierung","prüft","vor dem Merge","jedes Modul"],
>      "alternativen":[[1,2,4,3]],"ablenker":["per E-Mail"]}
>      – Satzbau: Die Lernenden bringen die "bausteine" in die richtige
>      Reihenfolge (angezeigt werden sie gemischt). "bausteine" stehen im
>      JSON in der KORREKTEN Reihenfolge; "alternativen" (optional) sind
>      weitere gültige Reihenfolgen als 1-basierte Indizes (z. B. für
>      verschiebbare Satzglieder – JEDE gelistete Reihenfolge muss ein
>      korrekter Satz sein); "ablenker" gehören nicht in die Lösung.
>      Kein "text"/"luecken" in diesem Modus.
>   7. {"type":"zuordnung","id":"zu1","title":"…","paare":[
>      {"links":{"text":"Begriff"},"rechts":{"text":"Definition"}},
>      {"links":{"text":"Begriff 2"},"rechts":{"bild":{"src":
>      "/content/<id>/bild.jpg","alt":"Pflicht-Beschreibung",
>      "credit":"Quelle & Lizenz (Pflicht)"}}}]}
>      – Zuordnung: 2–12 Paare, jedes Element entweder "text" ODER "bild"
>      (Bilder mit alt und credit als Pflicht, gleiche Bildregeln wie
>      beim image-Block). Bedient wird rein per Antippen (links und
>      rechts in beliebiger Reihenfolge). KEINE Ablenker (seit 5.8.2026):
>      Jedes linke Element hat genau ein rechtes Gegenstück – die
>      früheren Felder "ablenker"/"ablenkerLinks" lehnt die Validierung
>      ab. Die Elemente jeder Spalte müssen unterscheidbar sein.
>   8. {"type":"audio","id":"hoeren1","title":"Pflicht-Titel",
>      "vorleseText":"Text, den der Browser vorliest (bevorzugter Weg)",
>      "vorleseSprache":"en-GB","description":"Höraufgabe …",
>      "src":"/content/<id>/aufnahme.mp3",
>      "credit":"mit src Pflicht: Quelle & Lizenz"}
>      – Hörverstehen: Der Browser liest "vorleseText" mit einer Stimme
>      der angegebenen Sprache vor (bevorzugt – die Lernenden können die
>      Stimme wählen); die .mp3/.m4a-Datei im Modulordner (wie Bilder
>      hochladen) ist die Rückfallebene ohne passende Stimme. Beides
>      zusammen ist ideal und muss dann WORTGLEICH sein; jede Quelle geht
>      auch allein. Danach folgt idealerweise ein Lückentext, eine
>      Zuordnung oder ein Quiz zum Gehörten. Nur Aufnahmen mit geklärter
>      Lizenz. Ohne "src" entfällt "transcript" (der "vorleseText" ist
>      der Text); mit "src" allein ist "transcript" dringend empfohlen.
>      Es darf NUR entfallen, wenn die Lernenden das Gehörte selbst
>      eintippen sollen; "transkriptAnzeigen": false blendet Transkript
>      bzw. Vorlesetext dafür aus, ohne sie zu löschen.
>   9. {"type":"simulation","id":"sim1","title":"…","intro":"Szenario …",
>      "figur":{"name":"Frau Keller","rolle":"Gemeindepräsidentin"},
>      "start":"k1","knoten":[
>      {"id":"k1","text":"Was die Figur sagt …","antworten":[
>      {"text":"Antwort A","weiter":"k2"},{"text":"Antwort B","weiter":"k3"}]},
>      {"id":"k2","text":"…","antworten":[{"text":"…","weiter":"k9"},
>      {"text":"…","weiter":"k3"}]},
>      {"id":"k9","text":"Schluss …","auswertung":"Rückblick …"}]}
>      – verzweigtes Rollenspiel-Gespräch: Die Figur spricht, die
>      Lernenden wählen aus 2–4 "antworten"; "weiter" nennt die id des
>      nächsten Knotens. Ein Knoten OHNE "antworten" ist ein Endpunkt
>      (optional mit "auswertung" als Rückblick). Jeder Knoten muss vom
>      Start aus erreichbar sein. Optional macht eine "abschlussfrage"
>      (eine einzelne Quizfrage mit eigener id, gleiche Form wie im
>      Quiz) den Block zu einem automatisch ausgewerteten Block.
> - Quizze sind normale Blöcke in "blocks": {"type":"quiz","id":"quiz1",
>   "title":"…","questions":[…]} – beliebig oft und an beliebiger
>   Position (z. B. ein kurzes Quiz nach jedem Kapitel oder eines am
>   Ende), jeder Quizblock braucht eine eigene "id" und wird einzeln
>   ausgewertet. 4–8 Fragen pro Quiz sind ein guter Richtwert. Fragetypen:
>   - {"id":"q1","type":"single_choice","prompt":"…","options":[{"text":"…",
>     "correct":true},{"text":"…"}],"explanation":"…"} (genau EINE Option correct)
>   - {"id":"q2","type":"multiple_choice", …, "points":2} (mehrere correct erlaubt)
>   - {"id":"q3","type":"true_false","prompt":"Aussage.","answer":false,
>     "explanation":"…"}
>   Jede Frage braucht eine eindeutige "id" ("q1", "q2", …) und eine
>   "explanation" (das ist der Lernmoment!).
>
> Inhaltliche Vorgaben:
> - Deutsch, Anrede «du», Schweizer Schreibweise (ss statt ß).
> - Aufbau: packender Einstieg mit Alltagsbezug → Video → vertiefender
>   Text → Lückentext → Aufgaben (mit Tipp und Musterlösung) → Quiz.
>   6–9 Blöcke.
> - Nur YouTube-Videos vorschlagen, die wirklich existieren und seriös
>   sind (Bildungskanäle) — gib mir Titel und Kanal an, damit ich sie
>   prüfen kann.
> - Konkrete (Schweizer) Beispiele, jede Jahreszahl/Zahl muss stimmen.
> - Als letzte Aufgabe etwas im Stil «Erkläre es jemandem» oder «Erstelle
>   selbst eine Quizfrage».
>
> Gib mir NUR den JSON-Inhalt der Datei module.json aus, ohne Erklärtext.
> ```

Das vollständige, technisch präzise Format steht in
[`CONTENT-SCHEMA.md`](CONTENT-SCHEMA.md) – bei Unklarheiten kannst du der
KI auch den Inhalt dieser Datei mitgeben.

> **Hinweis:** Den Blocktyp `planspiel` (eingebettete HTML-Lernspiele)
> gibt es zwar auch – er steht Lehrpersonen aber **nicht** offen, weil
> eingebetteter Programmcode eine technische Sicherheitsprüfung braucht,
> die nur das EveryCate-Kernteam leisten kann. Bitte keine `planspiel`-
> Blöcke oder HTML-Dateien einreichen; solche Pull Requests werden
> abgelehnt. Interaktive Elemente für dein Modul erreichst du mit
> Lückentexten, Quizzen und dem Simulations-Gespräch (Punkt 6).

## Schritt 2: Kritisch gegenlesen (wichtig!)

Die KI ist deine Assistenz, **du bist die Fachperson**. Prüfe vor dem
Einreichen:

- ☐ Stimmen alle Fakten, Zahlen und Jahreszahlen? (Stichproben googeln)
- ☐ Existieren die Videos wirklich? Öffne jede Video-ID als
  `youtube.com/watch?v=DIE-ID` — passt Inhalt, Niveau, Seriosität?
- ☐ Ist bei jeder Quizfrage die als richtig markierte Antwort wirklich
  richtig?
- ☐ Passen Sprache und Niveau zu deiner Stufe?
- ☐ Keine Urheberrechtsverletzungen: Bilder nur mit freier Lizenz
  (am einfachsten [Wikimedia Commons](https://commons.wikimedia.org)),
  mit Quellenangabe im Feld "credit".

Bitte die KI einfach um Korrekturen («Frage 3 ist falsch, weil …») und
lass dir die Datei neu ausgeben.

## Schritt 3: Auf GitHub einreichen (nur Webbrowser)

1. Öffne das Repository:
   **https://github.com/timohilsdorf/module-content** (eingeloggt).
2. Navigiere in den Ordner `modules/`.
3. Klicke oben rechts **Add file → Create new file**.
4. Gib als Dateinamen ein:
   `DEINE-MODUL-ID/module.json`
   *(genau die «id» aus deinem JSON, dann Schrägstrich, dann
   `module.json` – der Schrägstrich erzeugt automatisch den Ordner).*
5. Füge den JSON-Inhalt aus dem KI-Chat in das grosse Textfeld ein.
6. Klicke **Commit changes…** Im Dialog:
   - Beschreibung z. B. «Neues Modul: Der Wasserkreislauf (NT, Zyklus 3)».
   - **Achtung:** Die oberste Option «Commit directly to the `main`
     branch» ist vorausgewählt — wähle stattdessen bewusst
     **«Create a new branch for this commit and start a pull request»**,
     sonst landet deine Änderung ungeprüft auf `main`.
   - **Propose changes** → auf der nächsten Seite **Create pull request**.
7. Fertig! Dein Vorschlag wird nun automatisch geprüft (jeder Pull
   Request durchläuft die Validierung; Fehler werden dir direkt im Pull
   Request angezeigt – die Fehlermeldungen kannst du wieder der KI zum
   Korrigieren geben). Danach schaut ein Mensch drüber und schaltet das
   Modul frei. Nach dem Freischalten erscheint das Modul automatisch auf
   der Website – du musst nichts weiter tun.

**Falls dein Modul eigene Bilder oder Hördateien hat:** Beide gehören in
denselben Ordner wie deine `module.json` – und diesen Ordner hast du in
Punkt 4 oben bereits erzeugt. Für Hördateien gilt: Format `.mp3` oder
`.m4a` (mono, 64–96 kbit/s genügen für Sprache – so bleibt eine Minute
unter 1 MB, Obergrenze siehe `maxAudioSizeKB` in der Whitelist), nur
Aufnahmen mit geklärter Lizenz (Nachweis ins Pflichtfeld `credit`), bei
eigenen Aufnahmen mit erkennbaren Stimmen die Einwilligung der
Sprechenden einholen. So lädst du die Dateien im selben Pull Request
hoch:

1. Gehe zurück zur Startseite des Repositories (Tab **«Code»** oben links).
2. Wechsle dort über das Branch-Menü (steht auf «main») in deinen neuen
   Branch (er heisst z. B. `timo-patch-1`).
3. Navigiere in deinen Ordner `modules/DEINE-MODUL-ID/` → **Add file →
   Upload files** → Bilder hineinziehen → wieder in deinen Branch
   committen («Commit directly to …» – hier ist das richtig, weil dein
   Branch ja erst per Pull Request geprüft wird).

Die Pfade im JSON müssen dazu passen:
`/content/DEINE-MODUL-ID/bildname.jpg` *(der Pfad beginnt mit
`/content/`, obwohl die Datei bei der `module.json` liegt – unter diesem
Pfad liefert die Plattform die Bilder aus)*.

## Häufige Fehler

| Problem | Lösung |
|---|---|
| «module.json entspricht nicht dem Schema» im Pull Request | Fehlermeldung kopieren und der KI geben: «Korrigiere das». |
| Video-ID wird abgelehnt | YouTube: nur die Zeichen nach `watch?v=` (üblich 11); Vimeo: nur die Zahl aus der URL. Nie die ganze URL eintragen. |
| «Video-Provider … ist nicht freigegeben» | Nur YouTube oder Vimeo verwenden (siehe `schema/whitelist.json`). |
| «Roh-HTML in …» | HTML-Tags (z. B. `<b>`, `<br>`) entfernen lassen — Formatierung geht mit Markdown (`**fett**`, Absätze durch Leerzeile). |
| «Simulation: … nicht erreichbar» oder «verweist auf unbekannten Knoten» | Jede `weiter`-Angabe muss auf eine existierende Knoten-`id` zeigen, und jeder Knoten muss vom `start` aus erreichbar sein — Fehlermeldung der KI geben: «Korrigiere die Verzweigungen». |
| Blocktyp `planspiel` wird abgelehnt | Dieser Typ steht nur dem EveryCate-Kernteam offen (eingebetteter Code braucht eine Sicherheitsprüfung). Nutze Lückentext, Quiz oder Simulation. |
| Umlaute sehen kaputt aus | Datei muss UTF-8 sein — beim Kopieren aus dem Chat normalerweise automatisch der Fall. |
| «ß» im Text | Schweizer Schreibweise: durch «ss» ersetzen (lassen). |

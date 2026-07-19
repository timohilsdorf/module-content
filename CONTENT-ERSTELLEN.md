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
> - Blocktypen für "blocks":
>   1. {"type":"text","title":"…","body":"… Markdown erlaubt, KEIN HTML …"}
>   2. {"type":"video","provider":"youtube","videoId":"NUR die Video-ID
>      (bei YouTube die ca. 11 Zeichen nach watch?v=), nicht die
>      URL","title":"…","description":"Worauf achten?",
>      "transcript":"kurze Textzusammenfassung des Videos"}
>      (nur YouTube oder Vimeo – andere Videoquellen werden abgelehnt)
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

**Falls dein Modul eigene Bilder hat:** Die Bilder gehören in denselben
Ordner wie deine `module.json` – und diesen Ordner hast du in Punkt 4
oben bereits erzeugt. So lädst du die Bilder im selben Pull Request hoch:

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
| Umlaute sehen kaputt aus | Datei muss UTF-8 sein — beim Kopieren aus dem Chat normalerweise automatisch der Fall. |
| «ß» im Text | Schweizer Schreibweise: durch «ss» ersetzen (lassen). |

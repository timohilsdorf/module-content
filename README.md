# EveryCate – Lernmodule

Die offene Modulsammlung der Lernplattform
[EveryCate](https://everycate.vercel.app): **ein Modul = ein Ordner** mit
einer `module.json` (Text, Bilder, Videos, Aufgaben, Quiz) und den
zugehörigen Bilddateien. Keine Datenbank, kein CMS – Inhalte sind reine
Dateien, versionierbar und per Pull Request erweiterbar.

Die Plattform selbst (Player, Lernstand, PWA) lebt in einem separaten
Repository und bindet diese Sammlung beim Build ein: **Ein gemergter Pull
Request hier genügt, damit ein neues Modul auf der Website erscheint** –
am Plattform-Code muss dafür nichts geändert werden.

## Ein Modul beitragen

**Ohne Programmierkenntnisse** (nur Browser + KI-Chat):
[`CONTENT-ERSTELLEN.md`](CONTENT-ERSTELLEN.md) führt Schritt für Schritt
durch den Weg – KI schreibt die Datei, du liest kritisch gegen, reichst
sie als Pull Request ein.

**Mit Git** (Voraussetzung: [Node.js](https://nodejs.org) ≥ 20.9):

```bash
git clone https://github.com/timohilsdorf/module-content.git
cd module-content
npm install

# Modul anlegen: modules/<meine-id>/module.json (+ Bilder in denselben Ordner)
npm run validate   # muss grün sein
# → Branch, Commit, Pull Request
```

Das Format ist in [`CONTENT-SCHEMA.md`](CONTENT-SCHEMA.md) vollständig
dokumentiert (auch als Vorlage für KI-Autoren); ein lebendes Beispiel mit
allen Blocktypen liegt in
[`modules/demo-blockformat/`](modules/demo-blockformat/module.json).

Änderungen gehen **ausschliesslich über Pull Requests** auf `main` und
werden vor dem Merge geprüft – inhaltlich von einem Menschen, technisch
von der automatischen Validierung.

## Ablage

```
modules/
  mein-modul/                ← Ordnername = "id" im JSON
    module.json              ← das Modul
    karte.jpg                ← Bilder direkt daneben
schema/
  schema.ts                  ← maschinenlesbares Schema (Zod)
  whitelist.json             ← erlaubte Video-Provider/-Hosts, Bild-Hosts, …
  validate.ts                ← Validierung (läuft lokal und in der CI)
```

Bilder werden im JSON als `/content/<modul-id>/<datei>` referenziert –
unter diesem Pfad liefert die Plattform sie später aus.

## Validierung (Sicherheitsnetz)

`npm run validate` prüft jedes Modul; in der CI markiert ein Verstoss den
Pull Request als fehlgeschlagen:

- gültiges JSON, Schema-konform, nur bekannte Feldnamen (Tippfehler-Schutz)
- nur erlaubte Blocktypen (`text`, `image`, `video`, `tasks` plus
  freigegebene Zukunftstypen aus [`schema/whitelist.json`](schema/whitelist.json))
- Videos nur von erlaubten Providern (aktuell YouTube, Vimeo)
- kein Roh-HTML in Textfeldern (Inhalte sind Markdown; der Player rendert
  HTML nicht)
- Bilder liegen im Modulordner (erlaubte Endungen), Remote-Bilder nur von
  freigegebenen Hosts
- eindeutige IDs, Pflicht-IDs für Quizfragen, saubere Modulordner

## Lokale Entwicklung mit der Plattform

Wer an der Plattform selbst arbeitet, klont beide Repositories
nebeneinander – die Plattform findet die Module dann automatisch:

```
projekte/
  everycate/          ← Plattform (Next.js, privat)
  module-content/     ← dieses Repository
```

Alternativ zeigt die Umgebungsvariable `EVERYCATE_CONTENT_DIR` im
Plattform-Repo auf einen beliebigen Checkout dieser Sammlung. Details im
README der Plattform.

## Lizenz

Die Lizenz für die Inhalte dieses Repositories wird derzeit festgelegt.
Einzelne Module deklarieren ihre Lizenz bereits im Feld `license`;
Bildnachweise stehen bei jedem Bild im Feld `credit` und gelten unabhängig
von der Repositoriums-Lizenz.

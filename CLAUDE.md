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
angehoben wegen GHSA-mrhx-c7xc-m3w5). Sichtbare Folge für Autor:innen:
Liegt eine Liste ÜBER ihrer Längengrenze (z. B. mehr als 12
Teilaufgaben), meldet der Validator nur noch «Too big …»; Fehler in den
einzelnen Elementen erscheinen erst nach dem Kürzen.

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

#!/bin/bash
# Abhängigkeiten in Claude-Code-CLOUD-Sessions installieren (npm ci).
#
# Aufrufer:
#  (1) SessionStart-Hook aus .claude/settings.json (Matcher startup|resume) –
#      wirkt NUR in Sessions mit EINEM Repo: In Sessions mit mehreren Repos
#      lädt Claude Code keine Hooks aus den Repo-Settings (Doku
#      cloud-environments, «Limitations in cloud sessions»).
#  (2) Das Setup-Skript der Cloud-Umgebung für Mehr-Repo-Sessions – es
#      startet eine Ebene ÜBER den Klonen und setzt CLAUDE_CODE_REMOTE selbst:
#        for r in everycate module-content; do
#          [ -f "$r/scripts/install_pkgs.sh" ] && CLAUDE_CODE_REMOTE=true bash "$r/scripts/install_pkgs.sh" || true
#        done
#  (3) Von Hand in der Session: bash scripts/install_pkgs.sh
#
# Verhalten:
#  - Lokal (CLAUDE_CODE_REMOTE != true) sofort Exit 0 – nie auf dem Mac.
#  - npm ci läuft nur, wenn sich eine der Eingabedateien (package.json,
#    package-lock.json, .npmrc, Workspace-Manifest, dieses Skript) seit dem
#    letzten ERFOLGREICHEN Lauf geändert hat. Hash-Datei liegt in
#    node_modules/ (gitignored, verschwindet mit den Paketen).
#  - stdout landet als Kontext bei Claude: nur feste Wortlaute, die
#    npm-Ausgabe steht im Logfile (Programmausgabe, keine Anweisungen).
#  - Ein fehlgeschlagener Install blockiert den Sitzungsstart NICHT
#    (Exit 0 mit Meldung) – Claude sieht die Ursache und kann reagieren.
#  - Repo-lokale Git-Konventionen (CLAUDE.md): Commit-Autor = noreply-
#    Adresse des Betreibers (frischer Cloud-Klon trägt sonst global
#    «Claude <noreply@anthropic.com>», Vercel blockiert Deployments ohne
#    zuordenbaren GitHub-Autor) und pre-push-Guard scripts/git-hooks.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Repo-Wurzel aus dem eigenen Pfad – unabhängig vom Arbeitsverzeichnis des
# Aufrufers ($CLAUDE_PROJECT_DIR zeigt in Mehr-Repo-Sessions auf die Ebene
# über den Klonen).
wurzel="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$wurzel" || exit 1
if [ ! -f package.json ]; then
  echo "[install_pkgs] Keine package.json in $wurzel – nichts zu tun."
  exit 0
fi
name="$(basename "$wurzel")"

# --- Git-Konventionen (nur setzen, wenn repo-lokal noch nichts steht) ---
if [ -d .git ]; then
  if [ -z "$(git config --local --get user.email 2>/dev/null)" ]; then
    git config --local user.name "Timo Hilsdorf"
    git config --local user.email "8818560+timohilsdorf@users.noreply.github.com"
  fi
  if [ -d scripts/git-hooks ] && [ -z "$(git config --local --get core.hooksPath 2>/dev/null)" ]; then
    git config --local core.hooksPath scripts/git-hooks
  fi
fi

# --- npm ci, hash-geschützt ---
hashdatei="node_modules/.install_pkgs.sha256"
eingaben=()
for f in scripts/install_pkgs.sh package.json package-lock.json .npmrc packages/*/package.json; do
  [ -f "$f" ] && eingaben+=("$f")
done
log="${TMPDIR:-/tmp}/${name}-install_pkgs.log"

if sha256sum --check --status "$hashdatei" 2>/dev/null; then
  echo "[install_pkgs] $name: node_modules aktuell (Eingaben unverändert) – npm ci übersprungen."
  exit 0
fi
# Alte Hashes zuerst löschen: ein fehlgeschlagener Lauf wird beim nächsten
# Start wiederholt statt still als «aktuell» zu gelten.
rm -f "$hashdatei"
echo "[install_pkgs] $name: npm ci läuft (Node $(node --version)) …"
if npm ci --no-audit --no-fund >"$log" 2>&1; then
  sha256sum "${eingaben[@]}" >"$hashdatei" || rm -f "$hashdatei"
  echo "[install_pkgs] $name: npm ci erfolgreich ($(ls node_modules | wc -l) Einträge in node_modules)."
else
  rc=$?
  echo "[install_pkgs] $name: npm ci FEHLGESCHLAGEN (Exit $rc), node_modules unvollständig. Log: $log (Programmausgabe). Häufigste Cloud-Ursache: eine Paketquelle ausserhalb der Netzwerk-Allowlist – s. CLAUDE.md «Arbeiten in der Cloud»."
fi
exit 0

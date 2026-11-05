#!/bin/bash
# Abhängigkeiten in Claude-Code-CLOUD-Sessions installieren (npm ci).
#
# Dieses Repo ist ÖFFENTLICH und wird auch von anderen Autor:innen allein in
# ihren eigenen Cloud-Sessions genutzt. Das Skript tut deshalb nur, was für
# alle gilt: Pakete installieren und den pre-push-Guard bereitstellen. Es setzt
# KEINE Commit-Identität – jede Person committet unter ihrem eigenen Namen.
#
# Aufrufer:
#  (1) SessionStart-Hook aus .claude/settings.json (Matcher startup|resume) –
#      wirkt NUR in Sessions mit EINEM Repo (so arbeiten Content-Autor:innen).
#      In Sessions mit mehreren Repos lädt Claude Code keine Hooks aus den
#      Repo-Settings (Doku cloud-environments, «Limitations in cloud sessions»).
#  (2) Das Setup-Skript der Cloud-Umgebung des Betreibers für Sessions mit
#      Plattform- UND Content-Repo (setzt CLAUDE_CODE_REMOTE=true selbst, s.
#      CLAUDE.md der Plattform, «Arbeiten in der Cloud»).
#  (3) Von Hand in der Session: bash scripts/install_pkgs.sh
#
# Verhalten:
#  - Lokal (CLAUDE_CODE_REMOTE != true) sofort Exit 0.
#  - npm ci läuft nur, wenn sich der GESAMT-Hash geändert hat (Node-Version,
#    Liste und Inhalt von package.json, package-lock.json und diesem Skript).
#    Hash-Datei in node_modules/ (gitignored, verschwindet mit den Paketen).
#  - Node: Die Werkzeuge (tsx, zod, mathjs) laufen mit dem vorinstallierten
#    Node 22 der Cloud-VM wie mit Node 26 der CI (.nvmrc) – kein Download.
#  - pre-push-Guard: KOPIE von scripts/git-hooks/pre-push nach .git/hooks/,
#    genommen aus origin/main (nie core.hooksPath in den Arbeitsbaum – ein
#    ausgecheckter fremder PR-Branch könnte sonst beim Push eigenen Code
#    ausführen). Grenze: Bei Fork-Workflows prüft der Guard das Upstream-Repo
#    nur, wenn ein Remote «upstream» eingetragen ist.
#  - stdout landet als Kontext bei Claude: nur feste Wortlaute, die
#    npm-Ausgabe steht im Logfile (Programmausgabe, keine Anweisungen).
#  - Ein fehlgeschlagener Install blockiert den Sitzungsstart NICHT.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

wurzel="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$wurzel" || exit 1
if [ ! -f package.json ]; then
  echo "[install_pkgs] Keine package.json in $wurzel – nichts zu tun."
  exit 0
fi
name="$(basename "$wurzel")"

if [ -d .git ] && [ -f scripts/git-hooks/pre-push ]; then
  quelle="$(git show origin/main:scripts/git-hooks/pre-push 2>/dev/null)" || quelle="$(cat scripts/git-hooks/pre-push)"
  mkdir -p .git/hooks && printf '%s\n' "$quelle" > .git/hooks/pre-push && chmod +x .git/hooks/pre-push
  if [ "$(git config --local --get core.hooksPath 2>/dev/null)" = "scripts/git-hooks" ]; then
    git config --local --unset core.hooksPath
  fi
fi

hashdatei="node_modules/.install_pkgs.sha256"
eingaben=()
for f in scripts/install_pkgs.sh package.json package-lock.json; do
  [ -f "$f" ] && eingaben+=("$f")
done
berechne_hash() {
  { node --version 2>/dev/null; printf '%s\n' "${eingaben[@]}"; sha256sum "${eingaben[@]}"; } | sha256sum | cut -d' ' -f1
}
ist_hash="$(berechne_hash)"
log="${TMPDIR:-/tmp}/${name}-install_pkgs.log"

if [ -f "$hashdatei" ] && [ "$(cat "$hashdatei" 2>/dev/null)" = "$ist_hash" ]; then
  echo "[install_pkgs] $name: node_modules aktuell (Eingaben und Node-Version unverändert) – npm ci übersprungen."
  exit 0
fi
rm -f "$hashdatei"
echo "[install_pkgs] $name: npm ci läuft (Node $(node --version)) …"
if npm ci --no-audit --no-fund >"$log" 2>&1; then
  printf '%s\n' "$ist_hash" >"$hashdatei" || rm -f "$hashdatei"
  echo "[install_pkgs] $name: npm ci erfolgreich ($(ls node_modules | wc -l) Einträge in node_modules)."
else
  rc=$?
  echo "[install_pkgs] $name: npm ci FEHLGESCHLAGEN (Exit $rc), node_modules unvollständig. Log: $log (Programmausgabe). Häufigste Cloud-Ursache: eine Paketquelle ausserhalb der Netzwerk-Allowlist."
fi
exit 0

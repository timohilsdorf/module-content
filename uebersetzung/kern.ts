/**
 * Gemeinsamer Kern des Übersetzungs-Systems: Prüfsummen, Kanonform,
 * Dateinamens-Muster und Konfiguration. EINE Rechenstelle für Werkzeug
 * (uebersetze.ts), Status-Report (status.ts) und CI-Prüfung
 * (pruefung.ts, eingebunden in schema/validate.ts) – Werkzeug und CI
 * dürfen NIE verschieden hashen, sonst wäre jeder Fassungs-PR rot.
 *
 * Kanonform: Alle module.json des Repos sind byteidentisch
 * `JSON.stringify(JSON.parse(text), null, 1) + "\n"` (verifiziert am
 * Bestand). Fassungen MÜSSEN in dieser Kanonform vorliegen – so ist
 * `selfHash` wohldefiniert (Schlüsselreihenfolge = Datei-Reihenfolge)
 * und schon eine blosse Umformatierung von Hand fällt in der CI auf.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const MODULES_DIR = path.join(REPO_ROOT, "modules");
export const UEBERSETZUNG_DIR = path.join(REPO_ROOT, "uebersetzung");
export const SPEICHER_DIR = path.join(UEBERSETZUNG_DIR, "speicher");
export const HINWEISE_DIR = path.join(UEBERSETZUNG_DIR, "hinweise");

/** Dateiname einer Sprachfassung: module.<lang>.json im Modulordner. */
export const FASSUNG_MUSTER = /^module\.([a-z]{2,3})\.json$/;

export function sha256(daten: string | Buffer): string {
  return "sha256:" + createHash("sha256").update(daten).digest("hex");
}

/** Kanonische Serialisierung (1-Space-Einrückung + Newline, Repo-Konvention). */
export function kanonisch(wert: unknown): string {
  return JSON.stringify(wert, null, 1) + "\n";
}

/**
 * selfHash einer Fassung: SHA-256 über die Kanonform, wobei
 * derivedFrom.selfHash währenddessen den festen Platzhalter "" trägt.
 * Die Schlüsselreihenfolge ist die der übergebenen Objekt-Struktur
 * (JSON.parse erhält die Datei-Reihenfolge) – Nachrechnen in der CI
 * heisst darum immer: Datei parsen, Platzhalter setzen, hashen.
 */
export function selfHashVon(fassung: unknown): string {
  const kopie = JSON.parse(JSON.stringify(fassung)) as {
    derivedFrom?: { selfHash?: string };
  };
  if (kopie.derivedFrom) kopie.derivedFrom.selfHash = "";
  return sha256(kanonisch(kopie));
}

/** Prüfsumme einer Datei (Bytes) – Grundlage von masterHash/hintsHash. */
export function dateiHash(pfad: string): string {
  return sha256(fs.readFileSync(pfad));
}

/** Pfad der Korrekturhinweis-Datei eines Moduls je Zielsprache. */
export function hinweisePfad(slug: string, sprache: string): string {
  return path.join(HINWEISE_DIR, `${slug}.${sprache}.md`);
}

/** Prüfsumme der Korrekturhinweise (null = keine Hinweis-Datei). */
export function hinweiseHash(slug: string, sprache: string): string | null {
  const pfad = hinweisePfad(slug, sprache);
  return fs.existsSync(pfad) ? dateiHash(pfad) : null;
}

/** Pfad der Segment-Gedächtnis-Datei einer Fassung. */
export function speicherPfad(slug: string, sprache: string): string {
  return path.join(SPEICHER_DIR, `${slug}.${sprache}.json`);
}

/**
 * Übersetzbare Zielsprachen des Repos – gespiegelt an den
 * Oberflächensprachen der Plattform (src/lib/i18n/sprache.ts, SPRACHEN).
 * Beim Ergänzen einer Plattform-Sprache diese Datei mitziehen, sonst
 * fehlt der Status-Matrix genau die Spalte, deren Lücken sie zeigen
 * soll (siehe UEBERSETZUNG.md, «Neue Sprache»).
 */
export function ladeSprachen(): string[] {
  const datei = path.join(UEBERSETZUNG_DIR, "sprachen.json");
  const liste = JSON.parse(fs.readFileSync(datei, "utf8")) as unknown;
  if (
    !Array.isArray(liste) ||
    liste.length === 0 ||
    !liste.every((s) => typeof s === "string" && /^[a-z]{2,3}$/.test(s))
  ) {
    throw new Error(
      "uebersetzung/sprachen.json muss eine nicht-leere Liste von Sprachcodes sein (z. B. [\"de\", \"en\"]).",
    );
  }
  return liste as string[];
}

export interface Konfig {
  /** Übersetzungs-Modell für den API-Weg. */
  modell: string;
  /** Obergrenze der Antwort-Tokens je API-Aufruf. */
  maxAusgabeTokens: number;
  /** vorleseSprache je Zielsprache (BCP-47) für audio.vorleseText. */
  vorleseSprachen: Record<string, string>;
}

export function ladeKonfig(): Konfig {
  const datei = path.join(UEBERSETZUNG_DIR, "konfig.json");
  return JSON.parse(fs.readFileSync(datei, "utf8")) as Konfig;
}

/** Segment-Gedächtnis: übersetzte Textstücke je Quelltext-Prüfsumme. */
export interface Speicher {
  version: 1;
  /** hintsHash, mit dem die Einträge erzeugt wurden (Hinweis-Änderung ⇒ Voll-Neuerzeugung). */
  hintsHash: string | null;
  /** Einzel-Segmente: Pfad (mit Indizes) → Quell-Prüfsumme + Übersetzung. */
  segmente: Record<string, { quelle: string; text: string }>;
  /** Paket-Aufgaben (Lückentext): Block-Pfad → Quell-Prüfsumme + übersetzter Inhalt. */
  pakete: Record<
    string,
    {
      quelle: string;
      inhalt: { text: string; luecken: string[][]; ablenker?: string[] };
    }
  >;
}

export function ladeSpeicher(slug: string, sprache: string): Speicher | null {
  const pfad = speicherPfad(slug, sprache);
  if (!fs.existsSync(pfad)) return null;
  return JSON.parse(fs.readFileSync(pfad, "utf8")) as Speicher;
}

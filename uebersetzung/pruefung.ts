/**
 * CI-Prüfung der Sprachfassungen (module.<lang>.json) – eingebunden in
 * schema/validate.ts. Prüft je Fassung:
 *
 *  1. Dateiname ↔ Inhalt: Sprache aus sprachen.json, ≠ Master-Sprache,
 *     language == <lang>, id == Ordnername, _hinweis als ERSTES Feld,
 *     derivedFrom vorhanden.
 *  2. Kanonform: Datei-Bytes == kanonische Serialisierung des eigenen
 *     Inhalts (fängt auch blosse Umformatierungen von Hand).
 *  3. selfHash: nachgerechnet == derivedFrom.selfHash (jede Handänderung
 *     fällt auf – IMMER geprüft, für alle Fassungen, ganz ohne Diff).
 *  4. Master: existiert, kein languageLearning, keine aufgeschobenen
 *     Merkmale (planspiel, audio-src, satzbau).
 *  5. Strukturgleichheit + Punktzahl-Parität gegen den Master.
 *  6. Übersetzte Texte: kein Roh-HTML, keine NEUEN Markdown-Bild-URLs
 *     (Bild-Whitelist ist damit konstruktiv erfüllt – erlaubt ist nur,
 *     was der voll geprüfte Master bereits referenziert).
 *  7. masterHash: Abweichung vom aktuellen Master ist auf main erlaubt
 *     (Fassung gilt als VERALTET, Status-Report listet sie); ist die
 *     Datei aber Teil des PRs (Umgebungsvariable UEBERSETZUNG_BASIS
 *     zeigt auf die PR-Basis), MUSS sie zum Master im selben PR passen.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  FASSUNG_MUSTER,
  MODULES_DIR,
  REPO_ROOT,
  dateiHash,
  hinweiseHash,
  kanonisch,
  ladeSprachen,
  selfHashVon,
} from "./kern";
import { uebersetzungsSperren } from "./felder";
import { vergleicheStruktur, vergleichePunkte } from "./struktur";
import { findHtmlTags, findMarkdownImages } from "./text-pruefung";
import type { LearningModule } from "../schema/schema";

export interface FassungsHelfer {
  /** parseModulDatei-Aufruf des Validators (einheitliche Fehlertexte). */
  parse: (raw: unknown) => { success: boolean; data?: LearningModule; beschreibung?: string[] };
}

/** Alle Markdown-Bild-URLs eines JSON-Baums (für den Master-Abgleich). */
function alleBildUrls(wert: unknown, sammlung: Set<string>): void {
  if (typeof wert === "string") {
    for (const url of findMarkdownImages(wert).urls) sammlung.add(url);
  } else if (Array.isArray(wert)) {
    for (const v of wert) alleBildUrls(v, sammlung);
  } else if (wert && typeof wert === "object") {
    for (const v of Object.values(wert)) alleBildUrls(v, sammlung);
  }
}

/** Im PR geänderte Dateien (relativ zum Repo), wenn eine Basis bekannt ist. */
function geaenderteDateien(): Set<string> | null {
  const basis = process.env.UEBERSETZUNG_BASIS;
  if (!basis) return null;
  try {
    const ausgabe = execFileSync(
      "git",
      ["diff", "--name-only", `${basis}...HEAD`],
      { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] },
    ).toString();
    return new Set(ausgabe.split("\n").filter(Boolean));
  } catch {
    // Basis nicht auflösbar (z. B. flacher Checkout): lieber ohne die
    // Zusatzregel prüfen als hart scheitern – selfHash/Kanonform laufen
    // ohnehin für ALLE Fassungen.
    return null;
  }
}

export interface FassungsErgebnis {
  errors: string[];
  hints: string[];
}

/** Prüft alle Sprachfassungen EINES Modulordners. */
export function pruefeFassungen(
  slug: string,
  masterRaw: unknown,
  masterMod: LearningModule,
  helfer: FassungsHelfer,
): FassungsErgebnis {
  const errors: string[] = [];
  const hints: string[] = [];
  const modDir = path.join(MODULES_DIR, slug);
  const sprachen = ladeSprachen();
  const geaendert = geaenderteDateien();
  const masterSprache = masterMod.language;
  const masterDatei = path.join(modDir, "module.json");
  const aktuellerMasterHash = dateiHash(masterDatei);
  const masterBildUrls = new Set<string>();
  alleBildUrls(masterRaw, masterBildUrls);

  const fassungsDateien = fs
    .readdirSync(modDir)
    .filter((name) => FASSUNG_MUSTER.test(name))
    .sort();

  for (const dateiName of fassungsDateien) {
    const lang = FASSUNG_MUSTER.exec(dateiName)![1];
    const melde = (text: string) => errors.push(`${dateiName}: ${text}`);
    const pfad = path.join(modDir, dateiName);

    if (!sprachen.includes(lang)) {
      melde(
        `Sprache "${lang}" ist keine Oberflächensprache der Plattform (uebersetzung/sprachen.json: ${sprachen.join(", ")}).`,
      );
      continue;
    }
    if (lang === masterSprache) {
      melde(
        `Eine Fassung in der Master-Sprache "${masterSprache}" ergibt keinen Sinn – der Master IST diese Fassung.`,
      );
      continue;
    }

    // Sprachlernmodule und aufgeschobene Merkmale: keine Fassungen.
    if (masterMod.languageLearning) {
      melde(
        "Dieses Modul ist ein Sprachlernmodul (languageLearning) – die Sprache ist Lerngegenstand, es wird nicht übersetzt.",
      );
      continue;
    }
    const sperren = uebersetzungsSperren(masterRaw);
    if (sperren.length > 0) {
      melde(
        `Dieses Modul ist von Übersetzungen (noch) ausgenommen: ${sperren.join("; ")}.`,
      );
      continue;
    }

    let roh: unknown;
    const bytes = fs.readFileSync(pfad, "utf8");
    try {
      roh = JSON.parse(bytes);
    } catch (err) {
      melde(`kein gültiges JSON (${(err as Error).message}).`);
      continue;
    }
    // Typ-Guard: eine zerschossene Datei (null, Array, primitives
    // derivedFrom) bekommt die klare Meldung – nie einen Stacktrace,
    // der den Gesamtlauf abreisst (Review-Fund 18.8.2026).
    if (roh === null || typeof roh !== "object" || Array.isArray(roh)) {
      melde("ist kein Modul-Objekt – Fassungen entstehen mit: npm run uebersetze");
      continue;
    }

    // Kanonform + selfHash VOR allem anderen: Eine Handänderung soll
    // die EINE klare Meldung bekommen, nicht zwanzig Folgefehler.
    const obj = roh as Record<string, unknown>;
    const derivedFrom = obj.derivedFrom as
      | { masterHash?: string; hintsHash?: string | null; selfHash?: string }
      | undefined;
    if (
      !derivedFrom ||
      typeof derivedFrom !== "object" ||
      Array.isArray(derivedFrom) ||
      typeof obj._hinweis !== "string"
    ) {
      melde(
        'Sprachfassungen brauchen "_hinweis" und "derivedFrom" – diese Datei wurde nicht vom Übersetzungswerkzeug erzeugt. Fassungen entstehen mit: npm run uebersetze',
      );
      continue;
    }
    const handAenderung =
      bytes !== kanonisch(roh) || selfHashVon(roh) !== derivedFrom.selfHash;
    if (handAenderung) {
      melde(
        `wird automatisch aus dem Master erzeugt und darf nicht von Hand geändert werden. Inhaltliche Änderungen bitte an modules/${slug}/module.json vornehmen und die Übersetzung neu erzeugen: npm run uebersetze -- --modul ${slug} --sprache ${lang}. Übersetzungsfehler bitte als Korrekturhinweis melden (siehe UEBERSETZUNG.md).`,
      );
      continue;
    }
    if (Object.keys(obj)[0] !== "_hinweis") {
      melde('"_hinweis" muss das erste Feld der Datei sein (sichtbare Warnung).');
    }

    // Schema-Parse (volle Modul-Validierung inkl. superRefines).
    const parsed = helfer.parse(roh);
    if (!parsed.success || !parsed.data) {
      melde("ist kein gültiges Modul:");
      errors.push(...(parsed.beschreibung ?? []).map((z) => `  ${z}`));
      continue;
    }
    const fassung = parsed.data;
    if (fassung.language !== lang) {
      melde(
        `"language" (${fassung.language}) muss der Sprache im Dateinamen (${lang}) entsprechen.`,
      );
    }
    if (fassung.id !== slug) {
      melde(`"id" (${fassung.id}) muss dem Ordnernamen (${slug}) entsprechen.`);
    }

    // Strukturgleichheit gegen den Master (ohne die Fassungs-Metafelder).
    const ohneMeta = { ...obj };
    delete ohneMeta._hinweis;
    delete ohneMeta.derivedFrom;
    try {
      errors.push(
        ...vergleicheStruktur(masterRaw, ohneMeta).map((f) => `${dateiName}: ${f}`),
      );
    } catch (err) {
      melde((err as Error).message);
      continue;
    }
    errors.push(
      ...vergleichePunkte(masterMod, fassung).map((f) => `${dateiName}: ${f}`),
    );

    // Übersetzte Texte: kein Roh-HTML, keine neuen Bild-URLs.
    let htmlGemeldet = 0;
    const fassungsBildUrls = new Set<string>();
    alleBildUrls(ohneMeta, fassungsBildUrls);
    for (const url of fassungsBildUrls) {
      if (!masterBildUrls.has(url)) {
        melde(
          `Markdown-Bild "${url}" existiert im Master nicht – Übersetzungen dürfen keine neuen Bilder einführen.`,
        );
      }
    }
    const besuche = (wert: unknown, pfadTeile: (string | number)[]): void => {
      if (typeof wert === "string") {
        const tags = findHtmlTags(wert);
        if (tags.length > 0 && htmlGemeldet < 5) {
          htmlGemeldet++;
          melde(
            `Roh-HTML in "${pfadTeile.join(".")}": ${[...new Set(tags)].join(" ")} – die Übersetzung muss reines Markdown bleiben.`,
          );
        }
      } else if (Array.isArray(wert)) {
        wert.forEach((v, i) => besuche(v, [...pfadTeile, i]));
      } else if (wert && typeof wert === "object") {
        for (const [k, v] of Object.entries(wert)) besuche(v, [...pfadTeile, k]);
      }
    };
    besuche(ohneMeta, []);
    // Auch die Metafelder laufen durch die Textprüfungen (Konzept
    // Abschnitt 2) – der _hinweis ist deshalb bewusst spitzklammerfrei.
    besuche({ _hinweis: obj._hinweis, derivedFrom: obj.derivedFrom }, []);

    // Veraltet vs. «gegen alten Master erzeugt».
    const veraltetMaster = derivedFrom.masterHash !== aktuellerMasterHash;
    const veraltetHinweise =
      (derivedFrom.hintsHash ?? null) !== hinweiseHash(slug, lang);
    const imPrGeaendert = geaendert?.has(`modules/${slug}/${dateiName}`) ?? false;
    if (veraltetMaster && imPrGeaendert) {
      melde(
        `wurde gegen einen veralteten Master erzeugt – bitte auf dem aktuellen Stand neu erzeugen: npm run uebersetze -- --modul ${slug} --sprache ${lang}`,
      );
    } else if (veraltetMaster || veraltetHinweise) {
      hints.push(
        `${dateiName}: VERALTET (${veraltetMaster ? "Master geändert" : "Korrekturhinweise geändert"}) – Nachführung fällig (npm run uebersetzungs-status zeigt alle).`,
      );
    }
  }

  return { errors, hints };
}

/** Verbot der Fassungs-Metafelder in MASTER-Dateien (module.json). */
export function masterMetafeldFehler(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  const obj = raw as Record<string, unknown>;
  const fehler: string[] = [];
  for (const feld of ["_hinweis", "derivedFrom"] as const) {
    if (feld in obj) {
      fehler.push(
        `"${feld}" ist Sprachfassungen (module.<lang>.json) vorbehalten – eine module.json ist immer ein Master.`,
      );
    }
  }
  return fehler;
}

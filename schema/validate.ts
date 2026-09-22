/**
 * Validiert alle Lernmodule in `modules/` – eigenständig, ohne
 * Plattform-Code. Läuft lokal (`npm run validate`) und bei jedem
 * Pull Request in der CI; Fehler markieren den PR als fehlgeschlagen.
 *
 * Geprüft wird zusätzlich zum Zod-Schema (schema.ts):
 * - nur erlaubte Blocktypen: die implementierten Typen plus Zukunftstypen
 *   laut schema/whitelist.json (Tippfehler werden erkannt)
 * - Videos nur von erlaubten Providern/Hosts (whitelist.json)
 * - kein Roh-HTML in Textfeldern – der Player rendert Markdown ohne HTML,
 *   Tags würden als sichtbarer Text erscheinen
 * - Bilder: Datei liegt im Modulordner, erlaubte Endung, src-Konvention
 *   "/content/<modul-id>/<datei>"; Remote-Bilder nur von erlaubten Hosts
 * - Planspiele: Datei existiert im eigenen Modulordner, beginnt mit
 *   "<!doctype html><html><head>", hält das Grössenlimit
 *   (maxPlanspielSizeKB) ein und enthält keine externen Verweise
 *   (PLANSPIEL_VERBOTENE_MUSTER in schema.ts); .html-Dateien ohne
 *   referenzierenden planspiel-Block sind ein Fehler
 * - Ordnerhygiene: im Modulordner nur module.json, Sprachfassungen
 *   (module.<lang>.json), Bilder, Videos und referenzierte
 *   Planspiel-Dateien
 * - eindeutige IDs, Pflicht-IDs für Quizfragen, requires-Verweise
 * - Sprachfassungen (module.<lang>.json): Kanonform, selfHash,
 *   Strukturgleichheit zum Master, Punktzahl-Parität, kein Roh-HTML in
 *   Übersetzungen (uebersetzung/pruefung.ts)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { create, unitDependencies, parseDependencies } from "mathjs";
import { FASSUNG_MUSTER, kanonisch } from "../uebersetzung/kern";
import {
  masterMetafeldFehler,
  pruefeFassungen,
} from "../uebersetzung/pruefung";
import { findHtmlTags, findMarkdownImages } from "../uebersetzung/text-pruefung";
import { describeIssues } from "../uebersetzung/fehler";

// Schlanke mathjs-Instanz nur fürs Einheiten-Parsen (kein evaluate) –
// dieselbe Konstruktion wie in der Plattform (src/lib/content/einheiten.ts).
const mathEinheiten = create(unitDependencies, {});
function istBekannteEinheit(einheit: string): boolean {
  try {
    mathEinheiten.unit(1, einheit);
    return true;
  } catch {
    return false;
  }
}
import {
  extrahiereModulVerweise,
  isKnownBlock,
  KNOWN_BLOCK_TYPES,
  knownBlockSchema,
  LEHRPLAENE,
  lehrplanDefinition,
  modulVerweisErlaubtInPfad,
  modulVerweisSyntaxFehler,
  parseModulDatei,
  PLANSPIEL_DOKUMENT_PRAEFIX,
  PLANSPIEL_VERBOTENE_MUSTER,
  TEILKOMPETENZ_ID_MUSTER,
  termBaumFehler,
  variantenBezeichnung,
  VIDEO_DATEI_MUSTER,
  type LearningModule,
  type TermKnoten,
  SCHAUBILD_SZENE_WARN_BYTES,
} from "./schema";

// Schlanke Parse-Instanz für term-Musterlösungen (nur parse, kein
// evaluate). Der Baum-Filter termBaumFehler lebt in der SYNC-Region –
// Whitelist hier und im Plattform-Player sind damit IMMER identisch.
const mathTerm = create(parseDependencies, {});
function termAntwortFehler(antwort: string): string | null {
  // Dieselbe ln→log-Abbildung wie die Plattform (mathjs kennt kein ln);
  // die übrigen Normalisierungen betreffen nur Lernenden-Eingaben, die
  // Zeichen-Whitelist des Schemas lässt sie bei Autoren gar nicht zu.
  const quelltext = antwort.replace(/\bln\s*\(/g, "log(").trim();
  let node: unknown;
  try {
    node = mathTerm.parse(quelltext);
  } catch (e) {
    return e instanceof Error ? e.message : "kein parsebarer Term";
  }
  const fehler = termBaumFehler(node as TermKnoten, undefined);
  if (fehler === null) return null;
  switch (fehler.art) {
    case "funktion":
      return `unbekannte Funktion "${fehler.name}"`;
    case "funktionOhneKlammern":
      return `"${fehler.name}" braucht Klammern: ${fehler.name}(…)`;
    case "variable":
      return `unerlaubtes Symbol "${fehler.name}"`;
    case "zuTief":
      return "zu stark verschachtelt (höchstens 16 Ebenen)";
    case "potenz":
      return "Potenz-Exponent zu gross (höchstens 10000)";
    default:
      return `unerlaubtes Element (${fehler.typ})`;
  }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULES_DIR = path.join(ROOT, "modules");

// ---------------------------------------------------------------------------
// Whitelist laden (und selbst validieren – eine kaputte Whitelist darf die
// Prüfung nicht stillschweigend aushebeln)
// ---------------------------------------------------------------------------

const whitelistSchema = z.strictObject({
  _hinweis: z.string().optional(),
  videoProviders: z.array(z.string().min(1)),
  videoUrlHosts: z.array(z.string().min(1)),
  maxVideoSizeKB: z.number().int().positive(),
  videoExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)),
  audioExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)),
  maxAudioSizeKB: z.number().int().positive(),
  imageHosts: z.array(z.string().min(1)),
  imageExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)),
  maxImageSizeKB: z.number().int().positive(),
  maxModuleJsonKB: z.number().int().positive(),
  maxPlanspielSizeKB: z.number().int().positive(),
  futureBlockTypes: z.array(z.string().min(1)),
});

const whitelist = whitelistSchema.parse(
  JSON.parse(fs.readFileSync(path.join(ROOT, "schema", "whitelist.json"), "utf8")),
);

// ---------------------------------------------------------------------------
// Kompetenz-Tabellen laden (kompetenzen/teilkompetenzen.json + mapping.json).
// Die Register- und Mapping-Regeln SPIEGELN src/lib/content/kompetenzen.ts
// des Plattform-Repos (Code-Duplikat wie beim ln→log-Präzedenzfall –
// Content-CI und Plattform-Build scheitern so an denselben Stellen):
// fehlender Ordner/fehlende Dateien sind tolerant leer (Rollout
// Plattform-vor-Content), vorhandene, aber ungültige Dateien ein harter
// Fehler; Mapping-Zeilen nur zu registrierten Kennungen und Lehrplänen.
// Zusätzlich NUR hier: beide Dateien müssen in Kanonform stehen
// (JSON.stringify(inhalt, null, 1) + "\n") – wie die Sprachfassungen,
// damit Werkzeug-Läufe diff-stabil bleiben.
// ---------------------------------------------------------------------------

/** Zweisprachiges Label (die Oberfläche kennt de + en) – Spiegel der Plattform. */
const sprachTextSchema = z.strictObject({
  de: z.string().trim().min(1).max(160),
  en: z.string().trim().min(1).max(160),
});

const teilkompetenzEintragSchema = z.strictObject({
  name: sprachTextSchema,
  beschreibung: z
    .strictObject({
      de: z.string().trim().min(1).max(400),
      en: z.string().trim().min(1).max(400),
    })
    .optional(),
  fachbereich: z.string().trim().min(1).max(60),
});

type KompetenzRegister = Record<string, z.infer<typeof teilkompetenzEintragSchema>>;
type KompetenzMapping = Record<string, Partial<Record<string, string[]>>>;

/** Code-Schema wie lehrplanKompetenzSchema.code (freies Format ≤ 60). */
const kompetenzCodeSchema = z.string().trim().min(1).max(60);

function kompetenzTabellenFehler(datei: string, meldungen: string[]): Error {
  return new Error(
    `Kompetenz-Tabelle ${datei} ist ungültig:\n${meldungen.map((m) => `  - ${m}`).join("\n")}`,
  );
}

/** Nur echte JSON-Objekte sind Tabellen (kein Array, kein Skalar). */
function kompetenzAlsObjekt(raw: unknown, datei: string): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw kompetenzTabellenFehler(datei, ["Die Datei muss ein JSON-Objekt sein."]);
  }
  return raw as Record<string, unknown>;
}

/** Register parsen – Regeln identisch zu parseKompetenzRegister der Plattform. */
function parseKompetenzRegister(raw: unknown, datei: string): KompetenzRegister {
  const objekt = kompetenzAlsObjekt(raw, datei);
  const meldungen: string[] = [];
  const register: KompetenzRegister = {};
  for (const [kennung, wert] of Object.entries(objekt)) {
    if (kennung === "_hinweis") continue;
    if (kennung.length > 64 || !TEILKOMPETENZ_ID_MUSTER.test(kennung)) {
      meldungen.push(
        `Kennung "${kennung}": nicht im Format "<fachbereich>.<thema>.<verb-objekt>" (Kleinbuchstaben/Ziffern, Punkte als Trenner, max. 64 Zeichen).`,
      );
      continue;
    }
    const eintrag = teilkompetenzEintragSchema.safeParse(wert);
    if (!eintrag.success) {
      for (const issue of eintrag.error.issues) {
        meldungen.push(`${kennung}.${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    register[kennung] = eintrag.data;
  }
  if (meldungen.length > 0) throw kompetenzTabellenFehler(datei, meldungen);
  return register;
}

/** Mapping parsen – Regeln identisch zu parseKompetenzMapping der Plattform. */
function parseKompetenzMapping(
  raw: unknown,
  register: KompetenzRegister,
  datei: string,
): KompetenzMapping {
  const objekt = kompetenzAlsObjekt(raw, datei);
  const meldungen: string[] = [];
  const mapping: KompetenzMapping = {};
  for (const [kennung, wert] of Object.entries(objekt)) {
    if (kennung === "_hinweis") continue;
    if (register[kennung] === undefined) {
      meldungen.push(
        `Kennung "${kennung}": nicht im Register (teilkompetenzen.json) – Mapping-Einträge brauchen einen Register-Eintrag.`,
      );
      continue;
    }
    if (wert === null || typeof wert !== "object" || Array.isArray(wert)) {
      meldungen.push(
        `${kennung}: erwartet ein Objekt { "<lehrplan>": ["<code>", …] }.`,
      );
      continue;
    }
    const proLehrplan: Partial<Record<string, string[]>> = {};
    for (const [lehrplan, codesRoh] of Object.entries(
      wert as Record<string, unknown>,
    )) {
      if (lehrplanDefinition(lehrplan) === undefined) {
        meldungen.push(
          `${kennung}.${lehrplan}: Lehrplan ist nicht registriert – bekannte Kennungen: ${LEHRPLAENE.map((p) => p.kennung).join(", ")}.`,
        );
        continue;
      }
      const codes = z.array(kompetenzCodeSchema).min(1).max(8).safeParse(codesRoh);
      if (!codes.success) {
        meldungen.push(
          `${kennung}.${lehrplan}: erwartet eine Liste von 1–8 Kompetenz-Codes (Strings, ≤ 60 Zeichen).`,
        );
        continue;
      }
      if (new Set(codes.data).size !== codes.data.length) {
        meldungen.push(
          `${kennung}.${lehrplan}: jeder Code höchstens einmal listen.`,
        );
        continue;
      }
      proLehrplan[lehrplan] = codes.data;
    }
    mapping[kennung] = proLehrplan;
  }
  if (meldungen.length > 0) throw kompetenzTabellenFehler(datei, meldungen);
  return mapping;
}

/** Eine Tabelle lesen: fehlend → null (tolerant); JSON- und Kanonform-Fehler werfen. */
function liesKompetenzTabelle(name: string): unknown | null {
  const datei = path.join(ROOT, "kompetenzen", name);
  if (!fs.existsSync(datei)) return null;
  const roh = fs.readFileSync(datei, "utf8");
  let wert: unknown;
  try {
    wert = JSON.parse(roh);
  } catch (err) {
    throw kompetenzTabellenFehler(name, [
      `kein gültiges JSON (${(err as Error).message}).`,
    ]);
  }
  if (kanonisch(wert) !== roh) {
    throw kompetenzTabellenFehler(name, [
      'nicht in Kanonform – bitte als JSON.stringify(inhalt, null, 1) + "\\n" speichern (Muster Sprachfassungen).',
    ]);
  }
  return wert;
}

/** kompetenzen/ existiert – erst dann sind Modul-Referenzen prüfbar. */
const kompetenzenAktiv = fs.existsSync(path.join(ROOT, "kompetenzen"));
let kompetenzRegister: KompetenzRegister = {};
let kompetenzMapping: KompetenzMapping = {};
try {
  if (kompetenzenAktiv) {
    const registerRoh = liesKompetenzTabelle("teilkompetenzen.json");
    if (registerRoh !== null) {
      kompetenzRegister = parseKompetenzRegister(registerRoh, "teilkompetenzen.json");
    }
    const mappingRoh = liesKompetenzTabelle("mapping.json");
    if (mappingRoh !== null) {
      kompetenzMapping = parseKompetenzMapping(
        mappingRoh,
        kompetenzRegister,
        "mapping.json",
      );
    }
  }
} catch (err) {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
}

/** Alle in Modulen referenzierten Kennungen (fürs Warn-Resümee am Ende). */
const kompetenzVerwendet = new Set<string>();

/**
 * Teilkompetenz-Referenzen eines (Master- oder Fassungs-)Moduls: sammelt
 * Verwendungen und meldet Kennungen ohne Register-Eintrag – geprüft nur,
 * WENN der kompetenzen/-Ordner existiert (tolerant sonst, wie die
 * Plattform: Rollout Plattform-vor-Content).
 */
function teilkompetenzReferenzFehler(mod: LearningModule): string[] {
  const fehler: string[] = [];
  mod.blocks.forEach((block, i) => {
    if (!isKnownBlock(block)) return;
    for (const kennung of block.teilkompetenzen ?? []) {
      kompetenzVerwendet.add(kennung);
      if (kompetenzenAktiv && kompetenzRegister[kennung] === undefined) {
        fehler.push(
          `blocks.${i}: Teilkompetenz "${kennung}" ist nicht im Register (kompetenzen/teilkompetenzen.json) – zuerst dort eintragen.`,
        );
      }
    }
  });
  return fehler;
}

// ---------------------------------------------------------------------------
// Hilfen: lesbare Zod-Fehler (übernommen aus dem Plattform-Loader)
// ---------------------------------------------------------------------------

// valueAtPath/describeIssues leben in uebersetzung/fehler.ts (geteilt
// mit dem Übersetzungswerkzeug).

/** Einfache Edit-Distanz, um Tippfehler in Blocktypen zu erkennen. */
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

// ---------------------------------------------------------------------------
// Einzelprüfungen
// ---------------------------------------------------------------------------

/** Code-Spans und Code-Blöcke entfernen – dort rendert Markdown nur Text. */
// stripCode/findHtmlTags/findMarkdownImages leben in
// uebersetzung/text-pruefung.ts (geteilt mit Fassungs-Prüfung und
// Übersetzungswerkzeug).

/** Alle String-Werte eines JSON-Baums mit Pfadangabe besuchen. */
function walkStrings(
  value: unknown,
  pathParts: (string | number)[],
  visit: (pathStr: string, s: string) => void,
): void {
  if (typeof value === "string") {
    visit(pathParts.join(".") || "(root)", value);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkStrings(v, [...pathParts, i], visit));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walkStrings(v, [...pathParts, k], visit);
    }
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Modul-Querverweis-Regeln über ein ROHES Modul-/Fassungs-Objekt:
 * kaputte Syntax, Whitelist-Verstösse und tote Ziele (22.9.2026).
 */
function modulVerweisFehler(raw: unknown, allSlugs: string[]): string[] {
  const fehler: string[] = [];
  walkStrings(raw, [], (pathStr, s) => {
    const klammerPfad = pathStr.replace(/\.(\d+)(?=\.|$)/g, "[$1]");
    const syntax = modulVerweisSyntaxFehler(s);
    if (syntax) fehler.push(`"${pathStr}": ${syntax}`);
    const verweise = extrahiereModulVerweise(s);
    if (verweise.length === 0) return;
    if (!modulVerweisErlaubtInPfad(klammerPfad)) {
      fehler.push(
        `"${pathStr}": Modul-Verweise ([[modul:…]]) sind hier nicht erlaubt – nur in didaktischem Fliesstext (body, intro, Lückentext-text, prompts, hints, solutions, explanations, Options-Texten, Simulations-Knoten/Abschlussfrage, learningObjectives, beschreibung/definition/Szene-Texten). Titel, Metadaten, captions und Antwort-Material bleiben verweisfrei.`,
      );
    }
    for (const ziel of verweise) {
      if (!allSlugs.includes(ziel)) {
        fehler.push(
          `"${pathStr}": [[modul:${ziel}]] verweist auf ein Modul, das es nicht gibt – Verweise nutzen den Ordner-Slug des Zielmoduls.`,
        );
      }
    }
  });
  return fehler;
}

function checkModule(
  slug: string,
  raw: unknown,
  mod: LearningModule,
  allSlugs: string[],
): { errors: string[]; hints: string[] } {
  const errors: string[] = [];
  const hints: string[] = [];
  const modDir = path.join(MODULES_DIR, slug);

  // --- Teilkompetenzen: jede referenzierte Kennung braucht einen ----------
  // Register-Eintrag (Fassungen prüft der Hauptlauf mit derselben Funktion).
  errors.push(...teilkompetenzReferenzFehler(mod));

  // --- schaubild: Szene muss KANONISCH (verschlankt) in der Datei ---------
  // stehen. Das Schema verdaut auch rohe Editor-Exporte (transform
  // verschlankt beim Parsen) – im Repo sollen aber nur die schlanken
  // Szenen liegen (Modulgrösse; byte-stabile Übersetzungs-Vergleiche).
  {
    const rohBloecke =
      raw && typeof raw === "object"
        ? ((raw as Record<string, unknown>).blocks as unknown[] | undefined)
        : undefined;
    mod.blocks.forEach((block, i) => {
      if (!isKnownBlock(block) || block.type !== "schaubild") return;
      const rohSzene = (rohBloecke?.[i] as Record<string, unknown> | undefined)
        ?.szene;
      const kanonisch = JSON.stringify(block.szene);
      if (JSON.stringify(rohSzene) !== kanonisch) {
        errors.push(
          `blocks[${i}] (schaubild): Die Szene ist noch nicht verschlankt – bitte npm run schaubild-verschlanken -- ${slug} ausführen (schreibt die kanonische Form in die Datei).`,
        );
      }
      const bytes = Buffer.byteLength(kanonisch, "utf8");
      if (bytes > SCHAUBILD_SZENE_WARN_BYTES) {
        hints.push(
          `blocks[${i}] (schaubild): Szene ist ${Math.round(bytes / 1024)} KB gross (Warnschwelle ${Math.round(SCHAUBILD_SZENE_WARN_BYTES / 1024)} KB, hartes Limit ${Math.round(262144 / 1024)} KB) – Freihand-Striche sparen oder aufteilen.`,
        );
      }
    });
  }

  // --- Blocktypen: nur implementierte + freigegebene Zukunftstypen --------
  for (const block of mod.blocks) {
    if (isKnownBlock(block)) continue;
    const nearest = KNOWN_BLOCK_TYPES.find((t) => editDistance(block.type, t) <= 2);
    if (nearest) {
      errors.push(
        `Blocktyp "${block.type}" ist unbekannt – meintest du "${nearest}"? Implementierte Typen: ${KNOWN_BLOCK_TYPES.join(", ")}.`,
      );
    } else if (whitelist.futureBlockTypes.includes(block.type)) {
      hints.push(
        `Zukunfts-Blocktyp "${block.type}" ist freigegeben, der Player zeigt dafür aber (noch) einen Platzhalter.`,
      );
    } else {
      errors.push(
        `Blocktyp "${block.type}" ist nicht erlaubt. Erlaubt sind ${KNOWN_BLOCK_TYPES.join(", ")} sowie die Zukunftstypen aus schema/whitelist.json (${whitelist.futureBlockTypes.join(", ") || "derzeit keine"}).`,
      );
    }
  }

  // --- Videos: nur erlaubte Provider/Hosts --------------------------------
  for (const block of mod.blocks) {
    if (!isKnownBlock(block) || block.type !== "video") continue;
    if (block.provider === "url") {
      const url = block.url ?? "";
      const host = block.url ? hostOf(block.url) : null;
      if (VIDEO_DATEI_MUSTER.test(url)) {
        // Moduleigenes Video: gehört in DIESEN Modulordner, muss dort
        // liegen, die erlaubte Endung tragen und darf nicht riesig sein.
        const erwartet = `/content/${mod.id}/`;
        if (!url.startsWith(erwartet)) {
          errors.push(
            `Video "${url}" – moduleigene Videos gehören in den eigenen Modulordner und heissen "${erwartet}<datei>.mp4".`,
          );
        } else {
          const datei = path.join(ROOT, "modules", mod.id, url.slice(erwartet.length));
          if (!fs.existsSync(datei)) {
            errors.push(
              `Video "${url}" nicht gefunden – die Datei gehört neben die module.json in modules/${mod.id}/.`,
            );
          } else {
            const kb = Math.round(fs.statSync(datei).size / 1024);
            if (kb > whitelist.maxVideoSizeKB) {
              errors.push(
                `Video "${url}" ist ${kb} KB gross – erlaubt sind höchstens ${whitelist.maxVideoSizeKB} KB (schema/whitelist.json → maxVideoSizeKB).`,
              );
            }
          }
        }
      } else if (whitelist.videoUrlHosts.length === 0) {
        errors.push(
          'Direkte Video-Datei-URLs von fremden Servern (provider "url") sind derzeit nicht freigegeben – nutze YouTube/Vimeo, lege das Video als "/content/<modul>/<datei>.mp4" in den Modulordner oder schlage den Host per PR in schema/whitelist.json (videoUrlHosts) vor.',
        );
      } else if (!host || !whitelist.videoUrlHosts.includes(host)) {
        errors.push(
          `Video-Host "${host ?? block.url}" ist nicht freigegeben. Erlaubte Hosts (schema/whitelist.json → videoUrlHosts): ${whitelist.videoUrlHosts.join(", ")}.`,
        );
      }
    } else if (!whitelist.videoProviders.includes(block.provider)) {
      errors.push(
        `Video-Provider "${block.provider}" ist nicht freigegeben. Erlaubt (schema/whitelist.json → videoProviders): ${whitelist.videoProviders.join(", ")}.`,
      );
    }
  }

  // --- Audio: nur moduleigene Dateien, Existenz + Grösse -------------------
  const referenzierteAudios = new Set<string>();
  for (const block of mod.blocks) {
    if (!isKnownBlock(block) || block.type !== "audio") continue;
    // Vorlese-Variante (vorleseText): keine Datei, nichts zu prüfen.
    if (!block.src) continue;
    const erwartet = `/content/${mod.id}/`;
    if (!block.src.startsWith(erwartet)) {
      errors.push(
        `Audio "${block.src}" – Hördateien gehören in den eigenen Modulordner und heissen "${erwartet}<datei>.mp3" (auch .m4a).`,
      );
      continue;
    }
    const fileName = block.src.slice(erwartet.length);
    referenzierteAudios.add(fileName);
    const datei = path.join(modDir, fileName);
    if (!fs.existsSync(datei)) {
      errors.push(
        `Audio "${block.src}" nicht gefunden – die Datei gehört neben die module.json in modules/${mod.id}/.`,
      );
      continue;
    }
    const kb = Math.round(fs.statSync(datei).size / 1024);
    if (kb > whitelist.maxAudioSizeKB) {
      errors.push(
        `Audio "${fileName}" ist ${kb} KB gross – erlaubt sind höchstens ${whitelist.maxAudioSizeKB} KB (schema/whitelist.json → maxAudioSizeKB).`,
      );
    }
  }

  // --- Bilder: Ablage im Modulordner, Endung, Remote-Hosts -----------------
  // Gilt für image-Blöcke UND Markdown-Bilder in Textfeldern (siehe unten).
  const referencedImages = new Set<string>();
  const checkBildUrl = (src: string, kontext: string) => {
    if (src.startsWith("/")) {
      const match = src.match(/^\/content\/([a-z0-9-]+)\/([^/]+)$/);
      if (!match || match[1] !== mod.id) {
        errors.push(
          `${kontext}: "${src}" – lokale Bilder liegen im Modulordner und werden als "/content/${mod.id}/<datei>" referenziert.`,
        );
        return;
      }
      const fileName = match[2];
      const ext = path.extname(fileName).toLowerCase();
      if (!whitelist.imageExtensions.includes(ext)) {
        errors.push(
          `${kontext}: Endung "${ext || "(keine)"}" von "${fileName}" ist nicht erlaubt. Erlaubt: ${whitelist.imageExtensions.join(", ")}.`,
        );
      }
      if (!fs.existsSync(path.join(modDir, fileName))) {
        errors.push(
          `${kontext}: Bild nicht gefunden – "${fileName}" fehlt im Ordner modules/${slug}/.`,
        );
      }
      referencedImages.add(fileName);
    } else if (src.startsWith("https://")) {
      const host = hostOf(src);
      if (!host || !whitelist.imageHosts.includes(host)) {
        errors.push(
          `${kontext}: Bild-Host "${host ?? src}" ist nicht freigegeben. Erlaubte Hosts (schema/whitelist.json → imageHosts): ${whitelist.imageHosts.join(", ") || "derzeit keine"} – oder das Bild herunterladen und in den Modulordner legen.`,
        );
      }
    } else {
      errors.push(
        `${kontext}: "${src}" muss mit "/content/${mod.id}/" (Datei im Modulordner) oder "https://" beginnen.`,
      );
    }
  };
  for (const block of mod.blocks) {
    if (isKnownBlock(block) && block.type === "image") {
      checkBildUrl(block.src, "Bild-src");
      // Bildnachweis ist für REPO-Module Pflicht (Betreiber-Entscheid
      // 15.9.2026): Quelle UND Lizenz gehören zu jedem Bild – das
      // Zod-Schema lässt `credit` bewusst optional (gespeicherte
      // LOKALE Module dürfen beim Laden nie ungültig werden), die
      // Pflicht erzwingt dieser Validator als PR-Gate.
      if (!block.credit?.trim()) {
        errors.push(
          'Bild-Block ohne "credit": Quelle und Lizenz sind Pflicht (z. B. "Foto: NASA, Public Domain" oder "Wikimedia Commons, CC BY-SA 4.0, <Autor>").',
        );
      }
    }
    // Zuordnungs-Bilder unterliegen denselben Regeln wie image-Blöcke.
    if (isKnownBlock(block) && block.type === "zuordnung") {
      // Aufgaben-Varianten: Bild-Regeln gelten für JEDE Fassung.
      [block, ...(block.varianten ?? [])].forEach((fassung, f) => {
        fassung.paare.flatMap((p) => [p.links, p.rechts]).forEach((element, i) => {
          if (element.bild)
            checkBildUrl(
              element.bild.src,
              `Zuordnungs-Bild ${i + 1}${f > 0 ? ` (Variante ${variantenBezeichnung(f)})` : ""}`,
            );
        });
      });
    }
    // Numerisch: Einheiten müssen mathjs-bekannt sein (die Plattform
    // rechnet Eingaben mit mathjs um – eine hier unbekannte Einheit
    // machte die Aufgabe unlösbar). mathjs ist devDependency dieses
    // Repos; die Prüfung lebt bewusst AUSSERHALB der SYNC-Region.
    if (isKnownBlock(block) && block.type === "numerisch") {
      [block, ...(block.varianten ?? [])].forEach((fassung, f) => {
        fassung.aufgaben.forEach((aufgabe, i) => {
          if (aufgabe.einheit !== undefined && !istBekannteEinheit(aufgabe.einheit)) {
            errors.push(
              `Numerisch-Aufgabe ${i + 1}${f > 0 ? ` (Variante ${variantenBezeichnung(f)})` : ""}: Die Einheit "${aufgabe.einheit}" kennt mathjs nicht (ASCII-Schreibweise nutzen, z. B. "degC" statt "°C", "m^2" statt "m²").`,
            );
          }
        });
      });
    }
    // Term: Musterlösungen müssen parsebar sein und den Baum-Filter der
    // SYNC-Region bestehen (der Player sortiert unparsebare Antworten
    // aus und meldet die Aufgabe als defekt – hier fällt das früher auf).
    if (isKnownBlock(block) && block.type === "term") {
      [block, ...(block.varianten ?? [])].forEach((fassung, f) => {
        fassung.aufgaben.forEach((aufgabe, i) => {
          aufgabe.antworten.forEach((antwort, j) => {
            const fehler = termAntwortFehler(antwort);
            if (fehler !== null) {
              errors.push(
                `Term-Aufgabe ${i + 1}${f > 0 ? ` (Variante ${variantenBezeichnung(f)})` : ""}, Antwort ${j + 1} ("${antwort}"): ${fehler} – erlaubt sind Zahlen, + - * / ^, Klammern, sqrt/abs/sin/cos/tan/log/exp und pi/e in mathjs-Schreibweise.`,
              );
            }
          });
        });
      });
    }
  }

  // --- Planspiele: eigene Datei, Dokumentanfang, Grösse, keine externen ----
  // Verweise. Die Textmuster-Prüfung ist bewusst streng (läuft auch über
  // Kommentare/Strings); die harte Laufzeit-Grenze bleibt die CSP im
  // sandbox-iframe des Players.
  const referenziertePlanspiele = new Set<string>();
  for (const block of mod.blocks) {
    if (!isKnownBlock(block) || block.type !== "planspiel") continue;
    const erwartet = `/content/${mod.id}/`;
    if (!block.datei.startsWith(erwartet)) {
      errors.push(
        `Planspiel "${block.datei}" – die Datei gehört in den eigenen Modulordner und heisst "${erwartet}<datei>.html".`,
      );
      continue;
    }
    const fileName = block.datei.slice(erwartet.length);
    referenziertePlanspiele.add(fileName);
    const datei = path.join(modDir, fileName);
    if (!fs.existsSync(datei)) {
      errors.push(
        `Planspiel "${block.datei}" nicht gefunden – die Datei gehört neben die module.json in modules/${mod.id}/.`,
      );
      continue;
    }
    // Vor dem Lesen prüfen – eine versymlinkte Datei könnte sonst fremde
    // Inhalte in Fehlermeldungen (CI-Logs) ziehen.
    if (fs.lstatSync(datei).isSymbolicLink()) {
      errors.push(`Planspiel "${fileName}" ist ein Symlink – nur echte Dateien sind erlaubt.`);
      continue;
    }
    const kb = Math.round(fs.statSync(datei).size / 1024);
    if (kb > whitelist.maxPlanspielSizeKB) {
      errors.push(
        `Planspiel "${fileName}" ist ${kb} KB gross – erlaubt sind höchstens ${whitelist.maxPlanspielSizeKB} KB (schema/whitelist.json → maxPlanspielSizeKB).`,
      );
      continue;
    }
    const text = fs.readFileSync(datei, "utf8");
    if (!PLANSPIEL_DOKUMENT_PRAEFIX.test(text)) {
      errors.push(
        `Planspiel "${fileName}": Die Datei muss mit "<!doctype html><html><head>" beginnen – der Player injiziert dort seine Sicherheitsrichtlinie und führt andere Dokumente nicht aus.`,
      );
    }
    for (const { muster, grund } of PLANSPIEL_VERBOTENE_MUSTER) {
      if (muster.test(text)) {
        errors.push(
          `Planspiel "${fileName}": ${grund} ist nicht erlaubt – Planspiele sind vollständig eigenständig (keine externen Ressourcen, kein Netzzugriff).`,
        );
      }
    }
  }

  // --- Ordnerhygiene: nur module.json + Bilder -----------------------------
  for (const entry of fs.readdirSync(modDir, { withFileTypes: true })) {
    // Symlinks strikt ablehnen: Sie könnten auf Dateien ausserhalb des
    // Repos zeigen (z. B. .git/config in der CI) und würden beim Lesen/
    // Kopieren stillschweigend deren Inhalt übernehmen.
    if (entry.isSymbolicLink()) {
      errors.push(
        `"${entry.name}" ist ein Symlink – in Modulordnern sind nur echte Dateien erlaubt.`,
      );
      continue;
    }
    if (entry.name.startsWith(".")) {
      hints.push(`Versteckte Datei "${entry.name}" im Modulordner – bitte nicht committen.`);
      continue;
    }
    if (entry.isDirectory()) {
      errors.push(
        `Unterordner "${entry.name}/" in modules/${slug}/ – Module sind flach aufgebaut (module.json + Bilder direkt im Ordner).`,
      );
      continue;
    }
    if (entry.name === "module.json") continue;
    // Sprachfassungen prüft pruefeFassungen (Kanonform, selfHash,
    // Strukturgleichheit) – hier zählt nur, dass der Name ins Muster passt.
    if (FASSUNG_MUSTER.test(entry.name)) continue;
    const ext = path.extname(entry.name).toLowerCase();
    // Video-/Audiodateien prüfen die Abschnitte oben (Grösse + Referenz);
    // hier zählt nur, dass die Endung überhaupt ins Modul gehört.
    if (whitelist.videoExtensions.includes(ext)) continue;
    if (whitelist.audioExtensions.includes(ext)) {
      if (!referenzierteAudios.has(entry.name)) {
        hints.push(`Audio "${entry.name}" wird von keinem Block referenziert.`);
      }
      continue;
    }
    // Planspiel-Dateien prüft der Planspiel-Abschnitt oben (Format +
    // Grösse + verbotene Muster); unreferenziertes HTML hat im Modul
    // nichts verloren – die Plattform veröffentlicht es ohnehin nie.
    if (ext === ".html") {
      if (!referenziertePlanspiele.has(entry.name)) {
        errors.push(
          `Datei "${entry.name}" gehört nicht ins Modul – .html-Dateien sind nur als Planspiel erlaubt und müssen von einem planspiel-Block referenziert werden.`,
        );
      }
      continue;
    }
    if (!whitelist.imageExtensions.includes(ext)) {
      errors.push(
        `Datei "${entry.name}" gehört nicht ins Modul – erlaubt sind module.json, Bilder (${whitelist.imageExtensions.join(", ")}), Videos (${whitelist.videoExtensions.join(", ")}) und referenzierte Planspiel-Dateien (.html).`,
      );
      continue;
    }
    const sizeKB = fs.statSync(path.join(modDir, entry.name)).size / 1024;
    if (sizeKB > whitelist.maxImageSizeKB) {
      errors.push(
        `Bild "${entry.name}" ist ${Math.round(sizeKB)} KB gross – erlaubt sind maximal ${whitelist.maxImageSizeKB} KB (Bild verkleinern/komprimieren).`,
      );
    }
    if (!referencedImages.has(entry.name)) {
      hints.push(`Bild "${entry.name}" wird von keinem Block referenziert.`);
    }
  }

  // --- Modul-Querverweise [[modul:<slug>]] (22.9.2026) ---------------------
  // Tote Ziele, unvollständige Syntax und Verweise ausserhalb der
  // Fliesstext-Whitelist sind FEHLER – rohe Syntax oder tote Links
  // erreichen nie den Player. Der Hauptlauf ruft modulVerweisFehler
  // zusätzlich für JEDE Sprachfassung auf (auch dort dürfen etwa
  // verbreiterte Lücken-Antwortlisten keine Verweise tragen).
  errors.push(...modulVerweisFehler(raw, allSlugs));

  // Modultitel dürfen keine {{n}}-Marker tragen: Aufgelöste
  // Modul-Verweise landen als Titel-Text in Lückentexten, deren
  // Marker-Zerlegung NACH der Auflösung läuft – ein Marker im Titel
  // injizierte eine Phantom-Lücke (Review-Fund 22.9.2026).
  if (/\{\{\d+\}\}/.test(mod.title)) {
    errors.push(
      `"title": "${mod.title}" darf keine {{n}}-Marker enthalten (aufgelöste Modul-Verweise stehen in Lückentexten).`,
    );
  }

  // --- Kein Roh-HTML; Markdown-Bilder unterliegen der Bild-Whitelist -------
  walkStrings(raw, [], (pathStr, s) => {
    const tags = findHtmlTags(s);
    if (tags.length > 0) {
      errors.push(
        `Roh-HTML in "${pathStr}": ${[...new Set(tags)].join(" ")} – bitte Markdown verwenden (der Player rendert kein HTML, die Tags würden als Text erscheinen).`,
      );
    }
    const { urls, malformed } = findMarkdownImages(s);
    for (const url of urls) {
      checkBildUrl(url, `Markdown-Bild in "${pathStr}"`);
    }
    if (malformed > 0) {
      errors.push(
        `Markdown-Bild in "${pathStr}": Referenz-Stil (![alt][ref]) oder unvollständige Bild-Syntax ist nicht erlaubt – bitte direkt ![Beschreibung](/content/${mod.id}/datei.jpg) schreiben.`,
      );
    }
  });

  // --- IDs innerhalb des Moduls müssen eindeutig sein ----------------------
  const ids = [
    ...mod.blocks.map((b) => ("id" in b && typeof b.id === "string" ? b.id : null)),
    ...mod.blocks.flatMap((b) =>
      isKnownBlock(b) && b.type === "tasks" ? b.tasks.map((t) => t.id ?? null) : [],
    ),
    ...mod.blocks.flatMap((b) =>
      isKnownBlock(b) && b.type === "quiz" ? b.questions.map((q) => q.id ?? null) : [],
    ),
    ...mod.blocks.flatMap((b) =>
      isKnownBlock(b) && b.type === "simulation"
        ? [b.abschlussfrage?.id ?? null]
        : [],
    ),
  ].filter((id): id is string => id !== null);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const dup of [...new Set(duplicates)]) {
    errors.push(`ID "${dup}" ist mehrfach vergeben (Blöcke/Aufgaben/Fragen brauchen eindeutige IDs).`);
  }
  // Plattform-Regeln (gespiegelt aus everycate-app, idRegelFehler in
  // src/lib/content/meta.ts – bei Änderungen dort mitziehen): ids wandern
  // als Lernstand-/Report-Schlüssel in die Plattform. "~" ist der
  // reservierte Namensraum der automatischen Fallback-Schlüssel, ":"
  // trennt Block- und Aufgabenteil, und lange ids sprengen das
  // fail-closed geprüfte Report-Limit.
  for (const id of new Set(ids)) {
    if (id.startsWith("~")) {
      errors.push(`id "${id}" darf nicht mit "~" beginnen (reserviert für automatische Schlüssel).`);
    } else if (id.includes(":")) {
      errors.push(`id "${id}" darf keinen Doppelpunkt enthalten (":" trennt Block- und Aufgabenteil im Lernstand-Schlüssel).`);
    } else if (id.length > 64) {
      errors.push(`id "${id.slice(0, 24)}…" ist länger als 64 Zeichen – bitte kürzen (Schlüssel wandern in Lernstand und Report).`);
    }
  }

  // --- Quizfragen brauchen stabile ids -------------------------------------
  // Der Lernstand speichert Statistiken pro Frage – ohne id würde bei
  // Umsortierungen die Statistik verschiedener Fragen vermischt.
  mod.blocks.forEach((b, i) => {
    if (!isKnownBlock(b) || b.type !== "quiz") return;
    b.questions.forEach((q, j) => {
      if (!q.id) {
        errors.push(
          `blocks.${i} (Quiz): Frage ${j + 1} hat keine "id". Stabile ids sind Pflicht (z. B. "q${j + 1}"), damit Lernstatistiken bei Content-Änderungen korrekt bleiben.`,
        );
      }
    });
  });

  // --- requires muss auf existierende Module zeigen (FEHLER seit
  // 15.9.2026 – ein fehlendes Ziel ist ein kaputter Lernpfad, kein
  // Schönheitsfehler; vorher nur Warnung) und darf das Modul nicht
  // selbst referenzieren. Zyklen über mehrere Module prüft der
  // Repo-weite Lauf am Ende (pruefeRequiresZyklen).
  for (const req of mod.requires) {
    if (req === mod.id) {
      errors.push(`requires verweist auf das Modul selbst ("${req}").`);
    } else if (!allSlugs.includes(req)) {
      errors.push(
        `requires verweist auf "${req}" – dieses Modul existiert nicht. Ziel-Modul im selben Pull Request mitliefern oder den Eintrag entfernen.`,
      );
    }
  }

  // --- Lehrplanabhängige Angaben gehören NICHT in die dauerhafte ID
  // (Lernstände/Reports hängen daran; die Stufe steht je Lehrplan in
  // curricula und kann sich ändern). HINWEIS statt Fehler: Der Bestand
  // trägt ein Alt-Modul mit Stufe in der ID (bewusst nicht umbenannt).
  if (/(^|-)(stufe|klasse|zyklus)\d+(-|$)|(^|-)sek[12](-|$)/.test(mod.id)) {
    hints.push(
      `Die id "${mod.id}" enthält eine lehrplanabhängige Stufenangabe – für NEUE Module bitte ohne (CONTENT-ERSTELLEN.md, Abschnitt Pflichtfelder).`,
    );
  }

  // --- Einheit ohne Lernreihenfolge (Warnung) ------------------------------
  // Der Katalog zeigt dann bewusst keine Lernpfad-Nummern – vermutlich ist
  // das Vergessen der sequenz aber ein Versehen.
  if (mod.einheit && mod.sequenz === undefined) {
    hints.push(
      `einheit "${mod.einheit}" ist gesetzt, aber ohne "sequenz" – der Katalog zeigt für dieses Modul keine Lernpfad-Nummer.`,
    );
  }

  return { errors, hints };
}

// ---------------------------------------------------------------------------
// Hauptlauf
// ---------------------------------------------------------------------------

function moduleDirs(): string[] {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

const slugs = moduleDirs();

if (slugs.length === 0) {
  console.error("✗ Keine Module unter modules/ gefunden – dieses Repository existiert für Module.");
  process.exit(1);
}

/**
 * Repo-Policy (seit Schema-Version 3, 14.8.2026): Das Content-Repo
 * nimmt nur noch Version-3-Dateien an – die Legacy-Metadaten
 * (subject/…/competencies + lehrplaene) sind durch `curricula`
 * ersetzt. Geprüft werden NUR die Top-Level-Schlüssel des ROH-JSON
 * (die curricula-EINTRAGSFELDER heissen absichtlich gleich wie die
 * alten Top-Level-Felder – eine rekursive Suche fände sie in jedem
 * gültigen Modul), und zwar VOR parseModulDatei: Die Klartext-Meldung
 * muss erscheinen, BEVOR generische Zod-Fehler in die Irre führen
 * (eine «schemaVersion 2 + curricula»-Mischdatei bekäme sonst den
 * gegenteiligen Rat, `curricula` zu entfernen).
 */
const LEGACY_TOP_LEVEL_FELDER = [
  "subject",
  "subjectName",
  "cycle",
  "grades",
  "curriculum",
  "competencies",
  "lehrplaene",
] as const;

function repoPolicyFehler(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return [];
  const obj = raw as Record<string, unknown>;
  const meldungen: string[] = [];
  if (obj.schemaVersion !== 3) {
    meldungen.push(
      `Das Content-Repo nimmt nur noch "schemaVersion": 3 an (curricula-Struktur) – diese Datei trägt ${JSON.stringify(obj.schemaVersion)}. Migration alt→neu: siehe CONTENT-SCHEMA.md.`,
    );
  }
  const legacy = LEGACY_TOP_LEVEL_FELDER.filter((key) => key in obj);
  if (legacy.length > 0) {
    meldungen.push(
      `Alte Doppelstruktur erkannt (Top-Level ${legacy.map((k) => `"${k}"`).join(", ")}) – Fach, Stufe und Kompetenzen leben seit Version 3 NUR im Feld "curricula". Mapping alt→neu: siehe CONTENT-SCHEMA.md.`,
    );
  }
  return meldungen;
}

let failed = 0;

/** requires je Modul – für den Repo-weiten Zyklen-Check am Ende. */
const requiresJeModul = new Map<string, string[]>();

for (const slug of slugs) {
  const file = path.join(MODULES_DIR, slug, "module.json");
  const errors: string[] = [];
  const hints: string[] = [];

  if (!fs.existsSync(file)) {
    console.error(`✗ ${slug}\n  - modules/${slug}/module.json existiert nicht.`);
    failed++;
    continue;
  }

  // Vor dem Lesen prüfen – eine versymlinkte module.json könnte sonst
  // fremde Dateiinhalte in Fehlermeldungen (CI-Logs) ziehen.
  if (fs.lstatSync(file).isSymbolicLink()) {
    console.error(`✗ ${slug}\n  - module.json ist ein Symlink – nur echte Dateien sind erlaubt.`);
    failed++;
    continue;
  }

  // Grössen-Guard: schützt Build und Deployment vor absurd grossen Dateien.
  const sizeKB = fs.statSync(file).size / 1024;
  if (sizeKB > whitelist.maxModuleJsonKB) {
    console.error(
      `✗ ${slug}\n  - module.json ist ${Math.round(sizeKB)} KB gross – erlaubt sind maximal ${whitelist.maxModuleJsonKB} KB.`,
    );
    failed++;
    continue;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    console.error(
      `✗ ${slug}\n  - module.json ist kein gültiges JSON (${(err as Error).message}).`,
    );
    failed++;
    continue;
  }

  // Repo-Policy VOR dem Schema-Parse (siehe repoPolicyFehler oben).
  const policy = [...repoPolicyFehler(raw), ...masterMetafeldFehler(raw)];
  if (policy.length > 0) {
    console.error(`✗ ${slug}`);
    for (const meldung of policy) console.error(`  - ${meldung}`);
    failed++;
    continue;
  }

  // Schema-Parse: parseModulDatei versteht auch die Versionen 1/2
  // (Plattform-Migration für lokale Module) – ins REPO dürfen sie
  // dank der Policy oben aber nicht mehr.
  const parsed = parseModulDatei(raw);
  if (!parsed.success) {
    console.error(`✗ ${slug}\n${describeIssues(raw, parsed.error).join("\n")}`);
    failed++;
    continue;
  }

  if (parsed.data.id !== slug) {
    errors.push(`"id" (${parsed.data.id}) muss dem Ordnernamen (${slug}) entsprechen.`);
  }

  // Repo-Module brauchen mindestens eine Lehrplan-Zuordnung – ohne
  // curricula erschiene das Modul in keinem Katalog-Filter (das Schema
  // lässt das Feld für LOKALE Module bewusst optional).
  if (parsed.data.curricula === undefined || parsed.data.curricula.length === 0) {
    errors.push(
      `"curricula" braucht mindestens einen Lehrplan-Eintrag (z. B. {"curriculum": "li", "subject": "…", "grades": [9]}).`,
    );
  }

  requiresJeModul.set(slug, parsed.data.requires);

  const result = checkModule(slug, raw, parsed.data, slugs);
  errors.push(...result.errors);
  hints.push(...result.hints);

  // Sprachfassungen (module.<lang>.json) desselben Ordners. Der
  // try/catch ist das letzte Netz: Ein Prüf-Fehler in einer Fassung
  // darf nie den Gesamtlauf (und damit die Meldungen aller anderen
  // Module) abreissen.
  try {
    const fassungen = pruefeFassungen(slug, raw, parsed.data, {
      parse: (fassungRaw) => {
        const ergebnis = parseModulDatei(fassungRaw);
        return ergebnis.success
          ? { success: true, data: ergebnis.data }
          : { success: false, beschreibung: describeIssues(fassungRaw, ergebnis.error) };
      },
    });
    errors.push(...fassungen.errors);
    hints.push(...fassungen.hints);
  } catch (err) {
    errors.push(`Sprachfassungs-Prüfung fehlgeschlagen: ${(err as Error).message}`);
  }

  // Teilkompetenz-Referenzen der Sprachfassungen (Master siehe
  // checkModule): Die Kennungen sind zwar invariant und damit
  // byteidentisch zum Master (Strukturgleichheit), die Register-Prüfung
  // läuft aber bewusst auch über jede Fassung – wie im
  // Plattform-Validierer, der Master UND Fassungen durch checkModule
  // schickt. Unlesbare/ungültige Fassungen meldet pruefeFassungen.
  for (const eintrag of fs.readdirSync(path.join(MODULES_DIR, slug))) {
    if (!FASSUNG_MUSTER.test(eintrag)) continue;
    try {
      const fassungRaw = JSON.parse(
        fs.readFileSync(path.join(MODULES_DIR, slug, eintrag), "utf8"),
      ) as unknown;
      const fassungParsed = parseModulDatei(fassungRaw);
      if (fassungParsed.success) {
        errors.push(
          ...teilkompetenzReferenzFehler(fassungParsed.data).map(
            (e) => `(${eintrag}) ${e}`,
          ),
        );
      }
      // Modul-Querverweise auch je Fassung (Syntax/Whitelist/tote
      // Ziele auf dem ROHEN Objekt): Der Multiset-Vergleich der
      // Strukturprüfung deckt frei übersetzbare Unterbäume (z. B.
      // verbreiterte Lücken-Antwortlisten) nicht ab (Review-Fund
      // 22.9.2026).
      errors.push(
        ...modulVerweisFehler(fassungRaw, slugs).map((e) => `(${eintrag}) ${e}`),
      );
    } catch {
      // kein gültiges JSON: bereits von pruefeFassungen gemeldet
    }
  }

  if (errors.length > 0) {
    failed++;
    console.error(`✗ ${slug}`);
    for (const e of errors) console.error(`  - ${e}`);
  } else {
    const fragen = parsed.data.blocks.reduce(
      (summe, b) =>
        summe + (isKnownBlock(b) && b.type === "quiz" ? b.questions.length : 0),
      0,
    );
    const quizInfo = fragen > 0 ? `${fragen} Quizfragen` : "kein Quiz";
    console.log(`✓ ${slug} – ${parsed.data.blocks.length} Blöcke, ${quizInfo}`);
  }
  for (const h of hints) console.log(`  ℹ ${h}`);
}

// Warn-Resümee der Kompetenz-Tabellen (Hinweise, KEINE Fehler) – wie im
// Plattform-Validierer: Register-Einträge ohne Verwendung in irgendeinem
// Modul oder ohne Lehrplan-Mapping sind vermutlich Versehen – oder
// bewusste Vorarbeit.
for (const kennung of Object.keys(kompetenzRegister)) {
  if (!kompetenzVerwendet.has(kennung)) {
    console.log(
      `  ℹ Kompetenzen: "${kennung}" steht im Register, wird aber von keinem Modul referenziert.`,
    );
  }
  const zuordnungen = kompetenzMapping[kennung];
  if (!zuordnungen || Object.keys(zuordnungen).length === 0) {
    console.log(
      `  ℹ Kompetenzen: "${kennung}" hat kein Lehrplan-Mapping (mapping.json) – erscheint im Dashboard unter «ohne Zuordnung».`,
    );
  }
}

// Repo-weiter requires-Zyklen-Check (15.9.2026): Ein Kreis aus
// Voraussetzungen («A braucht B braucht A») wäre ein Lernpfad ohne
// Einstieg – Fehler, nicht Warnung. Selbstbezüge meldet checkModule
// bereits je Modul; hier geht es um Kreise über mehrere Module
// (Tiefensuche mit Drei-Farben-Markierung, deterministische Ausgabe).
{
  const farbe = new Map<string, 1 | 2>();
  const zyklen: string[][] = [];
  const besuche = (slug: string, pfad: string[]): void => {
    farbe.set(slug, 1);
    for (const ziel of requiresJeModul.get(slug) ?? []) {
      // Selbstbezug meldet checkModule bereits je Modul – hier nicht
      // doppelt als «Zyklus» ausgeben.
      if (ziel === slug) continue;
      if (farbe.get(ziel) === 1) {
        zyklen.push([...pfad.slice(pfad.indexOf(ziel)), ziel]);
      } else if (!farbe.has(ziel) && requiresJeModul.has(ziel)) {
        besuche(ziel, [...pfad, ziel]);
      }
    }
    farbe.set(slug, 2);
  };
  for (const slug of [...requiresJeModul.keys()].sort()) {
    if (!farbe.has(slug)) besuche(slug, [slug]);
  }
  for (const zyklus of zyklen) {
    console.error(
      `✗ requires-Zyklus: ${zyklus.join(" → ")} – Voraussetzungen dürfen keinen Kreis bilden.`,
    );
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} von ${slugs.length} Modulen sind ungültig.`);
  process.exit(1);
}
console.log(`\nAlle ${slugs.length} Module sind gültig.`);

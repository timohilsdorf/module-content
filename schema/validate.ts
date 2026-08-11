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
 * - Ordnerhygiene: im Modulordner nur module.json, Bilder, Videos und
 *   referenzierte Planspiel-Dateien
 * - eindeutige IDs, Pflicht-IDs für Quizfragen, requires-Verweise
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { create, unitDependencies, parseDependencies } from "mathjs";

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
  isKnownBlock,
  KNOWN_BLOCK_TYPES,
  knownBlockSchema,
  parseModulDatei,
  PLANSPIEL_DOKUMENT_PRAEFIX,
  PLANSPIEL_VERBOTENE_MUSTER,
  termBaumFehler,
  VIDEO_DATEI_MUSTER,
  type LearningModule,
  type TermKnoten,
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
// Hilfen: lesbare Zod-Fehler (übernommen aus dem Plattform-Loader)
// ---------------------------------------------------------------------------

function valueAtPath(value: unknown, pathParts: PropertyKey[]): unknown {
  return pathParts.reduce<unknown>(
    (acc, key) =>
      acc == null ? undefined : (acc as Record<PropertyKey, unknown>)[key],
    value,
  );
}

/**
 * Macht Zod-Fehler für Content-Autoren (Mensch wie KI) lesbar. Zods
 * Union-Heuristik verwirft bei `blocks` die präzisen Issues des bekannten
 * Block-Zweigs – deshalb wird ein Block mit bekanntem `type` gezielt
 * nachvalidiert.
 */
function describeIssues(raw: unknown, error: z.ZodError): string[] {
  const lines: string[] = [];

  const walk = (issues: z.core.$ZodIssue[], basePath: PropertyKey[]) => {
    for (const issue of issues) {
      const fullPath = [...basePath, ...issue.path];
      const pathStr = fullPath.join(".") || "(root)";

      const value = valueAtPath(raw, fullPath);
      const type =
        value && typeof value === "object"
          ? (value as { type?: unknown }).type
          : undefined;
      if (
        typeof type === "string" &&
        (KNOWN_BLOCK_TYPES as readonly string[]).includes(type) &&
        (issue.code === "invalid_union" ||
          issue.message.includes("Bekannter Blocktyp"))
      ) {
        const sub = knownBlockSchema.safeParse(value);
        if (!sub.success) {
          walk(sub.error.issues, fullPath);
          continue;
        }
      }

      if (issue.code === "invalid_union") {
        const branches = (issue as { errors?: z.core.$ZodIssue[][] }).errors;
        if (branches?.length) {
          for (const branch of branches) walk(branch, fullPath);
          continue;
        }
      }

      lines.push(`  - ${pathStr}: ${issue.message}`);
    }
  };

  walk(error.issues, []);
  return [...new Set(lines)];
}

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
function stripCode(value: string): string {
  return value.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

/**
 * Findet Roh-HTML in einem String. Erlaubt bleiben Markdown-Autolinks
 * (`<https://…>`, `<mailto:…>`) sowie Tag-Beispiele in Code-Spans und
 * Code-Blöcken (dort rendert Markdown sie als Text, z. B. wenn ein Modul
 * HTML erklärt). Alles andere, das wie ein Tag aussieht, wird gemeldet –
 * der Player rendert kein HTML, in Markdown-Feldern würde es sogar
 * verschluckt.
 */
function findHtmlTags(value: string): string[] {
  const matches = stripCode(value).match(/<\/?[a-zA-Z][^>]*>/g) ?? [];
  return matches.filter((m) => !/^<(https?:\/\/|mailto:)/i.test(m));
}

/**
 * Bilder in Markdown-Text (`![alt](url)`): unterliegen denselben Regeln wie
 * image-Blöcke – sonst liesse sich die Bild-Host-Whitelist per Textfeld
 * umgehen (automatischer Request an Drittserver = Tracking-Risiko).
 * Referenz-Stil (`![alt][ref]`) ist nicht erlaubt, damit die URL immer
 * direkt an der Bildstelle prüfbar ist.
 */
function findMarkdownImages(value: string): { urls: string[]; malformed: number } {
  const text = stripCode(value);
  const inline = /!\[[^\]]*\]\(\s*<?([^\s)>]+)[^)]*\)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  let wellFormed = 0;
  while ((match = inline.exec(text)) !== null) {
    urls.push(match[1]);
    wellFormed++;
  }
  const total = (text.match(/!\[/g) ?? []).length;
  return { urls, malformed: total - wellFormed };
}

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

function checkModule(
  slug: string,
  raw: unknown,
  mod: LearningModule,
  allSlugs: string[],
): { errors: string[]; hints: string[] } {
  const errors: string[] = [];
  const hints: string[] = [];
  const modDir = path.join(MODULES_DIR, slug);

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
    }
    // Zuordnungs-Bilder unterliegen denselben Regeln wie image-Blöcke.
    if (isKnownBlock(block) && block.type === "zuordnung") {
      block.paare.flatMap((p) => [p.links, p.rechts]).forEach((element, i) => {
        if (element.bild) checkBildUrl(element.bild.src, `Zuordnungs-Bild ${i + 1}`);
      });
    }
    // Numerisch: Einheiten müssen mathjs-bekannt sein (die Plattform
    // rechnet Eingaben mit mathjs um – eine hier unbekannte Einheit
    // machte die Aufgabe unlösbar). mathjs ist devDependency dieses
    // Repos; die Prüfung lebt bewusst AUSSERHALB der SYNC-Region.
    if (isKnownBlock(block) && block.type === "numerisch") {
      block.aufgaben.forEach((aufgabe, i) => {
        if (aufgabe.einheit !== undefined && !istBekannteEinheit(aufgabe.einheit)) {
          errors.push(
            `Numerisch-Aufgabe ${i + 1}: Die Einheit "${aufgabe.einheit}" kennt mathjs nicht (ASCII-Schreibweise nutzen, z. B. "degC" statt "°C", "m^2" statt "m²").`,
          );
        }
      });
    }
    // Term: Musterlösungen müssen parsebar sein und den Baum-Filter der
    // SYNC-Region bestehen (der Player sortiert unparsebare Antworten
    // aus und meldet die Aufgabe als defekt – hier fällt das früher auf).
    if (isKnownBlock(block) && block.type === "term") {
      block.aufgaben.forEach((aufgabe, i) => {
        aufgabe.antworten.forEach((antwort, j) => {
          const fehler = termAntwortFehler(antwort);
          if (fehler !== null) {
            errors.push(
              `Term-Aufgabe ${i + 1}, Antwort ${j + 1} ("${antwort}"): ${fehler} – erlaubt sind Zahlen, + - * / ^, Klammern, sqrt/abs/sin/cos/tan/log/exp und pi/e in mathjs-Schreibweise.`,
            );
          }
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

  // --- requires soll auf existierende Module zeigen (Warnung) --------------
  for (const req of mod.requires) {
    if (!allSlugs.includes(req)) {
      hints.push(`requires verweist auf "${req}" – dieses Modul existiert (noch) nicht.`);
    }
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

let failed = 0;

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

  // Versioniertes Einlesen: Version-1-Dateien (Quiz als Sonderfeld)
  // bleiben gültig und werden verlustfrei migriert (parseModulDatei).
  const parsed = parseModulDatei(raw);
  if (!parsed.success) {
    console.error(`✗ ${slug}\n${describeIssues(raw, parsed.error).join("\n")}`);
    failed++;
    continue;
  }

  if (parsed.data.id !== slug) {
    errors.push(`"id" (${parsed.data.id}) muss dem Ordnernamen (${slug}) entsprechen.`);
  }

  const result = checkModule(slug, raw, parsed.data, slugs);
  errors.push(...result.errors);
  hints.push(...result.hints);

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

if (failed > 0) {
  console.error(`\n${failed} von ${slugs.length} Modulen sind ungültig.`);
  process.exit(1);
}
console.log(`\nAlle ${slugs.length} Module sind gültig.`);

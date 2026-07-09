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
 * - Ordnerhygiene: im Modulordner nur module.json und Bilder
 * - eindeutige IDs, Pflicht-IDs für Quizfragen, requires-Verweise
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  isKnownBlock,
  KNOWN_BLOCK_TYPES,
  knownBlockSchema,
  moduleSchema,
  type LearningModule,
} from "./schema";

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
  imageHosts: z.array(z.string().min(1)),
  imageExtensions: z.array(z.string().regex(/^\.[a-z0-9]+$/)),
  maxImageSizeKB: z.number().int().positive(),
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

/**
 * Findet Roh-HTML in einem String. Erlaubt bleiben Markdown-Autolinks
 * (`<https://…>`, `<mailto:…>`) sowie Tag-Beispiele in Code-Spans und
 * Code-Blöcken (dort rendert Markdown sie als Text, z. B. wenn ein Modul
 * HTML erklärt). Alles andere, das wie ein Tag aussieht, wird gemeldet –
 * der Player rendert kein HTML, in Markdown-Feldern würde es sogar
 * verschluckt.
 */
function findHtmlTags(value: string): string[] {
  const withoutCode = value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`\n]*`/g, "");
  const matches = withoutCode.match(/<\/?[a-zA-Z][^>]*>/g) ?? [];
  return matches.filter((m) => !/^<(https?:\/\/|mailto:)/i.test(m));
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
      const host = block.url ? hostOf(block.url) : null;
      if (whitelist.videoUrlHosts.length === 0) {
        errors.push(
          'Direkte Video-Datei-URLs (provider "url") sind derzeit nicht freigegeben – bitte YouTube/Vimeo verwenden oder den Host per PR in schema/whitelist.json (videoUrlHosts) vorschlagen.',
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

  // --- Bilder: Ablage im Modulordner, Endung, Remote-Hosts -----------------
  const referencedImages = new Set<string>();
  for (const block of mod.blocks) {
    if (!isKnownBlock(block) || block.type !== "image") continue;
    const src = block.src;
    if (src.startsWith("/")) {
      const match = src.match(/^\/content\/([a-z0-9-]+)\/([^/]+)$/);
      if (!match || match[1] !== mod.id) {
        errors.push(
          `Bild-src "${src}": lokale Bilder liegen im Modulordner und werden als "/content/${mod.id}/<datei>" referenziert.`,
        );
        continue;
      }
      const fileName = match[2];
      const ext = path.extname(fileName).toLowerCase();
      if (!whitelist.imageExtensions.includes(ext)) {
        errors.push(
          `Bild "${fileName}": Endung "${ext || "(keine)"}" ist nicht erlaubt. Erlaubt: ${whitelist.imageExtensions.join(", ")}.`,
        );
      }
      if (!fs.existsSync(path.join(modDir, fileName))) {
        errors.push(
          `Bild nicht gefunden: "${fileName}" fehlt im Ordner modules/${slug}/.`,
        );
      }
      referencedImages.add(fileName);
    } else if (src.startsWith("https://")) {
      const host = hostOf(src);
      if (!host || !whitelist.imageHosts.includes(host)) {
        errors.push(
          `Bild-Host "${host ?? src}" ist nicht freigegeben. Erlaubte Hosts (schema/whitelist.json → imageHosts): ${whitelist.imageHosts.join(", ") || "derzeit keine"} – oder das Bild herunterladen und in den Modulordner legen.`,
        );
      }
    } else {
      errors.push(
        `Bild-src "${src}" muss mit "/content/${mod.id}/" (Datei im Modulordner) oder "https://" beginnen.`,
      );
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
    if (!whitelist.imageExtensions.includes(ext)) {
      errors.push(
        `Datei "${entry.name}" gehört nicht ins Modul – erlaubt sind module.json und Bilder (${whitelist.imageExtensions.join(", ")}).`,
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

  // --- Kein Roh-HTML in Textfeldern ----------------------------------------
  walkStrings(raw, [], (pathStr, s) => {
    const tags = findHtmlTags(s);
    if (tags.length > 0) {
      errors.push(
        `Roh-HTML in "${pathStr}": ${[...new Set(tags)].join(" ")} – bitte Markdown verwenden (der Player rendert kein HTML, die Tags würden als Text erscheinen).`,
      );
    }
  });

  // --- IDs innerhalb des Moduls müssen eindeutig sein ----------------------
  const ids = [
    ...mod.blocks.map((b) => ("id" in b && typeof b.id === "string" ? b.id : null)),
    ...mod.blocks.flatMap((b) =>
      isKnownBlock(b) && b.type === "tasks" ? b.tasks.map((t) => t.id ?? null) : [],
    ),
    ...(mod.quiz?.questions.map((q) => q.id ?? null) ?? []),
  ].filter((id): id is string => id !== null);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  for (const dup of [...new Set(duplicates)]) {
    errors.push(`ID "${dup}" ist mehrfach vergeben (Blöcke/Aufgaben/Fragen brauchen eindeutige IDs).`);
  }

  // --- Quizfragen brauchen stabile ids -------------------------------------
  // Der Lernstand speichert Statistiken pro Frage – ohne id würde bei
  // Umsortierungen die Statistik verschiedener Fragen vermischt.
  mod.quiz?.questions.forEach((q, i) => {
    if (!q.id) {
      errors.push(
        `Quizfrage ${i + 1} hat keine "id". Stabile ids sind Pflicht (z. B. "q${i + 1}"), damit Lernstatistiken bei Content-Änderungen korrekt bleiben.`,
      );
    }
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

  const parsed = moduleSchema.safeParse(raw);
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
    const quizInfo = parsed.data.quiz
      ? `${parsed.data.quiz.questions.length} Quizfragen`
      : "kein Quiz";
    console.log(`✓ ${slug} – ${parsed.data.blocks.length} Blöcke, ${quizInfo}`);
  }
  for (const h of hints) console.log(`  ℹ ${h}`);
}

if (failed > 0) {
  console.error(`\n${failed} von ${slugs.length} Modulen sind ungültig.`);
  process.exit(1);
}
console.log(`\nAlle ${slugs.length} Module sind gültig.`);

/**
 * Verschlankt die Excalidraw-Szenen der schaubild-Blöcke eines Moduls
 * auf die KANONISCHE Form und schreibt die module.json neu:
 *
 *   npm run schaubild-verschlanken -- <slug> [<slug> …]
 *
 * Autorinnen fügen den rohen Editor-Export (excalidraw.com → Datei
 * exportieren → Inhalt in "szene" einsetzen) direkt ein; das Schema
 * verdaut ihn (transform verschlankt beim Parsen), aber im Repo soll
 * NUR die schlanke, kanonische Szene liegen (Modulgrösse, byte-stabile
 * Übersetzungs-Vergleiche) – der Validator erzwingt das. Kanonisch
 * heisst: exakt die Form, die parseModulDatei liefert (Feldauswahl
 * UND -reihenfolge des Schemas). Der übrige Datei-Inhalt bleibt
 * unangetastet; geschrieben wird in der üblichen Kanonform
 * (JSON.stringify(…, null, 1) + "\n").
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseModulDatei, isKnownBlock } from "./schema";

const MODULES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "modules",
);

const slugs = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (slugs.length === 0) {
  console.error("Aufruf: npm run schaubild-verschlanken -- <slug> [<slug> …]");
  process.exit(1);
}

let fehler = 0;
for (const slug of slugs) {
  const datei = path.join(MODULES_DIR, slug, "module.json");
  if (!fs.existsSync(datei)) {
    console.error(`✗ ${slug}: modules/${slug}/module.json existiert nicht.`);
    fehler++;
    continue;
  }
  const roh = JSON.parse(fs.readFileSync(datei, "utf8")) as Record<
    string,
    unknown
  >;
  const parsed = parseModulDatei(roh);
  if (!parsed.success) {
    console.error(
      `✗ ${slug}: Modul ist ungültig – erst die Schema-Fehler beheben (npm run validate):`,
    );
    for (const issue of parsed.error.issues.slice(0, 5)) {
      console.error(`    ${issue.path.join(".")}: ${issue.message}`);
    }
    fehler++;
    continue;
  }
  const rohBloecke = roh.blocks as Record<string, unknown>[];
  let geaendert = 0;
  parsed.data.blocks.forEach((block, i) => {
    if (!isKnownBlock(block) || block.type !== "schaubild") return;
    const kanonisch = JSON.parse(JSON.stringify(block.szene)) as unknown;
    if (JSON.stringify(rohBloecke[i].szene) !== JSON.stringify(kanonisch)) {
      const vorher = Buffer.byteLength(JSON.stringify(rohBloecke[i].szene), "utf8");
      const nachher = Buffer.byteLength(JSON.stringify(kanonisch), "utf8");
      rohBloecke[i].szene = kanonisch;
      geaendert++;
      console.log(
        `  blocks[${i}]: Szene verschlankt (${vorher} → ${nachher} Bytes).`,
      );
    }
  });
  if (geaendert > 0) {
    fs.writeFileSync(datei, JSON.stringify(roh, null, 1) + "\n");
    console.log(`✓ ${slug}: ${geaendert} Szene(n) kanonisch geschrieben.`);
  } else {
    console.log(`✓ ${slug}: alle Szenen bereits kanonisch.`);
  }
}
if (fehler > 0) process.exit(1);

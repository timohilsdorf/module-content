/**
 * Status-Matrix Modul × Sprache: aktuell / VERALTET / fehlt /
 * ausgenommen. Die interne Nachführungsliste des Übersetzungs-Systems –
 * veraltete Fassungen sind Arbeitsvorrat, keine Fehler (Exit-Code
 * bleibt 0). Läuft lokal (npm run uebersetzungs-status) und in der CI
 * (Schritt im validate-Workflow, Ausgabe zusätzlich in die
 * Lauf-Zusammenfassung, wenn GITHUB_STEP_SUMMARY gesetzt ist).
 */
import fs from "node:fs";
import path from "node:path";
import {
  FASSUNG_MUSTER,
  MODULES_DIR,
  dateiHash,
  hinweiseHash,
  ladeSprachen,
} from "./kern";
import { uebersetzungsSperren } from "./felder";

const sprachen = ladeSprachen();
const slugs = fs
  .readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const zeilen: string[][] = [];
const zaehler = { aktuell: 0, veraltet: 0, fehlt: 0, ausgenommen: 0 };

for (const slug of slugs) {
  const masterPfad = path.join(MODULES_DIR, slug, "module.json");
  if (!fs.existsSync(masterPfad)) continue;
  const roh = JSON.parse(fs.readFileSync(masterPfad, "utf8")) as Record<
    string,
    unknown
  >;
  const masterSprache = typeof roh.language === "string" ? roh.language : "de";
  const masterHash = dateiHash(masterPfad);
  const sperren = roh.languageLearning
    ? ["Sprachlernmodul"]
    : uebersetzungsSperren(roh);

  const zeile: string[] = [slug];
  for (const lang of sprachen) {
    if (lang === masterSprache) {
      zeile.push("Master");
      continue;
    }
    if (sperren.length > 0) {
      zeile.push(`ausgenommen (${sperren[0]})`);
      zaehler.ausgenommen++;
      continue;
    }
    const fassungsPfad = path.join(MODULES_DIR, slug, `module.${lang}.json`);
    if (!fs.existsSync(fassungsPfad)) {
      zeile.push("FEHLT");
      zaehler.fehlt++;
      continue;
    }
    try {
      const fassung = JSON.parse(fs.readFileSync(fassungsPfad, "utf8")) as {
        derivedFrom?: { masterHash?: string; hintsHash?: string | null };
      };
      const veraltetMaster = fassung.derivedFrom?.masterHash !== masterHash;
      const veraltetHinweise =
        (fassung.derivedFrom?.hintsHash ?? null) !== hinweiseHash(slug, lang);
      if (veraltetMaster || veraltetHinweise) {
        zeile.push(
          `VERALTET (${veraltetMaster ? "Master" : "Hinweise"} geändert)`,
        );
        zaehler.veraltet++;
      } else {
        zeile.push("aktuell");
        zaehler.aktuell++;
      }
    } catch {
      zeile.push("UNLESBAR");
      zaehler.veraltet++;
    }
  }
  zeilen.push(zeile);
}

const kopf = ["Modul", ...sprachen];
const breiten = kopf.map((k, i) =>
  Math.max(k.length, ...zeilen.map((z) => (z[i] ?? "").length)),
);
const zeileText = (z: string[]) =>
  z.map((wert, i) => wert.padEnd(breiten[i])).join("  ");

console.log(zeileText(kopf));
console.log(breiten.map((b) => "-".repeat(b)).join("  "));
for (const z of zeilen) console.log(zeileText(z));
console.log(
  `\n${zaehler.aktuell} aktuell, ${zaehler.veraltet} veraltet, ${zaehler.fehlt} fehlend, ${zaehler.ausgenommen} ausgenommen ` +
    `(Fassungen erzeugen/nachführen: npm run uebersetze -- --modul <slug> --sprache <lang>).`,
);

const zusammenfassung = process.env.GITHUB_STEP_SUMMARY;
if (zusammenfassung) {
  const md = [
    "## Übersetzungs-Status",
    "",
    `| ${kopf.join(" | ")} |`,
    `| ${kopf.map(() => "---").join(" | ")} |`,
    ...zeilen.map((z) => `| ${z.join(" | ")} |`),
    "",
    `**${zaehler.aktuell} aktuell, ${zaehler.veraltet} veraltet, ${zaehler.fehlt} fehlend, ${zaehler.ausgenommen} ausgenommen.**`,
    "",
  ].join("\n");
  fs.appendFileSync(zusammenfassung, md);
}

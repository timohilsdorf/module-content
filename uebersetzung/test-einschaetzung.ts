/**
 * Unit-Nachweis zum Einschätzungsblock mit automatischer Liste
 * (20.11.2026): Feld-Klassifikation (felder.ts), Segment-Extraktion,
 * Struktur-Vergleich Master ↔ Fassung und die Hinweise der Validierung.
 * Die Kerne (wirksame Liste, Hinweise) leben in der SYNC-Region von
 * schema/schema.ts und sind in der Plattform-Suite
 * tests/unit-aufgabenstand.ts ausführlich bewiesen – hier geht es um die
 * Verdrahtung in diesem Repo und um den Bestand.
 *
 * Aufruf: npm run test:uebersetzung   (läuft auch im CI-validate-Job)
 */
import fs from "node:fs";
import path from "node:path";
import { klassifizierePfad } from "./felder";
import { vergleicheStruktur } from "./struktur";
import { extrahiere } from "./uebersetze";
import {
  aufgabenTeilkompetenzen,
  einschaetzungsHinweise,
  isKnownBlock,
  parseModulDatei,
  wirksameEinschaetzungsKennungen,
} from "../schema/schema";

let ok = 0;
let fail = 0;
const check = (name: string, wahr: boolean, detail = ""): void => {
  if (wahr) {
    ok++;
    console.log(`✓ ${name}`);
  } else {
    fail++;
    console.log(`✗ ${name} ${detail}`);
  }
};

// --- Feld-Klassifikation ----------------------------------------------------

check(
  "blocks[].ausgeschlossen[] → invariant",
  klassifizierePfad("blocks[].ausgeschlossen[]") === "invariant",
);
check(
  "blocks[].teilkompetenzen[] bleibt invariant",
  klassifizierePfad("blocks[].teilkompetenzen[]") === "invariant",
);

// --- Segment-Extraktion und Struktur-Vergleich ------------------------------

const BLOCK = { type: "einschaetzung", id: "selbsteinschaetzung", automatisch: true };
const master = {
  title: "T",
  blocks: [
    { ...BLOCK, ausgeschlossen: ["wp.a.zwei"], kiInterview: false },
    { type: "text", title: "Einstieg", body: "Ein Text." },
  ],
};
const { segmente } = extrahiere(master);
check(
  "der Block ohne Titel und Einleitung erzeugt KEIN Segment (Fassungen ohne neue Übersetzung)",
  segmente.every((s) => !s.schluessel.startsWith("blocks[0]")),
  segmente.map((s) => s.schluessel).join(", "),
);
const fassung = JSON.parse(JSON.stringify(master)) as typeof master;
(fassung.blocks[1] as { title: string; body: string }).title = "Start";
(fassung.blocks[1] as { title: string; body: string }).body = "A text.";
check(
  "Fassung mit demselben Block besteht den Struktur-Vergleich",
  vergleicheStruktur(master, fassung).length === 0,
  vergleicheStruktur(master, fassung).join(" | "),
);
const ohneBlock = { ...fassung, blocks: [fassung.blocks[1]] };
check(
  "Fassung OHNE den Block wird gemeldet (Fassungen im selben PR neu erzeugen)",
  vergleicheStruktur(master, ohneBlock).length > 0,
);
const andererAusschluss = JSON.parse(JSON.stringify(fassung)) as typeof master;
(andererAusschluss.blocks[0] as { ausgeschlossen: string[] }).ausgeschlossen = ["wp.a.drei"];
check(
  "abweichendes ausgeschlossen in der Fassung wird gemeldet",
  vergleicheStruktur(master, andererAusschluss).length > 0,
);
const andererSchalter = JSON.parse(JSON.stringify(fassung)) as typeof master;
(andererSchalter.blocks[0] as { kiInterview: boolean }).kiInterview = true;
check(
  "abweichendes kiInterview in der Fassung wird gemeldet",
  vergleicheStruktur(master, andererSchalter).length > 0,
);

// --- Hilfen ----------------------------------------------------------------

type Bloecke = Parameters<typeof einschaetzungsHinweise>[0];
const quiz = (id: string, kennungen: string[]) => ({
  type: "quiz",
  id,
  teilkompetenzen: kennungen,
  questions: [
    {
      id: `${id}-1`,
      type: "single_choice",
      prompt: "Welche Antwort stimmt?",
      options: [{ text: "Diese", correct: true }, { text: "Jene" }],
    },
  ],
});

// --- Echte Moduldateien: der empfohlene Block parst und rechnet ----------------
// Bewusst KEINE Pflicht-Prüfung «jedes Modul hat den Block»: Fehlt er,
// ist das ein Hinweis der Validierung, kein Fehler – ein Test, der daran
// scheitert, machte den Hinweis durch die Hintertür zur Pflicht.

const MODULES_DIR = path.join(import.meta.dirname, "..", "modules");
let geprueft = 0;
const abweichend: string[] = [];
const hinweisFalsch: string[] = [];
for (const slug of fs.readdirSync(MODULES_DIR).sort()) {
  const datei = path.join(MODULES_DIR, slug, "module.json");
  if (!fs.existsSync(datei)) continue;
  const roh = JSON.parse(fs.readFileSync(datei, "utf8")) as { blocks: unknown[] };
  const original = parseModulDatei(roh);
  if (!original.success) continue; // meldet der Validator
  const kennungen = aufgabenTeilkompetenzen(original.data.blocks);
  const hatBlock = original.data.blocks.some(
    (b) => isKnownBlock(b) && b.type === "einschaetzung",
  );
  // Der Hinweis «kein Einschätzungsblock» erscheint genau dann, wenn
  // Aufgaben Kennungen tragen und kein Block da ist.
  const fehltHinweis = einschaetzungsHinweise(original.data.blocks).some((h) =>
    h.includes("keinen Einschätzungsblock"),
  );
  if (fehltHinweis !== (kennungen.length > 0 && !hatBlock)) hinweisFalsch.push(slug);
  if (kennungen.length === 0) continue;
  // Mit dem empfohlenen Block (in einer Kopie ergänzt, falls er fehlt)
  // ergibt die wirksame Liste genau die Vereinigung der Aufgaben.
  const mitBlock = hatBlock
    ? roh
    : { ...roh, blocks: [{ ...BLOCK, id: "test-selbsteinschaetzung" }, ...roh.blocks] };
  const ergebnis = parseModulDatei(mitBlock);
  if (!ergebnis.success) {
    abweichend.push(`${slug} (parst nicht)`);
    continue;
  }
  for (const block of ergebnis.data.blocks) {
    if (!isKnownBlock(block) || block.type !== "einschaetzung") continue;
    if (block.automatisch !== true) continue;
    geprueft++;
    const liste = wirksameEinschaetzungsKennungen(block, ergebnis.data.blocks);
    const erwartet = kennungen.filter((k) => !(block.ausgeschlossen ?? []).includes(k));
    if (liste.join() !== erwartet.join()) abweichend.push(slug);
  }
}
check(
  `echte Module: der automatische Block parst und ergibt die Vereinigung der Aufgaben-Kennungen (${geprueft} geprüft)`,
  geprueft > 0 && abweichend.length === 0,
  abweichend.join(", "),
);
check(
  "echte Module: Hinweis «kein Einschätzungsblock» genau bei Aufgaben mit Kennungen ohne Block",
  hinweisFalsch.length === 0,
  hinweisFalsch.join(", "),
);

// --- Hinweise der Validierung (nie Fehler) ----------------------------------

check(
  "Hinweis nennt die Zahl der Teilkompetenzen und die Empfehlung",
  (() => {
    const h = einschaetzungsHinweise([quiz("q1", ["wp.a.eins", "wp.a.zwei"])] as unknown as Bloecke);
    return h.length === 1 && h[0].includes("2 Teilkompetenzen") && h[0].includes('"automatisch": true');
  })(),
);
check(
  "Hinweis: automatische Liste leer (keine Aufgabe trägt Teilkompetenzen)",
  (() => {
    const h = einschaetzungsHinweise([BLOCK, quiz("q1", [])] as unknown as Bloecke);
    return h.length === 1 && h[0].startsWith("blocks.0:") && h[0].includes("zeigt den Block nicht an");
  })(),
);
check(
  "Hinweis: wirkungsloser Ausschluss (Kennung an keiner Aufgabe)",
  (() => {
    const h = einschaetzungsHinweise(
      [{ ...BLOCK, ausgeschlossen: ["wp.a.fremd"] }, quiz("q1", ["wp.a.eins"])] as unknown as Bloecke,
    );
    return h.length === 1 && h[0].includes('"wp.a.fremd"') && h[0].includes("wirkungslos");
  })(),
);
check(
  "kein Hinweis, wenn der Block da ist und eine Liste hat",
  einschaetzungsHinweise([BLOCK, quiz("q1", ["wp.a.eins"])] as unknown as Bloecke).length === 0,
);
// Die Validierung führt diese Meldungen als HINWEISE: Der Lauf über
// den Bestand bleibt gültig (Exit 0), auch wenn ein Modul keinen Block
// hat – das prüft `npm run validate` im selben CI-Job. Hier: Die
// Verdrahtung in schema/validate.ts ruft die Funktion in die
// hints-Liste, nicht in errors.
const validateQuelle = fs.readFileSync(
  path.join(import.meta.dirname, "..", "schema", "validate.ts"),
  "utf8",
);
check(
  "schema/validate.ts reicht einschaetzungsHinweise an hints (nicht an errors)",
  validateQuelle.includes("hints.push(...einschaetzungsHinweise(mod.blocks))") &&
    !validateQuelle.includes("errors.push(...einschaetzungsHinweise"),
);

console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
if (fail > 0) process.exit(1);

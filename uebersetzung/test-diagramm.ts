/**
 * Unit-Nachweis der Diagramm-/Untertitel-Anbindung des
 * Übersetzungs-Systems (21.9.2026): Feld-Klassifikation (felder.ts),
 * Segment-Extraktion der Diagramm-Beschriftungen (uebersetze.ts,
 * virtuelle Pfade) und der maskierte Struktur-Vergleich (struktur.ts).
 * Die Diagramm-KERNE selbst (extrahiere/maskiere/ersetzeDiagrammLabels,
 * diagrammDefinitionFehler) sind in der Plattform-Suite
 * tests/unit-diagramm.ts (67 Fälle) bewiesen – hier geht es um die
 * Verdrahtung in diesem Repo.
 *
 * Aufruf: npm run test:uebersetzung   (läuft auch im CI-validate-Job)
 */
import { klassifizierePfad } from "./felder";
import { vergleicheStruktur } from "./struktur";
import { extrahiere } from "./uebersetze";
import { ersetzeDiagrammLabels } from "../schema/schema";

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
  "blocks[].definition → diagramm",
  klassifizierePfad("blocks[].definition") === "diagramm",
);
check(
  "blocks[].beschreibung → uebersetzt",
  klassifizierePfad("blocks[].beschreibung") === "uebersetzt",
);
check(
  "blocks[].transkriptSegmente[].text → uebersetzt",
  klassifizierePfad("blocks[].transkriptSegmente[].text") === "uebersetzt",
);
check(
  "Netz wirft weiter für unbekannte Pfade",
  (() => {
    try {
      klassifizierePfad("blocks[].nichtVorhanden");
      return false;
    } catch {
      return true;
    }
  })(),
);

// --- Segment-Extraktion (virtuelle Diagramm-Pfade) --------------------------

const DEF = 'flowchart TD\n  A["Bedürfnis"] --> B["Kauf"]';
const master = {
  title: "T",
  blocks: [
    {
      type: "diagramm",
      id: "d1",
      definition: DEF,
      beschreibung: "Zwei Schritte.",
    },
    {
      type: "video",
      provider: "url",
      url: "/content/x/y.mp4",
      transkriptSegmente: [
        { start: 0, text: "Hallo." },
        { start: 2, text: "Willkommen." },
      ],
    },
  ],
};
const { segmente } = extrahiere(master);
const schluessel = segmente.map((s) => s.schluessel);
check(
  "Diagramm-Labels als Einzelsegmente mit Index-Pfad",
  schluessel.includes("blocks[0].definition[0]") &&
    schluessel.includes("blocks[0].definition[1]"),
  schluessel.join(", "),
);
check(
  "Label-Texte ohne Anführungszeichen extrahiert",
  segmente.find((s) => s.schluessel === "blocks[0].definition[0]")?.text ===
    "Bedürfnis" &&
    segmente.find((s) => s.schluessel === "blocks[0].definition[1]")?.text ===
      "Kauf",
);
check(
  "Diagramm-Kontext warnt vor Anführungszeichen (Prompt-Anweisung)",
  segmente
    .find((s) => s.schluessel === "blocks[0].definition[0]")
    ?.kontext.includes("KEINE Anführungszeichen") === true,
);
check(
  "beschreibung und Untertitel-Texte sind normale Segmente",
  schluessel.includes("blocks[0].beschreibung") &&
    schluessel.includes("blocks[1].transkriptSegmente[0].text") &&
    schluessel.includes("blocks[1].transkriptSegmente[1].text"),
  schluessel.join(", "),
);
check(
  "Die rohe definition ist NIE selbst ein Segment",
  !schluessel.includes("blocks[0].definition"),
);

// --- Struktur-Vergleich -----------------------------------------------------

const fassungOk = JSON.parse(JSON.stringify(master)) as typeof master;
fassungOk.blocks[0].definition = ersetzeDiagrammLabels(DEF, ["Need", "Purchase"]);
fassungOk.blocks[0].beschreibung = "Two steps.";
fassungOk.blocks[1].transkriptSegmente![0].text = "Hello.";
fassungOk.blocks[1].transkriptSegmente![1].text = "Welcome.";
check(
  "übersetzte Labels/Untertitel bestehen den Struktur-Vergleich",
  vergleicheStruktur(master, fassungOk).length === 0,
  vergleicheStruktur(master, fassungOk).join(" | "),
);

// Zusätzlicher Knoten: Die Label-ANZAHL schlägt zuerst an (Review-Fix
// 21.9.2026 – bei timeline wäre Streichen/Erfinden maskengleich).
const fassungMehr = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
fassungMehr.blocks[0].definition = 'flowchart TD\n  A["Need"] --> B["Purchase"]\n  B --> C["Extra"]';
const mehrFehler = vergleicheStruktur(master, fassungMehr);
check(
  "zusätzliche Beschriftung wird als Anzahl-Fehler gemeldet",
  mehrFehler.some((f) => f.includes("statt 2 Diagramm-Beschriftungen")),
  mehrFehler.join(" | "),
);
// Gleiche Label-Anzahl, andere Syntax (Pfeilform): maskierter Vergleich.
const fassungSyntax = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
fassungSyntax.blocks[0].definition = 'flowchart TD\n  A["Need"] --- B["Purchase"]';
const syntaxFehler = vergleicheStruktur(master, fassungSyntax);
check(
  "veränderte Mermaid-Syntax wird als Struktur-Fehler gemeldet",
  syntaxFehler.some((f) => f.includes("Mermaid-Syntax")),
  syntaxFehler.join(" | "),
);
// timeline: gestrichener Ereignistext bleibt maskengleich, fällt aber
// über die Label-Anzahl auf (Review-Fund, reproduzierter Angriff).
const masterZeit = {
  title: "T",
  blocks: [
    {
      type: "diagramm",
      id: "z1",
      definition: "timeline\n  title Geldgeschichte\n  1900 : Goldstandard\n  2020 : Digitales Geld",
      beschreibung: "Zeitleiste.",
    },
  ],
};
const zeitFassung = JSON.parse(JSON.stringify(masterZeit)) as typeof masterZeit;
zeitFassung.blocks[0].definition = "timeline\n  title Geldgeschichte\n  1900 : \n  2020 : Digitales Geld";
const zeitFehler = vergleicheStruktur(masterZeit, zeitFassung);
check(
  "timeline: gestrichener Ereignistext wird über die Label-Anzahl erkannt",
  zeitFehler.some((f) => f.includes("Diagramm-Beschriftungen")),
  zeitFehler.join(" | "),
);

const fassungStart = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
fassungStart.blocks[1].transkriptSegmente![1].start = 3;
const startFehler = vergleicheStruktur(master, fassungStart);
check(
  "veränderte Segment-Startzeit (Zahl) wird als Abweichung gemeldet",
  startFehler.some((f) => f.includes("transkriptSegmente[1].start")),
  startFehler.join(" | "),
);

console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
if (fail > 0) process.exit(1);

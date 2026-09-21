/**
 * Unit-Nachweis der Schaubild-Anbindung des Übersetzungs-Systems
 * (21.9.2026): Feld-Klassifikation (felder.ts – nur Element-Texte
 * übersetzt, Szene-Struktur invariant), Segment-Extraktion und der
 * Struktur-Vergleich. Die Schaubild-KERNE (Verschlankung, Wrap-Golden,
 * Überlauf-Hinweise) sind in der Plattform-Suite tests/unit-schaubild.ts
 * (37 Fälle) bewiesen – hier geht es um die Verdrahtung in diesem Repo.
 *
 * Aufruf: npm run test:uebersetzung   (läuft auch im CI-validate-Job)
 */
import { klassifizierePfad } from "./felder";
import { vergleicheStruktur } from "./struktur";
import { extrahiere } from "./uebersetze";
import {
  schaubildSzeneSchema,
  schaubildUeberlaufHinweise,
  verschlankeSchaubildSzene,
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
  "blocks[].szene.elemente[].text → uebersetzt",
  klassifizierePfad("blocks[].szene.elemente[].text") === "uebersetzt",
);
for (const feld of [
  "type",
  "id",
  "strokeColor",
  "backgroundColor",
  "fillStyle",
  "strokeStyle",
  "textAlign",
  "verticalAlign",
  "containerId",
  "startArrowhead",
  "endArrowhead",
]) {
  check(
    `blocks[].szene.elemente[].${feld} → invariant`,
    klassifizierePfad(`blocks[].szene.elemente[].${feld}`) === "invariant",
  );
}
check(
  "blocks[].szene.hintergrund → invariant",
  klassifizierePfad("blocks[].szene.hintergrund") === "invariant",
);

// --- Kanonische Test-Szene --------------------------------------------------

const stil = {
  angle: 0,
  strokeColor: "#1e1e1e",
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: "solid",
  roughness: 1,
  opacity: 100,
  seed: 7,
};
const rohSzene = verschlankeSchaubildSzene({
  elemente: [
    { id: "k1", type: "rectangle", x: 0, y: 0, width: 200, height: 80, ...stil, roundness: { type: 3 } },
    { id: "t1", type: "text", x: 10, y: 10, width: 100, height: 25, ...stil, roundness: null, text: "Angebot", fontSize: 20, fontFamily: 5, textAlign: "center", verticalAlign: "middle", containerId: "k1", autoResize: true, lineHeight: 1.25 },
  ],
});
if ("fehler" in rohSzene) throw new Error(rohSzene.fehler);
const szene = schaubildSzeneSchema.parse(rohSzene.szene);

const master = {
  title: "T",
  blocks: [
    { type: "schaubild", id: "s1", szene: JSON.parse(JSON.stringify(szene)), beschreibung: "Ein Kasten." },
  ],
};

// --- Segment-Extraktion -----------------------------------------------------

const { segmente } = extrahiere(master);
const schluessel = segmente.map((s) => s.schluessel);
check(
  "Element-Text + beschreibung sind Segmente",
  schluessel.includes("blocks[0].szene.elemente[1].text") &&
    schluessel.includes("blocks[0].beschreibung"),
  schluessel.join(", "),
);
check(
  "kein anderes Szene-Feld wird Segment",
  schluessel.filter((k) => k.includes("szene")).length === 1,
  schluessel.join(", "),
);
check(
  "Schaubild-Kontext bittet um ähnliche Länge (Prompt-Anweisung)",
  segmente
    .find((s) => s.schluessel === "blocks[0].szene.elemente[1].text")
    ?.kontext.includes("ähnliche Länge") === true,
);

// --- Struktur-Vergleich -----------------------------------------------------

const fassungOk = JSON.parse(JSON.stringify(master)) as typeof master;
(fassungOk.blocks[0].szene.elemente[1] as { text: string }).text = "Supply";
fassungOk.blocks[0].beschreibung = "One box.";
check(
  "übersetzter Element-Text besteht den Struktur-Vergleich",
  vergleicheStruktur(master, fassungOk).length === 0,
  vergleicheStruktur(master, fassungOk).join(" | "),
);
const fassungGeometrie = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
(fassungGeometrie.blocks[0].szene.elemente[0] as { width: number }).width = 400;
check(
  "veränderte Geometrie (width) wird als Abweichung gemeldet",
  vergleicheStruktur(master, fassungGeometrie).some((f) =>
    f.includes("elemente[0].width"),
  ),
  vergleicheStruktur(master, fassungGeometrie).join(" | "),
);
const fassungFarbe = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
(fassungFarbe.blocks[0].szene.elemente[0] as { strokeColor: string }).strokeColor =
  "#ff0000";
check(
  "veränderte Farbe (invarianter String) wird gemeldet",
  vergleicheStruktur(master, fassungFarbe).some((f) =>
    f.includes("strokeColor"),
  ),
);
const fassungWeniger = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
(fassungWeniger.blocks[0].szene.elemente as unknown[]).pop();
check(
  "entferntes Element wird gemeldet (Array-Länge)",
  vergleicheStruktur(master, fassungWeniger).some((f) => f.includes("elemente")),
);

// --- Überlauf-Verdrahtung ---------------------------------------------------

const fassungLang = JSON.parse(JSON.stringify(fassungOk)) as typeof master;
(fassungLang.blocks[0].szene.elemente[1] as { text: string }).text =
  "Das Angebot aller Verkäuferinnen und Verkäufer auf diesem Markt zusammen";
const hinweise = schaubildUeberlaufHinweise(
  schaubildSzeneSchema.parse(master.blocks[0].szene),
  schaubildSzeneSchema.parse(fassungLang.blocks[0].szene),
);
check(
  "lange Übersetzung erzeugt Wachstums-Hinweis",
  hinweise.some((h) => h.includes("wachsen")),
  hinweise.join(" | "),
);
check(
  "übersetzter Text ohne Überlauf erzeugt keine Hinweise",
  schaubildUeberlaufHinweise(
    schaubildSzeneSchema.parse(master.blocks[0].szene),
    schaubildSzeneSchema.parse(fassungOk.blocks[0].szene),
  ).length === 0,
);

console.log(`\n${ok} ok, ${fail} fehlgeschlagen`);
if (fail > 0) process.exit(1);

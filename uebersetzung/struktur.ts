/**
 * Strukturgleichheit Master ↔ Sprachfassung: gleiche Form, gleiche ids,
 * gleiche Punkte – nur die klassifizierten Textfelder dürfen abweichen.
 * Verglichen wird das ROH-JSON beider Dateien (byteidentische
 * Invarianten; Zod-Defaults verfälschen den Vergleich nicht), die
 * Punktzahl je Block zusätzlich über punkteVonBlock aus der SYNC-Region
 * (dieselbe Rechenstelle wie das Katalog-DTO der Plattform).
 */
import {
  klassifizierePfad,
  normalisierePfad,
  pfadSchluessel,
  PAKET_FREIE_UNTERBAEUME,
} from "./felder";
import {
  maskiereDiagrammLabels,
  punkteVonBlock,
  type LearningModule,
} from "../schema/schema";

function istFreierUnterbaum(normalisiert: string): boolean {
  return PAKET_FREIE_UNTERBAEUME.some((muster) => muster.test(normalisiert));
}

/**
 * Rekursiver Vergleich: gleiche Container-Form überall (Objekt-Schlüssel,
 * Array-Längen), Blatt-Gleichheit ausser bei uebersetzt/abgeleitet/paket.
 * Innerhalb der PAKET-freien Unterbäume (Antwortlisten, Ablenker) darf
 * auch die FORM abweichen – die Zielsprache braucht andere und mehr
 * Antwortvarianten; Lücken-ANZAHL (= Punkte) bleibt aussen erzwungen.
 */
export function vergleicheStruktur(
  master: unknown,
  fassung: unknown,
): string[] {
  const fehler: string[] = [];

  function vergleiche(
    m: unknown,
    f: unknown,
    teile: (string | number)[],
  ): void {
    if (fehler.length >= 20) return; // genug für eine klare Meldung
    const norm = normalisierePfad(teile);
    const stelle = pfadSchluessel(teile) || "(Wurzel)";

    if (istFreierUnterbaum(norm)) {
      // Paket-Unterbaum: Existenz + grobe Form, Inhalt frei. Bei den
      // ABLENKERN bleibt zusätzlich die ANZAHL Master-gleich (dieselbe
      // Regel, die das Werkzeug erzwingt – nur die Antwort-LISTEN je
      // Lücke dürfen zielsprachlich breiter werden).
      if (Array.isArray(m) !== Array.isArray(f)) {
        fehler.push(`${stelle}: Form weicht vom Master ab.`);
      } else if (
        norm.endsWith("ablenker") &&
        Array.isArray(m) &&
        Array.isArray(f) &&
        m.length !== f.length
      ) {
        fehler.push(
          `${stelle}: ${f.length} statt ${m.length} Ablenker – die Anzahl muss dem Master entsprechen.`,
        );
      }
      return;
    }

    if (Array.isArray(m) || Array.isArray(f)) {
      if (!Array.isArray(m) || !Array.isArray(f)) {
        fehler.push(`${stelle}: Master und Fassung haben verschiedene Formen.`);
        return;
      }
      if (m.length !== f.length) {
        fehler.push(
          `${stelle}: ${f.length} statt ${m.length} Einträge – Anzahl und Reihenfolge müssen dem Master entsprechen.`,
        );
        return;
      }
      m.forEach((wert, i) => vergleiche(wert, f[i], [...teile, i]));
      return;
    }

    if (m !== null && typeof m === "object") {
      if (f === null || typeof f !== "object" || Array.isArray(f)) {
        fehler.push(`${stelle}: Master und Fassung haben verschiedene Formen.`);
        return;
      }
      const mSchluessel = Object.keys(m as object);
      const fSchluessel = Object.keys(f as object);
      const fehlend = mSchluessel.filter((k) => !fSchluessel.includes(k));
      const zusaetzlich = fSchluessel.filter((k) => !mSchluessel.includes(k));
      for (const k of fehlend) {
        fehler.push(`${stelle}: Feld "${k}" fehlt gegenüber dem Master.`);
      }
      for (const k of zusaetzlich) {
        fehler.push(`${stelle}: Feld "${k}" existiert im Master nicht.`);
      }
      for (const k of mSchluessel) {
        if (fSchluessel.includes(k)) {
          vergleiche(
            (m as Record<string, unknown>)[k],
            (f as Record<string, unknown>)[k],
            [...teile, k],
          );
        }
      }
      return;
    }

    // Blätter (string/number/boolean/null).
    if (typeof m === "string" || typeof f === "string") {
      if (typeof m !== "string" || typeof f !== "string") {
        fehler.push(`${stelle}: Master und Fassung haben verschiedene Typen.`);
        return;
      }
      const klasse = klassifizierePfad(norm); // wirft bei unbekannten Pfaden (Netz)
      if (klasse === "invariant" && m !== f) {
        fehler.push(
          `${stelle}: invariantes Feld weicht vom Master ab ("${kurz(f)}" statt "${kurz(m)}") – dieses Feld wird nicht übersetzt.`,
        );
      }
      // Diagramm-Definition: NUR die Beschriftungen dürfen abweichen –
      // maskiert (Labels entfernt) müssen Master und Fassung
      // byteidentisch sein (gleiche Knoten, Pfeile, Reihenfolge).
      if (
        klasse === "diagramm" &&
        maskiereDiagrammLabels(m) !== maskiereDiagrammLabels(f)
      ) {
        fehler.push(
          `${stelle}: Die Mermaid-Syntax weicht vom Master ab – übersetzt werden nur die Beschriftungen, Knoten/Pfeile/Struktur müssen identisch bleiben.`,
        );
      }
      return;
    }
    if (m !== f) {
      fehler.push(
        `${stelle}: Wert weicht vom Master ab (${JSON.stringify(f)} statt ${JSON.stringify(m)}).`,
      );
    }
  }

  vergleiche(master, fassung, []);
  return fehler;
}

function kurz(s: string): string {
  return s.length > 40 ? s.slice(0, 40) + "…" : s;
}

/** Punktzahl-Parität je Block – Belt zusätzlich zur Strukturform. */
export function vergleichePunkte(
  master: LearningModule,
  fassung: LearningModule,
): string[] {
  const fehler: string[] = [];
  master.blocks.forEach((block, i) => {
    const gegenstueck = fassung.blocks[i];
    if (!gegenstueck) return; // Form-Fehler meldet vergleicheStruktur
    const soll = punkteVonBlock(block);
    const ist = punkteVonBlock(gegenstueck);
    if (soll !== ist) {
      fehler.push(
        `blocks[${i}]: ${ist ?? "keine"} statt ${soll ?? "keine"} Punkte – alle Fassungen eines Moduls müssen dieselbe Punktzahl ergeben (der Lernstand zählt pro Block).`,
      );
    }
  });
  return fehler;
}

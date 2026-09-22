/**
 * Übersetzungswerkzeug: erzeugt und führt Sprachfassungen
 * (module.<lang>.json) aus dem Master nach.
 *
 *   npm run uebersetze -- --modul <slug> --sprache en
 *   npm run uebersetze -- --sprache en --nur-veraltet
 *   npm run uebersetze -- --sprache en --alle-fehlenden
 *
 * Arbeitsweise (Konzept Abschnitt 4): Die KI sieht NIE die
 * JSON-Struktur – nur nummerierte Textstücke (Segmente) plus die
 * Lückentext-Pakete. Struktur, ids und Punkte sind konstruktiv
 * unverfälschbar; der Paket-Teil wird hart nachgeprüft. Ein
 * SEGMENT-GEDÄCHTNIS (uebersetzung/speicher/) übersetzt bei
 * Nachführungen nur geänderte Stücke neu – minimale Diffs, stabile
 * Reviews. Eine Änderung der Korrekturhinweise löst bewusst eine
 * Voll-Neuerzeugung aus.
 *
 * Übersetzungs-Quellen:
 *   - API-Weg (Standard): ANTHROPIC_API_KEY in der Umgebung der
 *     ausführenden Person; Modell aus uebersetzung/konfig.json.
 *   - Datei-Weg (offline/Tests): --auftrag-datei schreibt den kompletten
 *     Auftrag (Prompt + offene Segmente) als JSON; --antworten-datei
 *     liest die fertigen Übersetzungen im selben Format ein. Damit ist
 *     jeder Auftrag transparent und der Weg auch ohne Schlüssel gangbar.
 *
 * Das Werkzeug schreibt NIE eine ungültige Datei: Slot-Bilanz (jedes
 * Segment übersetzt), Schema-Parse, Strukturgleichheit, Punktzahl-
 * Parität und Roh-HTML-Prüfung laufen vor dem Schreiben; scheitert
 * etwas, bricht es mit der Stelle ab.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  FASSUNG_MUSTER,
  MODULES_DIR,
  UEBERSETZUNG_DIR,
  dateiHash,
  hinweiseHash,
  hinweisePfad,
  kanonisch,
  ladeKonfig,
  ladeSpeicher,
  ladeSprachen,
  selfHashVon,
  sha256,
  speicherPfad,
  type Speicher,
} from "./kern";
import {
  besucheStrings,
  klassifizierePfad,
  normalisierePfad,
  pfadSchluessel,
  uebersetzungsSperren,
} from "./felder";
import { vergleicheStruktur, vergleichePunkte } from "./struktur";
import { findHtmlTags, findMarkdownImages } from "./text-pruefung";
import {
  ersetzeModulVerweise,
  DIAGRAMM_LABEL_MAX_ZEICHEN,
  SCHAUBILD_TEXT_MAX_ZEICHEN,
  schaubildSzeneSchema,
  schaubildUeberlaufHinweise,
  diagrammDefinitionFehler,
  diagrammTyp,
  ersetzeDiagrammLabels,
  extrahiereDiagrammLabels,
  parseModulDatei,
  type LearningModule,
} from "../schema/schema";
import { describeIssues } from "./fehler";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Argumente

interface Optionen {
  modul?: string;
  sprache: string;
  nurVeraltet: boolean;
  alleFehlenden: boolean;
  antwortenDatei?: string;
  auftragDatei?: string;
  modell?: string;
}

function leseArgumente(): Optionen {
  const args = process.argv.slice(2);
  const opt: Optionen = { sprache: "", nurVeraltet: false, alleFehlenden: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--modul") opt.modul = args[++i];
    else if (a === "--sprache") opt.sprache = args[++i];
    else if (a === "--nur-veraltet") opt.nurVeraltet = true;
    else if (a === "--alle-fehlenden") opt.alleFehlenden = true;
    else if (a === "--antworten-datei") opt.antwortenDatei = args[++i];
    else if (a === "--auftrag-datei") opt.auftragDatei = args[++i];
    else if (a === "--modell") opt.modell = args[++i];
    else abbruch(`Unbekanntes Argument "${a}".`);
  }
  if (!opt.sprache) abbruch("--sprache <lang> ist Pflicht (z. B. --sprache en).");
  if (!opt.modul && !opt.nurVeraltet && !opt.alleFehlenden) {
    abbruch("Entweder --modul <slug> oder --nur-veraltet / --alle-fehlenden angeben.");
  }
  if ((opt.nurVeraltet || opt.alleFehlenden) && (opt.auftragDatei || opt.antwortenDatei)) {
    abbruch(
      "--auftrag-datei/--antworten-datei gelten für EIN Modul (--modul) – im Batch überschriebe " +
        "jedes Modul dieselbe Datei. Bitte Module einzeln über den Datei-Weg abarbeiten.",
    );
  }
  return opt;
}

function abbruch(text: string): never {
  console.error(`✗ ${text}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Extraktion

interface Segment {
  /** Adressierbarer Pfad mit Indizes, z. B. "blocks[3].alt". */
  schluessel: string;
  pfad: (string | number)[];
  text: string;
  /** Feld-Kontext + bekanntes Zeichenlimit für den Prompt. */
  kontext: string;
  limit?: number;
}

interface PaketQuelle {
  /** Block-Adresse, z. B. "blocks[7]" oder "blocks[7].varianten[0]". */
  schluessel: string;
  pfad: (string | number)[];
  text: string;
  luecken: string[][];
  ablenker?: string[];
}

interface PaketInhalt {
  text: string;
  luecken: string[][];
  ablenker?: string[];
}

const LIMITS: ReadonlyArray<[RegExp, number]> = [
  // An das Schema-Maximum gekoppelt (Review-Fund: ein hartes 500er-
  // Limit machte schema-gültige Master mit 501-1000 Zeichen
  // unübersetzbar); die eigentliche Platz-Wache sind die nicht
  // blockierenden schaubildUeberlaufHinweise.
  [/szene\.elemente\[\]\.text$/, SCHAUBILD_TEXT_MAX_ZEICHEN],
  [/\.beschriftung$/, 60],
  [/\.kategorien\[\]$/, 40],
  [/elemente\[\]\.text$/, 80],
  [/paare\[\]\.(links|rechts)\.text$/, 200],
  [/figur\.name$/, 80],
  [/figur\.rolle$/, 200],
  [/figur\.rollenPrompt$/, 2000],
  [/vorleseText$/, 4000],
  [/subjectName$/, 120],
  [/gradesText$/, 60],
  [/^einheit$/, 120],
];

export function extrahiere(masterRaw: unknown): {
  segmente: Segment[];
  pakete: PaketQuelle[];
} {
  const segmente: Segment[] = [];
  besucheStrings(masterRaw, [], (pfad, text) => {
    const norm = normalisierePfad(pfad);
    const klasse = klassifizierePfad(norm); // Vollständigkeits-Netz
    if (klasse === "diagramm") {
      // Mermaid-Definition: NUR die Beschriftungen als Einzelsegmente
      // (extrahiereDiagrammLabels, SYNC-Region – dieselbe Stelle, die
      // auch Maskierung/Rückschreiben speist). Virtueller Pfad
      // [...pfad, i]: das Rückschreiben fängt ihn gruppiert ab
      // (ersetzeDiagrammLabels), setzeWert sieht ihn nie.
      const labels = extrahiereDiagrammLabels(text);
      if (typeof labels === "string") {
        throw new Error(`${pfadSchluessel(pfad)}: ${labels}`);
      }
      const typ = diagrammTyp(text);
      labels.forEach((label, i) => {
        segmente.push({
          schluessel: pfadSchluessel([...pfad, i]),
          pfad: [...pfad, i],
          text: label.text,
          kontext:
            `${norm} (Diagramm-Beschriftung: KEINE Anführungszeichen` +
            // title/section-Zeilen (ganzzeilig) dürfen ":" enthalten.
            (typ === "timeline" && !label.ganzzeilig ? ", KEIN Doppelpunkt" : "") +
            ")",
          limit: DIAGRAMM_LABEL_MAX_ZEICHEN,
        });
      });
      return;
    }
    if (klasse !== "uebersetzt") return;
    const limit = LIMITS.find(([m]) => m.test(norm))?.[1];
    segmente.push({
      schluessel: pfadSchluessel(pfad),
      pfad: [...pfad],
      text,
      // Schaubild-Beschriftungen haben feste Zeichenflächen: Der
      // Prompt bittet um ähnliche Länge; echte Überläufe meldet
      // schaubildUeberlaufHinweise nach dem Zusammensetzen.
      kontext:
        norm === "blocks[].szene.elemente[].text"
          ? `${norm} (Schaubild-Beschriftung: Platz ist begrenzt, ähnliche Länge anstreben)`
          : norm,
      limit,
    });
  });

  const pakete: PaketQuelle[] = [];
  const blocks = (masterRaw as { blocks: unknown[] }).blocks;
  blocks.forEach((block, i) => {
    if (!block || typeof block !== "object") return;
    const b = block as Record<string, unknown>;
    if (b.type !== "lueckentext") return;
    const sammle = (inhalt: Record<string, unknown>, pfad: (string | number)[]) => {
      if (inhalt.modus === "satzbau") return; // Merkmals-Sperre greift vorher
      pakete.push({
        schluessel: pfadSchluessel(pfad),
        pfad,
        text: inhalt.text as string,
        luecken: (inhalt.luecken as { antworten: string[] }[]).map(
          (l) => l.antworten,
        ),
        ablenker: inhalt.ablenker as string[] | undefined,
      });
    };
    sammle(b, ["blocks", i]);
    if (Array.isArray(b.varianten)) {
      (b.varianten as Record<string, unknown>[]).forEach((v, j) =>
        sammle(v, ["blocks", i, "varianten", j]),
      );
    }
  });
  return { segmente, pakete };
}

// ---------------------------------------------------------------------------
// Auftrag (Prompt) und Übersetzungs-Quellen

interface Antworten {
  segmente: Record<string, string>;
  pakete: Record<string, PaketInhalt>;
}

function sprachName(code: string): string {
  return ladeKonfig().sprachNamen[code] ?? code;
}

function bauePrompt(
  masterMod: LearningModule,
  quellSprache: string,
  zielSprache: string,
  offeneSegmente: Segment[],
  offenePakete: PaketQuelle[],
  hinweise: string,
): string {
  const vorlage = fs.readFileSync(
    path.join(UEBERSETZUNG_DIR, "PROMPT.md"),
    "utf8",
  );
  const glossarPfad = path.join(UEBERSETZUNG_DIR, `glossar.${zielSprache}.json`);
  const glossar = fs.existsSync(glossarPfad)
    ? fs.readFileSync(glossarPfad, "utf8")
    : "{}";
  const stufe =
    masterMod.curricula?.[0]?.grades?.join("–") ?? "Erwachsene";
  const segmentText = offeneSegmente
    .map(
      (s) =>
        `‹STÜCK ${s.schluessel}› (${s.kontext}${s.limit ? `, höchstens ${s.limit} Zeichen` : ""})\n${s.text}\n‹ENDE ${s.schluessel}›`,
    )
    .join("\n\n");
  const paketText = offenePakete
    .map(
      (p) =>
        `‹AUFGABE ${p.schluessel}›\n${JSON.stringify(
          { text: p.text, luecken: p.luecken, ablenker: p.ablenker },
          null,
          1,
        )}\n‹ENDE ${p.schluessel}›`,
    )
    .join("\n\n");
  // EIN Durchlauf mit Funktions-Replacement (Review-Fund 18.8.2026):
  // Ersetzungs-STRINGS würden $-Sequenzen interpretieren ($$…$$-KaTeX
  // käme verstümmelt an) und früh eingesetzte Inhalte (Hinweise!)
  // würden von späteren Durchläufen erneut gescannt – Funktions-
  // Rückgaben und der Einmal-Durchlauf schliessen beides konstruktiv aus.
  const werte: Record<string, string> = {
    QUELLSPRACHE: sprachName(quellSprache),
    ZIELSPRACHE: sprachName(zielSprache),
    MODUL_TITEL: masterMod.title,
    MODUL_BESCHREIBUNG: masterMod.description,
    STUFE: String(stufe),
    GLOSSAR: glossar,
    HINWEISE: hinweise || "(keine)",
    SEGMENTE: segmentText || "(keine)",
    PAKETE: paketText || "(keine)",
  };
  return vorlage.replace(
    /\{\{(QUELLSPRACHE|ZIELSPRACHE|MODUL_TITEL|MODUL_BESCHREIBUNG|STUFE|GLOSSAR|HINWEISE|SEGMENTE|PAKETE)\}\}/g,
    (_, name: string) => werte[name],
  );
}

async function uebersetzeViaApi(
  prompt: string,
  modell: string,
): Promise<Antworten> {
  const schluessel = process.env.ANTHROPIC_API_KEY;
  if (!schluessel) {
    abbruch(
      "ANTHROPIC_API_KEY ist nicht gesetzt. Entweder Schlüssel exportieren (API-Weg) oder den Datei-Weg nutzen: " +
        "erst --auftrag-datei <datei> (schreibt den Auftrag), dann --antworten-datei <datei> (liest die Übersetzungen).",
    );
  }
  const konfig = ladeKonfig();
  const antwort = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": schluessel,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: modell,
      max_tokens: konfig.maxAusgabeTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!antwort.ok) {
    abbruch(`API-Fehler ${antwort.status}: ${(await antwort.text()).slice(0, 300)}`);
  }
  const daten = (await antwort.json()) as {
    content: { type: string; text?: string }[];
    stop_reason?: string;
  };
  if (daten.stop_reason === "max_tokens") {
    abbruch(
      `Die KI-Antwort wurde bei ${konfig.maxAusgabeTokens} Tokens abgeschnitten (stop_reason max_tokens) – ` +
        "maxAusgabeTokens in uebersetzung/konfig.json erhöhen oder das Modul stückeln (v1 stückelt nicht automatisch, siehe UEBERSETZUNG.md).",
    );
  }
  const text = daten.content.find((c) => c.type === "text")?.text ?? "";
  const json = text.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(json) as Antworten;
  } catch {
    abbruch("Die KI-Antwort ist kein gültiges JSON – bitte erneut ausführen.");
  }
}

/** Form-Guard für KI-/Datei-Antworten (Review-Fund: Formfehler crashten roh). */
function pruefeAntwortForm(neu: Antworten): void {
  if (neu === null || typeof neu !== "object") abbruch("Antwort ist kein Objekt.");
  for (const [k, v] of Object.entries(neu.segmente ?? {})) {
    if (typeof v !== "string") abbruch(`Antwort-Segment "${k}" ist kein String.`);
  }
  for (const [k, v] of Object.entries(neu.pakete ?? {})) {
    const paket = v as Partial<PaketInhalt> | null;
    if (
      !paket ||
      typeof paket.text !== "string" ||
      !Array.isArray(paket.luecken) ||
      !paket.luecken.every(
        (l) => Array.isArray(l) && l.length > 0 && l.every((a) => typeof a === "string"),
      ) ||
      (paket.ablenker !== undefined &&
        (!Array.isArray(paket.ablenker) ||
          !paket.ablenker.every((a) => typeof a === "string")))
    ) {
      abbruch(
        `Antwort-Paket "${k}" hat nicht die Form {text, luecken: string[][], ablenker?: string[]}.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Zusammensetzen

function setzeWert(
  ziel: unknown,
  pfad: ReadonlyArray<string | number>,
  wert: unknown,
): void {
  let knoten = ziel as Record<string | number, unknown>;
  for (let i = 0; i < pfad.length - 1; i++) {
    knoten = knoten[pfad[i]] as Record<string | number, unknown>;
  }
  knoten[pfad[pfad.length - 1]] = wert;
}

function holeWert(ziel: unknown, pfad: ReadonlyArray<string | number>): unknown {
  let knoten: unknown = ziel;
  for (const teil of pfad) {
    knoten = (knoten as Record<string | number, unknown>)[teil];
  }
  return knoten;
}

function gitCommitKurz(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      stdio: ["ignore", "pipe", "pipe"],
    })
      .toString()
      .trim();
  } catch {
    return "unbekannt";
  }
}

/** Schaubild-Überlauf-Hinweise Master↔Fassung auf die Konsole. */
/** Modul-Titel fürs Auflösen von [[modul:…]] in der Überlauf-Messung. */
const titelCache = new Map<string, string | null>();
function modulTitel(slug: string, sprache?: string): string | null {
  const schluessel = `${slug}|${sprache ?? ""}`;
  const bekannt = titelCache.get(schluessel);
  if (bekannt !== undefined) return bekannt;
  let titel: string | null = null;
  try {
    if (sprache) {
      const fp = path.join(MODULES_DIR, slug, `module.${sprache}.json`);
      if (fs.existsSync(fp)) {
        titel =
          (JSON.parse(fs.readFileSync(fp, "utf8")) as { title?: string })
            .title ?? null;
      }
    }
    if (titel === null) {
      const mp = path.join(MODULES_DIR, slug, "module.json");
      if (fs.existsSync(mp)) {
        titel =
          (JSON.parse(fs.readFileSync(mp, "utf8")) as { title?: string })
            .title ?? null;
      }
    }
  } catch {
    titel = null;
  }
  titelCache.set(schluessel, titel);
  return titel;
}

function gebeSchaubildHinweise(
  masterRaw: Record<string, unknown>,
  fassung: Record<string, unknown>,
  zielSprache?: string,
): void {
  const masterBloecke = masterRaw.blocks as Record<string, unknown>[] | undefined;
  const fassungsBloecke = fassung.blocks as Record<string, unknown>[] | undefined;
  // Verweise wie der Player auflösen, BEVOR gemessen wird: Der Kasten
  // muss den aufgelösten TITEL fassen, nicht die kurze Syntax (Master
  // mit Master-Titeln, Fassung mit Titeln der Zielsprache, soweit
  // vorhanden – exakt die Anzeige-Logik).
  const loeseSzene = (
    szene: ReturnType<typeof schaubildSzeneSchema.parse>,
    sprache?: string,
  ) => ({
    ...szene,
    elemente: szene.elemente.map((el) =>
      el.type === "text"
        ? { ...el, text: ersetzeModulVerweise(el.text, (z) => modulTitel(z, sprache)) }
        : el,
    ),
  });
  masterBloecke?.forEach((block, i) => {
    if (block.type !== "schaubild") return;
    const mSzene = schaubildSzeneSchema.safeParse(block.szene);
    const fSzene = schaubildSzeneSchema.safeParse(fassungsBloecke?.[i]?.szene);
    if (!mSzene.success || !fSzene.success) return; // validate meldet
    for (const hinweis of schaubildUeberlaufHinweise(
      loeseSzene(mSzene.data),
      loeseSzene(fSzene.data, zielSprache),
    )) {
      console.warn(`⚠ blocks[${i}] (schaubild): ${hinweis}`);
    }
  });
}

async function uebersetzeModul(slug: string, opt: Optionen): Promise<void> {
  const konfig = ladeKonfig();
  const modell = opt.modell ?? konfig.modell;
  const zielSprache = opt.sprache;
  const masterPfad = path.join(MODULES_DIR, slug, "module.json");
  if (!fs.existsSync(masterPfad)) abbruch(`modules/${slug}/module.json existiert nicht.`);
  const masterBytes = fs.readFileSync(masterPfad, "utf8");
  const masterRaw = JSON.parse(masterBytes) as Record<string, unknown>;
  const masterParsed = parseModulDatei(masterRaw);
  if (!masterParsed.success) abbruch(`${slug}: der Master ist ungültig – erst npm run validate fixen.`);
  const masterMod = masterParsed.data;

  if (masterMod.languageLearning) {
    abbruch(
      `${slug} ist ein Sprachlernmodul (languageLearning) – die Sprache ist dort Lerngegenstand, es wird nicht übersetzt.`,
    );
  }
  const sperren = uebersetzungsSperren(masterRaw);
  if (sperren.length > 0) {
    abbruch(`${slug} ist von Übersetzungen (noch) ausgenommen: ${sperren.join("; ")}.`);
  }
  if (masterMod.language === zielSprache) {
    abbruch(`${slug}: Der Master IST bereits die ${zielSprache}-Fassung.`);
  }

  const { segmente, pakete } = extrahiere(masterRaw);
  const hinweisDatei = hinweisePfad(slug, zielSprache);
  const hinweise = fs.existsSync(hinweisDatei)
    ? fs.readFileSync(hinweisDatei, "utf8")
    : "";
  const aktuellerHintsHash = hinweiseHash(slug, zielSprache);

  // Segment-Gedächtnis: nur bei unverändertem hintsHash wiederverwenden.
  const speicher = ladeSpeicher(slug, zielSprache);
  const speicherNutzbar =
    speicher !== null && speicher.hintsHash === aktuellerHintsHash;
  // Inhalts-Index als Fallback (Review-Fund): Nach einer Block-
  // EINFÜGUNG verschieben sich alle Pfad-Indizes – identischer
  // Quelltext behält seine Übersetzung trotzdem, positionsunabhängig.
  const segmentNachQuelle = new Map<string, string>();
  const paketNachQuelle = new Map<string, PaketInhalt>();
  if (speicherNutzbar) {
    for (const eintrag of Object.values(speicher!.segmente)) {
      segmentNachQuelle.set(eintrag.quelle, eintrag.text);
    }
    for (const eintrag of Object.values(speicher!.pakete)) {
      paketNachQuelle.set(eintrag.quelle, eintrag.inhalt);
    }
  }
  const antworten: Antworten = { segmente: {}, pakete: {} };
  const offeneSegmente = segmente.filter((s) => {
    const quelle = sha256(s.text);
    const alt = speicherNutzbar ? speicher!.segmente[s.schluessel] : undefined;
    const text =
      alt && alt.quelle === quelle ? alt.text : segmentNachQuelle.get(quelle);
    if (text !== undefined) {
      antworten.segmente[s.schluessel] = text;
      return false;
    }
    return true;
  });
  const offenePakete = pakete.filter((p) => {
    const quelle = sha256(
      kanonisch({ text: p.text, luecken: p.luecken, ablenker: p.ablenker }),
    );
    const alt = speicherNutzbar ? speicher!.pakete[p.schluessel] : undefined;
    const inhalt =
      alt && alt.quelle === quelle ? alt.inhalt : paketNachQuelle.get(quelle);
    if (inhalt !== undefined) {
      antworten.pakete[p.schluessel] = inhalt;
      return false;
    }
    return true;
  });

  console.log(
    `${slug} → ${zielSprache}: ${segmente.length} Segmente (${offeneSegmente.length} neu), ${pakete.length} Lückentext-Pakete (${offenePakete.length} neu).`,
  );

  // Nichts-zu-tun-Kurzschluss (Review-Fund: Re-Läufe stempelten sonst
  // masterCommit/generatedAt/model neu und erzeugten Diff-Rauschen):
  // Ist nichts neu zu übersetzen und die bestehende Fassung passt zum
  // aktuellen Master- und Hinweis-Stand, bleibt die Datei unangetastet.
  const fassungsPfadFrueh = path.join(
    MODULES_DIR,
    slug,
    `module.${zielSprache}.json`,
  );
  if (
    offeneSegmente.length === 0 &&
    offenePakete.length === 0 &&
    fs.existsSync(fassungsPfadFrueh)
  ) {
    try {
      const bestehend = JSON.parse(
        fs.readFileSync(fassungsPfadFrueh, "utf8"),
      ) as { derivedFrom?: { masterHash?: string; hintsHash?: string | null } };
      if (
        bestehend.derivedFrom?.masterHash === sha256(masterBytes) &&
        (bestehend.derivedFrom?.hintsHash ?? null) === aktuellerHintsHash
      ) {
        // Schaubild-Überlauf-Hinweise auch im Kurzschluss zeigen –
        // sie sind der Arbeitsvorrat fürs Gegenlesen und verschwänden
        // sonst nach dem ersten Lauf (Review-Fund).
        gebeSchaubildHinweise(
          masterRaw,
          bestehend as unknown as Record<string, unknown>,
          zielSprache,
        );
        console.log("✓ Fassung ist aktuell – nichts zu tun.");
        return;
      }
    } catch {
      // defekte Datei: normal neu erzeugen
    }
  }

  if (offeneSegmente.length > 0 || offenePakete.length > 0) {
    const prompt = bauePrompt(
      masterMod,
      masterMod.language,
      zielSprache,
      offeneSegmente,
      offenePakete,
      hinweise,
    );
    if (opt.auftragDatei) {
      fs.writeFileSync(
        opt.auftragDatei,
        kanonisch({
          modul: slug,
          sprache: zielSprache,
          prompt,
          erwartet: {
            segmente: offeneSegmente.map((s) => s.schluessel),
            pakete: offenePakete.map((p) => p.schluessel),
          },
        }),
      );
      console.log(
        `Auftrag geschrieben: ${opt.auftragDatei} – Übersetzungen danach mit --antworten-datei einspielen.`,
      );
      if (!opt.antwortenDatei) return;
    }
    let neu: Antworten;
    if (opt.antwortenDatei) {
      neu = JSON.parse(fs.readFileSync(opt.antwortenDatei, "utf8")) as Antworten;
    } else {
      neu = await uebersetzeViaApi(prompt, modell);
    }
    pruefeAntwortForm(neu);
    for (const s of offeneSegmente) {
      const text = neu.segmente?.[s.schluessel];
      if (typeof text === "string" && text.trim() !== "") {
        antworten.segmente[s.schluessel] = text;
      }
    }
    for (const p of offenePakete) {
      const inhalt = neu.pakete?.[p.schluessel];
      if (inhalt) antworten.pakete[p.schluessel] = inhalt;
    }
  }

  // SLOT-BILANZ: Jede Stelle MUSS eine Übersetzung haben – niemals
  // bleibt still Quelltext stehen.
  const fehlendeSegmente = segmente.filter(
    (s) => !(s.schluessel in antworten.segmente),
  );
  const fehlendePakete = pakete.filter((p) => !(p.schluessel in antworten.pakete));
  if (fehlendeSegmente.length > 0 || fehlendePakete.length > 0) {
    abbruch(
      `Unvollständige Übersetzung – es fehlen: ${[
        ...fehlendeSegmente.map((s) => s.schluessel),
        ...fehlendePakete.map((p) => p.schluessel),
      ].join(", ")}.`,
    );
  }
  for (const s of segmente) {
    const text = antworten.segmente[s.schluessel];
    if (s.limit && text.length > s.limit) {
      abbruch(
        `${s.schluessel}: Übersetzung ist ${text.length} Zeichen lang, erlaubt sind ${s.limit} – bitte kürzen (Korrekturhinweis oder erneuter Lauf).`,
      );
    }
  }

  // Fassung zusammensetzen. Diagramm-Beschriftungen tragen virtuelle
  // Pfade [...definitionsPfad, labelIndex] und werden GRUPPIERT über
  // ersetzeDiagrammLabels zurückgeschrieben (wirft laut bei
  // Anführungszeichen/Zeilenumbruch bzw. timeline-Doppelpunkt in der
  // Übersetzung); alle übrigen Segmente setzt setzeWert direkt.
  const inhalt = JSON.parse(masterBytes) as Record<string, unknown>;
  const istDiagrammLabel = (s: Segment) =>
    s.pfad.length >= 2 &&
    typeof s.pfad[s.pfad.length - 1] === "number" &&
    s.pfad[s.pfad.length - 2] === "definition";
  for (const s of segmente) {
    if (istDiagrammLabel(s)) continue;
    setzeWert(inhalt, s.pfad, antworten.segmente[s.schluessel]);
  }
  const diagrammGruppen = new Map<string, Segment[]>();
  for (const s of segmente) {
    if (!istDiagrammLabel(s)) continue;
    const defSchluessel = pfadSchluessel(s.pfad.slice(0, -1));
    const gruppe = diagrammGruppen.get(defSchluessel) ?? [];
    gruppe.push(s);
    diagrammGruppen.set(defSchluessel, gruppe);
  }
  for (const [defSchluessel, gruppe] of diagrammGruppen) {
    const defPfad = gruppe[0].pfad.slice(0, -1);
    const original = holeWert(inhalt, defPfad);
    if (typeof original !== "string") {
      abbruch(`${defSchluessel}: Definition nicht gefunden.`);
    }
    // Extraktions-Reihenfolge = Dokumentfolge; die Gruppe entstand in
    // derselben Reihenfolge, der Index-Sort ist der Sicherheitsgurt.
    const texte = gruppe
      .slice()
      .sort((a, b) => (a.pfad.at(-1) as number) - (b.pfad.at(-1) as number))
      .map((s) => antworten.segmente[s.schluessel]);
    let neuDef: string;
    try {
      neuDef = ersetzeDiagrammLabels(original, texte);
    } catch (e) {
      abbruch(`${defSchluessel}: ${e instanceof Error ? e.message : String(e)}`);
    }
    const defFehler = diagrammDefinitionFehler(neuDef);
    if (defFehler) {
      abbruch(
        `${defSchluessel}: übersetzte Definition ungültig – ${defFehler} (Korrekturhinweis setzen und neu erzeugen).`,
      );
    }
    setzeWert(inhalt, defPfad, neuDef);
  }
  for (const p of pakete) {
    const neu = antworten.pakete[p.schluessel];
    if (neu.luecken.length !== p.luecken.length) {
      abbruch(
        `${p.schluessel}: ${neu.luecken.length} statt ${p.luecken.length} Lücken – die Lückenzahl ist die Punktzahl und muss dem Master entsprechen.`,
      );
    }
    if ((p.ablenker?.length ?? 0) !== (neu.ablenker?.length ?? 0)) {
      abbruch(
        `${p.schluessel}: ${neu.ablenker?.length ?? 0} statt ${p.ablenker?.length ?? 0} Ablenker – die Anzahl muss dem Master entsprechen.`,
      );
    }
    const marker = (t: string) => [...t.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1]).sort();
    if (marker(neu.text).join(",") !== marker(p.text).join(",")) {
      abbruch(`${p.schluessel}: Die {{n}}-Lücken-Marker stimmen nicht mit dem Master überein.`);
    }
    const block = holeWert(inhalt, p.pfad) as Record<string, unknown>;
    block.text = neu.text;
    (block.luecken as { antworten: string[] }[]).forEach((l, i) => {
      l.antworten = neu.luecken[i];
    });
    // Nur setzen, wenn der Master das Feld trägt – ein leeres Array aus
    // der Antwort darf keinen neuen Schlüssel erzeugen (Strukturgleichheit).
    if (p.ablenker !== undefined && neu.ablenker) block.ablenker = neu.ablenker;
  }

  // Abgeleitete Felder.
  inhalt.language = zielSprache;
  for (const block of inhalt.blocks as Record<string, unknown>[]) {
    if (block.type === "audio" && typeof block.vorleseText === "string") {
      block.vorleseSprache =
        konfig.vorleseSprachen[zielSprache] ?? zielSprache;
    }
    if (block.type === "achse") {
      const masterBlock = (masterRaw.blocks as Record<string, unknown>[])[
        (inhalt.blocks as unknown[]).indexOf(block)
      ];
      const masterKategorien = (masterBlock.x as Record<string, unknown>)
        ?.kategorien as string[] | undefined;
      const neueKategorien = (block.x as Record<string, unknown>)
        ?.kategorien as string[] | undefined;
      if (masterKategorien && neueKategorien) {
        // Zwei Master-Kategorien auf denselben Zielstring zu übersetzen
        // machte die indexOf-Wertung des Players willkürlich (Review-Fund).
        if (new Set(neueKategorien).size !== neueKategorien.length) {
          abbruch(
            "Achse: Zwei Kategorien wurden auf denselben Begriff übersetzt – bitte per Korrekturhinweis unterscheidbare Begriffe vorgeben.",
          );
        }
        for (const element of block.elemente as Record<string, unknown>[]) {
          if (typeof element.xKategorie === "string") {
            const index = masterKategorien.indexOf(element.xKategorie);
            if (index >= 0) element.xKategorie = neueKategorien[index];
          }
        }
      }
    }
  }

  // Schaubild-Überlauf-HINWEISE (nicht blockierend): Excalidraw
  // speichert feste Positionen/Grössen – längere Übersetzungen lassen
  // Kästen wachsen oder überlappen Nachbarn. Die Schätzung nutzt den
  // zeichengenau verifizierten Wrap-Nachbau aus der SYNC-Region;
  // Befunde gehören ins Gegenlesen (Korrekturhinweis setzen), nicht
  // in einen harten Abbruch.
  gebeSchaubildHinweise(masterRaw, inhalt, zielSprache);

  // Metafelder + Prüfsummen.
  const heute = new Date().toISOString().slice(0, 10);
  const fassung: Record<string, unknown> = {
    _hinweis: `AUTOMATISCH ERZEUGT aus module.json (${sprachName(masterMod.language)}). Nicht von Hand bearbeiten. Aenderungen am Master vornehmen und neu erzeugen: npm run uebersetze -- --modul ${slug} --sprache ${zielSprache}`,
    derivedFrom: {
      language: masterMod.language,
      masterHash: sha256(masterBytes),
      masterCommit: gitCommitKurz(),
      hintsHash: aktuellerHintsHash,
      generatedAt: heute,
      generator: "uebersetze.ts v1",
      // Ehrliche Provenienz: woher die NEU übersetzten Stücke stammen,
      // plus "+ speicher", wenn Bestand wiederverwendet wurde.
      model:
        (offeneSegmente.length + offenePakete.length === 0
          ? "speicher"
          : opt.antwortenDatei
            ? `datei:${path.basename(opt.antwortenDatei)}`
            : modell) +
        (offeneSegmente.length + offenePakete.length > 0 &&
        offeneSegmente.length + offenePakete.length < segmente.length + pakete.length
          ? " + speicher"
          : ""),
      selfHash: "",
    },
    ...inhalt,
  };
  (fassung.derivedFrom as Record<string, unknown>).selfHash =
    selfHashVon(fassung);

  // Harte Nachprüfung – das Werkzeug schreibt nie eine ungültige Datei.
  const fassungParsed = parseModulDatei(fassung);
  if (!fassungParsed.success) {
    abbruch(
      `Erzeugte Fassung ist schema-ungültig:\n${describeIssues(fassung, fassungParsed.error)
        .slice(0, 8)
        .join("\n")}`,
    );
  }
  const ohneMeta = { ...fassung };
  delete ohneMeta._hinweis;
  delete ohneMeta.derivedFrom;
  const strukturFehler = [
    ...vergleicheStruktur(masterRaw, ohneMeta),
    ...vergleichePunkte(masterMod, fassungParsed.data),
  ];
  if (strukturFehler.length > 0) {
    abbruch(`Strukturgleichheit verletzt:\n${strukturFehler.map((f) => `  ${f}`).join("\n")}`);
  }
  const masterBildUrls = new Set<string>();
  besucheStrings(masterRaw, [], (_, text) => {
    for (const url of findMarkdownImages(text).urls) masterBildUrls.add(url);
  });
  const textFehler: string[] = [];
  besucheStrings(ohneMeta, [], (pfad, text) => {
    if (findHtmlTags(text).length > 0) {
      textFehler.push(`Roh-HTML in ${pfadSchluessel(pfad)}`);
    }
    for (const url of findMarkdownImages(text).urls) {
      if (!masterBildUrls.has(url)) {
        textFehler.push(`Neues Markdown-Bild "${url}" in ${pfadSchluessel(pfad)}`);
      }
    }
  });
  besucheStrings(
    { _hinweis: fassung._hinweis, derivedFrom: fassung.derivedFrom },
    [],
    (pfad, text) => {
      if (findHtmlTags(text).length > 0) {
        textFehler.push(`Roh-HTML in ${pfadSchluessel(pfad)}`);
      }
    },
  );
  if (textFehler.length > 0) {
    abbruch(`Übersetzte Texte verletzen Regeln:\n${textFehler.slice(0, 5).map((f) => `  ${f}`).join("\n")}`);
  }

  // Schreiben: Fassung + Segment-Gedächtnis.
  const fassungsPfad = path.join(MODULES_DIR, slug, `module.${zielSprache}.json`);
  fs.writeFileSync(fassungsPfad, kanonisch(fassung));
  const neuerSpeicher: Speicher = {
    version: 1,
    hintsHash: aktuellerHintsHash,
    segmente: Object.fromEntries(
      segmente.map((s) => [
        s.schluessel,
        { quelle: sha256(s.text), text: antworten.segmente[s.schluessel] },
      ]),
    ),
    pakete: Object.fromEntries(
      pakete.map((p) => [
        p.schluessel,
        {
          quelle: sha256(
            kanonisch({ text: p.text, luecken: p.luecken, ablenker: p.ablenker }),
          ),
          inhalt: antworten.pakete[p.schluessel],
        },
      ]),
    ),
  };
  fs.mkdirSync(path.dirname(speicherPfad(slug, zielSprache)), { recursive: true });
  fs.writeFileSync(speicherPfad(slug, zielSprache), kanonisch(neuerSpeicher));

  console.log(`✓ modules/${slug}/module.${zielSprache}.json geschrieben.`);
  console.log(
    `\nPR-Textvorschlag:\n---\nSprachfassung ${zielSprache} für «${masterMod.title}» (${slug}), erzeugt aus Master-Stand ${gitCommitKurz()} mit ${
      opt.antwortenDatei ? "Übersetzungen aus Datei" : modell
    }; ${offeneSegmente.length + offenePakete.length} von ${segmente.length + pakete.length} Stücken neu übersetzt. Bitte sprachlich gegenlesen (Fachbegriffe, Lücken-Antwortvarianten, Natürlichkeit) – Struktur, ids und Punkte sind maschinell geprüft.\n---`,
  );
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opt = leseArgumente();
  const sprachen = ladeSprachen();
  if (!sprachen.includes(opt.sprache)) {
    abbruch(
      `Sprache "${opt.sprache}" steht nicht in uebersetzung/sprachen.json (${sprachen.join(", ")}).`,
    );
  }
  let ziele: string[] = [];
  if (opt.modul) {
    ziele = [opt.modul];
  } else {
    const slugs = fs
      .readdirSync(MODULES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    for (const slug of slugs) {
      const masterPfad = path.join(MODULES_DIR, slug, "module.json");
      if (!fs.existsSync(masterPfad)) continue;
      const roh = JSON.parse(fs.readFileSync(masterPfad, "utf8")) as Record<
        string,
        unknown
      >;
      if (roh.languageLearning) continue;
      if (uebersetzungsSperren(roh).length > 0) continue;
      if ((roh.language ?? "de") === opt.sprache) continue;
      const fassungsPfad = path.join(
        MODULES_DIR,
        slug,
        `module.${opt.sprache}.json`,
      );
      const existiert = fs.existsSync(fassungsPfad);
      if (opt.alleFehlenden && !existiert) ziele.push(slug);
      if (opt.nurVeraltet && existiert) {
        const fassung = JSON.parse(fs.readFileSync(fassungsPfad, "utf8")) as {
          derivedFrom?: { masterHash?: string; hintsHash?: string | null };
        };
        const veraltet =
          fassung.derivedFrom?.masterHash !== dateiHash(masterPfad) ||
          (fassung.derivedFrom?.hintsHash ?? null) !==
            hinweiseHash(slug, opt.sprache);
        if (veraltet) ziele.push(slug);
      }
    }
    if (ziele.length === 0) {
      console.log("Nichts zu tun – alle Fassungen aktuell bzw. vorhanden.");
      return;
    }
  }
  for (const slug of ziele) {
    await uebersetzeModul(slug, opt);
  }
}

// Nur als CLI ausführen – test-diagramm.ts importiert extrahiere() ohne
// die Kommandozeilen-Seiteneffekte. Pfadbasiert und endungstolerant:
// «tsx uebersetzung/uebersetze» (ohne .ts) lässt argv[1] endungslos –
// ein blosser endsWith(".ts") machte den Aufruf zum stillen No-op
// (Review-Fund).
const argvPfad = path.resolve(process.argv[1] ?? "").replace(/\.m?[tj]s$/, "");
const eigenerPfad = fileURLToPath(import.meta.url).replace(/\.m?[tj]s$/, "");
if (argvPfad === eigenerPfad) void main();

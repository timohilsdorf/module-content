/**
 * DIE eine massgebliche Feldliste des Übersetzungs-Systems: Jeder
 * String-Pfad eines Moduls wird klassifiziert als
 *
 *   - "uebersetzt":  natürlichsprachiger Text, geht als Segment an die KI
 *   - "invariant":   muss in der Fassung byteidentisch zum Master sein
 *   - "abgeleitet":  setzt das Werkzeug programmatisch (language,
 *                    vorleseSprache, xKategorie, Fassungs-Metafelder)
 *   - "paket":       Lückentext-Aufgaben, die als Ganzes übersetzt werden
 *                    (text + luecken + ablenker zusammenhängend; die
 *                    Antwortlisten dürfen zielsprachlich BREITER werden)
 *
 * VOLLSTÄNDIGKEITS-NETZ: klassifizierePfad wirft für unbekannte Pfade –
 * ein neuer Blocktyp oder ein neues Feld kann damit NIE still
 * unübersetzt bleiben oder ungeprüft durch die Strukturgleichheit
 * rutschen. Wer das Schema erweitert, MUSS diese Liste nachziehen
 * (Werkzeug und CI schlagen sonst laut fehl).
 *
 * Speist das Übersetzungswerkzeug (uebersetze.ts) UND die
 * Strukturgleichheits-Prüfung der CI (struktur.ts) – eine Quelle,
 * keine Drift.
 */

export type FeldKlasse = "uebersetzt" | "invariant" | "abgeleitet" | "paket";

/**
 * Regeln über NORMALISIERTE Pfade (Array-Indizes als "[]",
 * Objektschlüssel mit "."). Reihenfolge egal – die Muster sind
 * überschneidungsfrei; exakte Treffer, keine Präfixe.
 */
const REGELN: ReadonlyArray<[RegExp, FeldKlasse]> = [
  // --- Modul-Top-Level ----------------------------------------------------
  [/^title$/, "uebersetzt"],
  [/^description$/, "uebersetzt"],
  [/^learningObjectives\[\]$/, "uebersetzt"],
  [/^keywords\[\]$/, "uebersetzt"],
  [/^einheit$/, "uebersetzt"],
  [/^language$/, "abgeleitet"],
  [/^id$/, "invariant"],
  [/^difficulty$/, "invariant"],
  [/^license$/, "invariant"],
  [/^authors\[\]$/, "invariant"],
  [/^requires\[\]$/, "invariant"],
  [/^sources\[\]\.(title|url)$/, "invariant"],
  // curricula: subject ist Katalog-Filter-/Gruppierungs-SCHLÜSSEL (Kürzel
  // wie "WP") und bleibt darum unübersetzt; nur die Labels wandern mit.
  [/^curricula\[\]\.curriculum$/, "invariant"],
  [/^curricula\[\]\.subject$/, "invariant"],
  [/^curricula\[\]\.subjectName$/, "uebersetzt"],
  [/^curricula\[\]\.gradesText$/, "uebersetzt"],
  [/^curricula\[\]\.competencies\[\]\.code$/, "invariant"],
  // Amtlicher Lehrplan-Wortlaut – bewusst Original (Konzept, Frage 3).
  [/^curricula\[\]\.competencies\[\]\.description$/, "invariant"],
  // --- Fassungs-Metafelder (nur module.<lang>.json) -----------------------
  [/^_hinweis$/, "abgeleitet"],
  [/^derivedFrom\./, "abgeleitet"],
  // --- Alle Blöcke --------------------------------------------------------
  [/^blocks\[\]\.id$/, "invariant"],
  [/^blocks\[\]\.type$/, "invariant"],
  // Teilkompetenz-Kennungen sind sprachunabhängige Schlüssel ins Register
  // (kompetenzen/teilkompetenzen.json) – nie übersetzen.
  [/^blocks\[\]\.teilkompetenzen\[\]$/, "invariant"],
  [/^blocks\[\]\.title$/, "uebersetzt"],
  [/^blocks\[\]\.intro$/, "uebersetzt"],
  // --- text ---------------------------------------------------------------
  [/^blocks\[\]\.body$/, "uebersetzt"],
  // --- image / audio / video (geteilte Feldnamen, gleiche Klasse) ---------
  [/^blocks\[\]\.src$/, "invariant"],
  [/^blocks\[\]\.credit$/, "invariant"],
  [/^blocks\[\]\.alt$/, "uebersetzt"],
  [/^blocks\[\]\.caption$/, "uebersetzt"],
  [/^blocks\[\]\.description$/, "uebersetzt"],
  [/^blocks\[\]\.transcript$/, "uebersetzt"],
  [/^blocks\[\]\.provider$/, "invariant"],
  [/^blocks\[\]\.videoId$/, "invariant"],
  [/^blocks\[\]\.url$/, "invariant"],
  [/^blocks\[\]\.vorleseText$/, "uebersetzt"],
  [/^blocks\[\]\.vorleseSprache$/, "abgeleitet"],
  // --- quiz + simulation.abschlussfrage -----------------------------------
  [/^blocks\[\]\.questions\[\]\.id$/, "invariant"],
  [/^blocks\[\]\.questions\[\]\.type$/, "invariant"],
  [/^blocks\[\]\.questions\[\]\.prompt$/, "uebersetzt"],
  [/^blocks\[\]\.questions\[\]\.explanation$/, "uebersetzt"],
  [/^blocks\[\]\.questions\[\]\.options\[\]\.text$/, "uebersetzt"],
  [/^blocks\[\]\.abschlussfrage\.id$/, "invariant"],
  [/^blocks\[\]\.abschlussfrage\.type$/, "invariant"],
  [/^blocks\[\]\.abschlussfrage\.prompt$/, "uebersetzt"],
  [/^blocks\[\]\.abschlussfrage\.explanation$/, "uebersetzt"],
  [/^blocks\[\]\.abschlussfrage\.options\[\]\.text$/, "uebersetzt"],
  // --- tasks --------------------------------------------------------------
  [/^blocks\[\]\.tasks\[\]\.id$/, "invariant"],
  [/^blocks\[\]\.tasks\[\]\.prompt$/, "uebersetzt"],
  [/^blocks\[\]\.tasks\[\]\.hint$/, "uebersetzt"],
  [/^blocks\[\]\.tasks\[\]\.solution$/, "uebersetzt"],
  // --- lueckentext (Paket; satzbau ist in v1 aufgeschoben – die
  //     bausteine/alternativen-Pfade sind trotzdem klassifiziert, damit
  //     das Netz nie «unbekannt» meldet, sondern die Merkmals-Sperre
  //     die verständliche Meldung liefert) ---------------------------------
  [/^blocks\[\]\.modus$/, "invariant"],
  [/^blocks\[\]\.text$/, "paket"],
  [/^blocks\[\]\.luecken\[\]\.antworten\[\]$/, "paket"],
  [/^blocks\[\]\.ablenker\[\]$/, "paket"],
  [/^blocks\[\]\.bausteine\[\]$/, "paket"],
  [/^blocks\[\]\.varianten\[\]\.modus$/, "invariant"],
  [/^blocks\[\]\.varianten\[\]\.intro$/, "uebersetzt"],
  [/^blocks\[\]\.varianten\[\]\.text$/, "paket"],
  [/^blocks\[\]\.varianten\[\]\.luecken\[\]\.antworten\[\]$/, "paket"],
  [/^blocks\[\]\.varianten\[\]\.ablenker\[\]$/, "paket"],
  [/^blocks\[\]\.varianten\[\]\.bausteine\[\]$/, "paket"],
  // --- zuordnung ----------------------------------------------------------
  [/^blocks\[\]\.(varianten\[\]\.)?paare\[\]\.(links|rechts)\.text$/, "uebersetzt"],
  [/^blocks\[\]\.(varianten\[\]\.)?paare\[\]\.(links|rechts)\.bild\.src$/, "invariant"],
  [/^blocks\[\]\.(varianten\[\]\.)?paare\[\]\.(links|rechts)\.bild\.credit$/, "invariant"],
  // bild.alt ist zugleich Anzeige-/Vergleichstext des Elements.
  [/^blocks\[\]\.(varianten\[\]\.)?paare\[\]\.(links|rechts)\.bild\.alt$/, "uebersetzt"],
  // --- numerisch / term ---------------------------------------------------
  [/^blocks\[\]\.(varianten\[\]\.)?aufgaben\[\]\.prompt$/, "uebersetzt"],
  [/^blocks\[\]\.(varianten\[\]\.)?aufgaben\[\]\.antworten\[\]$/, "invariant"],
  [/^blocks\[\]\.(varianten\[\]\.)?aufgaben\[\]\.einheit$/, "invariant"],
  [/^blocks\[\]\.(varianten\[\]\.)?aufgaben\[\]\.toleranz\.art$/, "invariant"],
  // --- achse --------------------------------------------------------------
  [/^blocks\[\]\.wertung$/, "invariant"],
  [/^blocks\[\]\.(x|y)\.beschriftung$/, "uebersetzt"],
  [/^blocks\[\]\.(x|y)\.kategorien\[\]$/, "uebersetzt"],
  // xKategorie referenziert kategorien wörtlich – das Werkzeug setzt sie
  // programmatisch auf die Übersetzung mit demselben Index.
  [/^blocks\[\]\.elemente\[\]\.xKategorie$/, "abgeleitet"],
  [/^blocks\[\]\.elemente\[\]\.text$/, "uebersetzt"],
  // --- simulation ---------------------------------------------------------
  [/^blocks\[\]\.figur\.name$/, "uebersetzt"],
  [/^blocks\[\]\.figur\.rolle$/, "uebersetzt"],
  [/^blocks\[\]\.figur\.rollenPrompt$/, "uebersetzt"],
  [/^blocks\[\]\.start$/, "invariant"],
  [/^blocks\[\]\.knoten\[\]\.id$/, "invariant"],
  [/^blocks\[\]\.knoten\[\]\.text$/, "uebersetzt"],
  [/^blocks\[\]\.knoten\[\]\.antworten\[\]\.text$/, "uebersetzt"],
  [/^blocks\[\]\.knoten\[\]\.antworten\[\]\.weiter$/, "invariant"],
  [/^blocks\[\]\.knoten\[\]\.auswertung$/, "uebersetzt"],
  // --- planspiel (Module damit sind in v1 von Fassungen ausgenommen) ------
  [/^blocks\[\]\.datei$/, "invariant"],
];

/** Pfad-Array → normalisierter Pfad ("blocks[].questions[].prompt"). */
export function normalisierePfad(teile: ReadonlyArray<string | number>): string {
  let s = "";
  for (const teil of teile) {
    if (typeof teil === "number") s += "[]";
    else s += (s === "" ? "" : ".") + teil;
  }
  return s;
}

/** Klassifiziert einen String-Pfad; wirft bei unbekannten Pfaden (Netz!). */
export function klassifizierePfad(normalisiert: string): FeldKlasse {
  for (const [muster, klasse] of REGELN) {
    if (muster.test(normalisiert)) return klasse;
  }
  throw new Error(
    `Unklassifizierter String-Pfad "${normalisiert}" – uebersetzung/felder.ts kennt dieses Feld nicht. ` +
      "Beim Erweitern des Schemas muss die Feldliste mitgezogen werden (uebersetzt | invariant | abgeleitet | paket).",
  );
}

/**
 * PAKET-Unterbäume: Innerhalb dieser Knoten dürfen Fassungen in der
 * FORM abweichen (Antwortlisten breiter, Ablenker anders) – die
 * Strukturgleichheit prüft dort nur Existenz und Lücken-/Punktzahl.
 */
export const PAKET_FREIE_UNTERBAEUME: ReadonlyArray<RegExp> = [
  /^blocks\[\]\.luecken\[\]\.antworten$/,
  /^blocks\[\]\.ablenker$/,
  /^blocks\[\]\.varianten\[\]\.luecken\[\]\.antworten$/,
  /^blocks\[\]\.varianten\[\]\.ablenker$/,
];

/** Alle String-Werte samt Original-Pfad (mit Indizes) besuchen. */
export function besucheStrings(
  wert: unknown,
  teile: (string | number)[],
  besuch: (pfadTeile: ReadonlyArray<string | number>, text: string) => void,
): void {
  if (typeof wert === "string") {
    besuch(teile, wert);
  } else if (Array.isArray(wert)) {
    wert.forEach((v, i) => besucheStrings(v, [...teile, i], besuch));
  } else if (wert && typeof wert === "object") {
    for (const [k, v] of Object.entries(wert)) {
      besucheStrings(v, [...teile, k], besuch);
    }
  }
}

/** Pfad-Array als adressierbarer Schlüssel (mit Indizes), z. B. "blocks[3].alt". */
export function pfadSchluessel(teile: ReadonlyArray<string | number>): string {
  let s = "";
  for (const teil of teile) {
    if (typeof teil === "number") s += `[${teil}]`;
    else s += (s === "" ? "" : ".") + teil;
  }
  return s;
}

/**
 * Merkmale, die eine Übersetzung in v1 ausschliessen (aufgeschoben,
 * siehe Konzept Abschnitt 8): planspiel (Text in HTML-Datei),
 * eingesprochene Audio-Dateien (src) und satzbau (Punktzahl =
 * Baustein-Anzahl, in der Zielsprache kaum natürlich einhaltbar).
 * Merkmalsbasiert statt Listen-basiert – neue Module mit diesen
 * Merkmalen sind automatisch abgedeckt.
 */
export function uebersetzungsSperren(rohModul: unknown): string[] {
  const sperren: string[] = [];
  const blocks =
    rohModul && typeof rohModul === "object"
      ? ((rohModul as Record<string, unknown>).blocks as unknown[])
      : [];
  if (!Array.isArray(blocks)) return sperren;
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as Record<string, unknown>;
    if (b.type === "planspiel") sperren.push("planspiel-Block (Spieltext in HTML-Datei)");
    if (b.type === "audio" && typeof b.src === "string")
      sperren.push("audio-Block mit eingesprochener Datei (src)");
    if (b.type === "lueckentext") {
      const modi = [b.modus, ...(Array.isArray(b.varianten) ? (b.varianten as Record<string, unknown>[]).map((v) => v?.modus) : [])];
      if (modi.includes("satzbau"))
        sperren.push("lueckentext im satzbau-Modus (Punktzahl = Baustein-Anzahl)");
    }
  }
  return [...new Set(sperren)];
}

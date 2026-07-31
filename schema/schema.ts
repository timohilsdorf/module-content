import { z } from "zod";

/**
 * EveryCate Content-Schema (Version 2) – maschinenlesbare Referenz.
 *
 * ⚠️ SYNCHRON HALTEN: Diese Datei ist eine Kopie von
 * `src/lib/content/schema.ts` aus dem Plattform-Repository (everycate).
 * Format-Änderungen müssen in BEIDEN Dateien landen – zuerst in der
 * Plattform (dort erzwingt der Build das Schema), dann hier. Ab dem
 * SYNC-BEGINN-Marker müssen beide Dateien byteidentisch sein; die CI
 * des Plattform-Repos schlägt sonst fehl.
 *
 * Dateibasiertes Format für Lernmodule: ein Ordner pro Modul unter
 * `modules/<slug>/module.json`. Die menschenlesbare Dokumentation
 * (auch für KI-Autoren) liegt in `CONTENT-SCHEMA.md`; die
 * Validierungsregeln dieses Repos in `schema/validate.ts` +
 * `schema/whitelist.json`.
 */

// ---- SYNC-BEGINN: ab hier Plattform- und Content-Repo-Kopie byteidentisch halten (CI prüft) ----

/**
 * Versionsgeschichte:
 * - 1 (Juli 2026): Grundformat; Quiz als optionales Sonderfeld `quiz`
 *   auf Modulebene (genau eines, immer am Schluss gerendert).
 * - 2 (Juli 2026): Quiz ist ein regulärer Inhaltsblock `type: "quiz"`
 *   (beliebig oft, beliebige Position, prüfender Block wie der
 *   Lückentext). Version-1-Dateien bleiben gültig und werden beim
 *   Parsen VERLUSTFREI migriert (parseModulDatei): Das Sonderfeld wird
 *   zum letzten Block mit der id "quiz" – derselbe Lernstand-Schlüssel
 *   wie bisher, Fortschritt/Reports/Coins bleiben kompatibel.
 * - 2, additive Ergänzung (21.7.2026, KEIN Versionswechsel – bestehende
 *   Dateien bleiben unverändert gültig): optionale Metadaten `sequenz`
 *   (Lernreihenfolge innerhalb von Fach/Einheit, 1 = zuerst; der Katalog
 *   sortiert danach statt nach Dateinamen) und `einheit` (Themengruppe,
 *   wenn mehrere Module eine Reihe bilden; der Katalog fasst Module mit
 *   identischem Wert sichtbar zusammen).
 * - 2, additive Ergänzung (28.7.2026, KEIN Versionswechsel): Video-Blöcke
 *   mit `provider: "url"` dürfen statt einer absoluten Adresse auch eine
 *   Datei aus dem eigenen Modulordner nennen
 *   ("/content/<modul>/<datei>.mp4"). Bisher gültige Dateien bleiben
 *   unverändert gültig; ob die Plattform diese Quelle freigibt,
 *   entscheidet weiterhin ihre Medien-Whitelist.
 * - 2, additive Ergänzung (31.7.2026, KEIN Versionswechsel): zwei neue
 *   Blocktypen. `simulation` (verzweigter Rollenspiel-Dialog, vollständig
 *   skriptiert, optional mit prüfender Abschlussfrage – vorher ein
 *   freigegebener Zukunftstyp) und `planspiel` (eingebettetes
 *   interaktives Lernspiel als HTML-Datei im Modulordner; läuft NUR in
 *   Modulen aus dem geprüften Content-Repo, streng gekapselt im
 *   sandbox-iframe). Ältere Player zeigen für beide einen Platzhalter.
 *   Frühere Version-1-Dateien mit einem andersförmigen
 *   simulation/planspiel-Zukunftsblock bleiben gültig (Migration benennt
 *   ihn in einen unbekannten Typ um, Platzhalter-Verhalten bleibt).
 */
export const SCHEMA_VERSION = 2;

/** String, in dem Markdown erlaubt ist (GitHub Flavored Markdown). */
const markdown = z.string().min(1);

/**
 * Moduleigene Video-Datei: derselbe Ort wie die Bilder eines Moduls
 * ("/content/<modul>/<datei>"), Endung .mp4 oder .webm. Bewusst ohne
 * "..", ohne Query und ohne Fragment – der Pfad soll genau auf eine
 * Datei im Modulordner zeigen.
 */
export const VIDEO_DATEI_MUSTER =
  /^\/content\/[a-z0-9][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:mp4|webm)$/;

/** Absolute https-Adresse (fremde Quelle – Freigabe entscheidet die App). */
function istHttpsUrl(wert: string): boolean {
  try {
    return new URL(wert).protocol === "https:";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Metadaten
// ---------------------------------------------------------------------------

/** Lehrplan-21-Kompetenz, z. B. { code: "RZG.4.2.c", description: "..." } */
export const competencySchema = z.strictObject({
  code: z
    .string()
    .regex(
      /^[A-Z]{1,4}(\.[A-Za-z0-9]{1,4})+$/,
      'Lehrplan-21-Code im Format "FACH.x.y.z" erwartet, z. B. "RZG.4.2.c" oder "MA.1.A.3".',
    ),
  description: z.string().optional(),
});

export const sourceSchema = z.strictObject({
  title: z.string().min(1),
  /** Nur http(s)/mailto – andere Schemata (javascript:, data:) landen sonst in <a href>. */
  url: z
    .string()
    .url()
    .refine((u) => ["http:", "https:", "mailto:"].includes(new URL(u).protocol), {
      message: "Nur http(s)- oder mailto-Links sind erlaubt.",
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Inhaltsblöcke
// ---------------------------------------------------------------------------

const blockBase = {
  /** Optionale stabile ID, z. B. für Deep-Links oder spätere Auswertungen. */
  id: z.string().optional(),
  /** Optionale Überschrift des Blocks. */
  title: z.string().optional(),
};

export const textBlockSchema = z.strictObject({
  ...blockBase,
  type: z.literal("text"),
  /** Fliesstext, Markdown erlaubt (Listen, Tabellen, Links, Betonung …). */
  body: markdown,
});

export const imageBlockSchema = z.strictObject({
  ...blockBase,
  type: z.literal("image"),
  /** Pfad "/content/<modul-id>/<datei>" (Datei liegt im Modulordner des Content-Repos) oder https-URL. */
  src: z.string().min(1),
  /** Alternativtext für Screenreader – Pflicht. */
  alt: z.string().min(1),
  caption: z.string().optional(),
  /** Bildnachweis/Lizenz, z. B. "Foto: NASA, Public Domain". */
  credit: z.string().optional(),
});

export const videoBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("video"),
    provider: z.enum(["youtube", "vimeo", "url"]).default("youtube"),
    /** Für youtube/vimeo: die Video-ID (nicht die ganze URL). */
    videoId: z.string().optional(),
    /**
     * Für provider "url": die Video-Datei. Zwei Formen sind zulässig –
     * eine absolute https-URL ODER ein moduleigener Pfad
     * "/content/<modul>/<datei>.mp4|webm" (Datei liegt im Modulordner,
     * wie die Bilder). WELCHE davon tatsächlich erlaubt ist, entscheidet
     * die Plattform (Medien-Whitelist); dieses Schema prüft nur die Form.
     */
    url: z.string().optional(),
    description: z.string().optional(),
    /** Startzeitpunkt in Sekunden. */
    startSeconds: z.number().int().nonnegative().optional(),
    /**
     * Textalternative zum Video (Markdown), aufklappbar im Player –
     * wichtig für Barrierefreiheit (WCAG 1.2) und wenn das Video offline
     * oder gesperrt ist.
     */
    transcript: markdown.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.provider === "url") {
      if (!v.url) {
        ctx.addIssue({
          code: "custom",
          path: ["url"],
          message: 'Video-Block: provider "url" braucht eine Video-Datei in "url".',
        });
        return;
      }
      if (!VIDEO_DATEI_MUSTER.test(v.url) && !istHttpsUrl(v.url)) {
        ctx.addIssue({
          code: "custom",
          path: ["url"],
          message:
            'Video-Block: "url" muss eine https-Adresse sein oder ein ' +
            'moduleigener Pfad der Form "/content/<modul>/<datei>.mp4" ' +
            "(auch .webm).",
        });
      }
      return;
    }
    if (!v.videoId) {
      ctx.addIssue({
        code: "custom",
        path: ["videoId"],
        message: `Video-Block: provider "${v.provider}" braucht eine "videoId" (nur die ID, nicht die ganze URL).`,
      });
      return;
    }
    const idPattern =
      v.provider === "youtube" ? /^[A-Za-z0-9_-]{6,20}$/ : /^\d{6,12}$/;
    if (!idPattern.test(v.videoId)) {
      ctx.addIssue({
        code: "custom",
        path: ["videoId"],
        message:
          v.provider === "youtube"
            ? `"${v.videoId}" ist keine YouTube-Video-ID. Erwartet wird nur die ID (z. B. "jNQXAC9IVRw" aus youtube.com/watch?v=jNQXAC9IVRw), nicht die ganze URL.`
            : `"${v.videoId}" ist keine Vimeo-Video-ID (nur Ziffern, z. B. "76979871").`,
      });
    }
  });

export const taskSchema = z.strictObject({
  id: z.string().optional(),
  /** Aufgabenstellung, Markdown erlaubt. */
  prompt: markdown,
  /** Optionaler Tipp, den Lernende aufklappen können. */
  hint: markdown.optional(),
  /** Optionale Musterlösung, aufklappbar. */
  solution: markdown.optional(),
});

export const tasksBlockSchema = z.strictObject({
  ...blockBase,
  type: z.literal("tasks"),
  intro: markdown.optional(),
  tasks: z.array(taskSchema).min(1),
});

// --- Lückentext (Cloze), automatisch geprüft --------------------------------

export const lueckeSchema = z.strictObject({
  /**
   * Akzeptierte Antworten (mind. 1). Der erste Eintrag ist die Anzeigeform:
   * Im Modus "wortbank" erscheint er als antippbares Auswahlwort, und die
   * Lösungsanzeige im Player zeigt ihn als Musterantwort.
   */
  antworten: z.array(z.string().trim().min(1)).min(1),
  /** Gross-/Kleinschreibung beim Vergleich beachten? Standard: nein. */
  caseSensitive: z.boolean().default(false),
});

export type LueckentextSegment =
  | { art: "text"; text: string }
  | { art: "luecke"; index: number };

/**
 * Zerlegt einen Lückentext an den Markern {{1}}, {{2}}, … in Segmente
 * (`index` ist 0-basiert in `luecken`). Einzige massgebliche Definition
 * der Marker-Syntax – Validierung und Player nutzen dieselbe Funktion.
 */
export function zerlegeLueckentext(text: string): LueckentextSegment[] {
  const segmente: LueckentextSegment[] = [];
  const regex = /\{\{(\d+)\}\}/g;
  let letztesEnde = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > letztesEnde) {
      segmente.push({ art: "text", text: text.slice(letztesEnde, match.index) });
    }
    segmente.push({ art: "luecke", index: Number(match[1]) - 1 });
    letztesEnde = match.index + match[0].length;
  }
  if (letztesEnde < text.length) {
    segmente.push({ art: "text", text: text.slice(letztesEnde) });
  }
  return segmente;
}

/**
 * Normalisiert eine Antwort für den Vergleich – Eingabe und akzeptierte
 * Antworten durchlaufen exakt dieselbe Normalisierung:
 * - Unicode-NFC: Umlaute kommen je nach Tastatur/Diktat als ein Zeichen
 *   (NFC) oder als Buchstabe + Kombinationszeichen (NFD) an – ohne
 *   Angleichung würde eine korrekt getippte Antwort als falsch gewertet.
 * - Leerraum am Rand wird immer ignoriert.
 * - Ohne caseSensitive zusätzlich die Gross-/Kleinschreibung.
 */
export function normalisiereLueckenAntwort(
  wert: string,
  caseSensitive: boolean,
): string {
  const getrimmt = wert.normalize("NFC").trim();
  return caseSensitive ? getrimmt : getrimmt.toLowerCase();
}

/** Eine Lücke gilt als richtig, wenn die Eingabe einer akzeptierten Antwort entspricht. */
export function istLueckeRichtig(
  eingabe: string,
  luecke: z.infer<typeof lueckeSchema>,
): boolean {
  return luecke.antworten.some(
    (antwort) =>
      normalisiereLueckenAntwort(antwort, luecke.caseSensitive) ===
      normalisiereLueckenAntwort(eingabe, luecke.caseSensitive),
  );
}

export const lueckentextBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("lueckentext"),
    /** Optionale Arbeitsanweisung über dem Text, Markdown erlaubt. */
    intro: markdown.optional(),
    /**
     * "wortbank": Lösungswörter (plus Ablenker) als antippbare Auswahl –
     * erst Wort antippen, dann Lücke. "eingabe": freies Textfeld pro Lücke.
     */
    modus: z.enum(["wortbank", "eingabe"]),
    /**
     * Der Lückentext als reiner Text (KEIN Markdown; Zeilenumbrüche mit \n
     * bleiben erhalten). {{1}}, {{2}}, … markieren die Lücken und verweisen
     * 1-basiert auf `luecken`; jede Lücke kommt genau einmal vor.
     */
    text: z.string().min(1),
    luecken: z.array(lueckeSchema).min(1),
    /**
     * Nur Modus "wortbank": zusätzliche falsche Wörter in der Auswahl.
     * Dürfen mit keiner akzeptierten Antwort übereinstimmen.
     */
    ablenker: z.array(z.string().trim().min(1)).default([]),
  })
  .superRefine((block, ctx) => {
    // Stabile id ist Pflicht (wie bei Quizfragen): Lernstand und Coin-Vergabe
    // speichern Ergebnisse pro Block – ohne id würden sie bei Umsortierungen
    // vermischt bzw. mehrfach vergeben.
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Lückentext: Der Block braucht eine stabile "id" (z. B. "lt1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Lückentext: Die id "quiz" ist für Quizblöcke reserviert (Lernstand-Schlüssel des früheren Abschlussquiz) – bitte eine andere id wählen.',
      });
    }

    const marker = zerlegeLueckentext(block.text).filter(
      (s) => s.art === "luecke",
    );

    // Wohlgeformtheit: Jedes "{{" bzw. "}}" muss zu einem vollständigen
    // {{n}}-Marker gehören – fängt {{eins}}, {{1} und verirrte Klammern.
    const offene = (block.text.match(/\{\{/g) ?? []).length;
    const schliessende = (block.text.match(/\}\}/g) ?? []).length;
    if (offene !== marker.length || schliessende !== marker.length) {
      ctx.addIssue({
        code: "custom",
        path: ["text"],
        message:
          "Lückentext: unvollständiger Lücken-Marker. Lücken werden exakt als {{1}}, {{2}}, … geschrieben (fortlaufende Zahl in doppelten geschweiften Klammern, ohne Leerzeichen); {{ und }} sind dafür reserviert.",
      });
    }

    const verwendungen = new Map<number, number>();
    for (const seg of marker) {
      verwendungen.set(seg.index, (verwendungen.get(seg.index) ?? 0) + 1);
    }
    for (const [index] of verwendungen) {
      if (index < 0 || index >= block.luecken.length) {
        ctx.addIssue({
          code: "custom",
          path: ["text"],
          message: `Lückentext: Marker {{${index + 1}}} verweist auf eine Lücke, die es nicht gibt – definiert sind ${block.luecken.length} Lücken ({{1}} bis {{${block.luecken.length}}}).`,
        });
      }
    }
    block.luecken.forEach((_, index) => {
      const anzahl = verwendungen.get(index) ?? 0;
      if (anzahl === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["luecken", index],
          message: `Lückentext: Lücke ${index + 1} hat keinen Marker {{${index + 1}}} im Text.`,
        });
      } else if (anzahl > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["text"],
          message: `Lückentext: Marker {{${index + 1}}} kommt ${anzahl}-mal vor – jede Lücke wird genau einmal verwendet.`,
        });
      }
    });

    if (block.modus === "eingabe" && block.ablenker.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["ablenker"],
        message:
          'Lückentext: "ablenker" ist nur im Modus "wortbank" erlaubt (im Modus "eingabe" gibt es keine Wortauswahl).',
      });
    }
    block.ablenker.forEach((wort, index) => {
      if (block.luecken.some((luecke) => istLueckeRichtig(wort, luecke))) {
        ctx.addIssue({
          code: "custom",
          path: ["ablenker", index],
          message: `Lückentext: Ablenker "${wort}" ist zugleich eine akzeptierte Antwort einer Lücke – er wäre kein Ablenker.`,
        });
      }
    });
  });

// --- Quiz (Fragen + Quizblock), automatisch geprüft ------------------------

const questionBase = {
  id: z.string().optional(),
  /** Fragetext, Markdown erlaubt. */
  prompt: markdown,
  /** Erklärung, die nach dem Beantworten angezeigt wird. */
  explanation: markdown.optional(),
  /** Punkte für die richtige Antwort (ganzzahlig, 1–100; Standard 1). */
  points: z.number().int().positive().max(100).default(1),
};

export const choiceOptionSchema = z.strictObject({
  text: z.string().min(1),
  correct: z.boolean().default(false),
});

export const singleChoiceQuestionSchema = z
  .strictObject({
    ...questionBase,
    type: z.literal("single_choice"),
    options: z.array(choiceOptionSchema).min(2),
  })
  .refine((q) => q.options.filter((o) => o.correct).length === 1, {
    message: "single_choice: genau eine Option muss correct=true sein.",
  });

export const multipleChoiceQuestionSchema = z
  .strictObject({
    ...questionBase,
    type: z.literal("multiple_choice"),
    options: z.array(choiceOptionSchema).min(2),
  })
  .refine((q) => q.options.some((o) => o.correct), {
    message: "multiple_choice: mindestens eine Option muss correct=true sein.",
  });

export const trueFalseQuestionSchema = z.strictObject({
  ...questionBase,
  type: z.literal("true_false"),
  /** Die korrekte Antwort auf die Aussage in `prompt`. */
  answer: z.boolean(),
});

export const questionSchema = z.discriminatedUnion("type", [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
]);

/**
 * NUR NOCH SCHEMA-VERSION 1 (siehe moduleV1Schema): das frühere
 * Quiz-Sonderfeld auf Modulebene. Seit Version 2 ist das Quiz ein
 * regulärer Block (quizBlockSchema); parseModulDatei migriert alte
 * Dateien verlustfrei.
 */
export const quizSchema = z.strictObject({
  title: z.string().optional(),
  /**
   * VERALTET (Juli 2026): Der Player wertet dieses Feld nicht mehr aus –
   * bestanden ist ein Aufgabenblock einheitlich erst bei 100 % (alle
   * Punkte), wie beim Lückentext und beim Modulabschluss. Das Feld bleibt
   * im Schema, damit bestehende Module gültig bleiben.
   */
  passingScorePercent: z.number().min(0).max(100).default(60),
  questions: z.array(questionSchema).min(1),
});

/**
 * Quiz als regulärer Inhaltsblock (Schema-Version 2): darf beliebig oft
 * und an beliebiger Position vorkommen und wird pro Block einzeln
 * ausgewertet (Prozent, Punkte, Versuche). Jeder Quizblock ist ein
 * PRÜFENDER Block – das Modul gilt erst als bestanden, wenn alle
 * prüfenden Blöcke 100 % erreicht haben; die Coins gibt es weiterhin
 * einmal pro bestandenem Modul, nicht pro Quiz.
 */
export const quizBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("quiz"),
    /** Optionale Einleitung über den Fragen, Markdown erlaubt. */
    intro: markdown.optional(),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((block, ctx) => {
    // Stabile id ist Pflicht (wie beim Lückentext): Lernstand und
    // Coin-Vergabe speichern Ergebnisse pro Block. Die id "quiz" ist
    // hier ERLAUBT – sie ist der historische Schlüssel des früheren
    // Abschlussquiz (migrierte Module behalten so ihren Lernstand).
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Quiz: Der Block braucht eine stabile "id" (z. B. "quiz1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    }
  });

// --- Planspiel (eingebettetes Lernspiel, nur geprüfte Module) ---------------

/**
 * Moduleigene Planspiel-Datei: ein eigenständiges HTML-Dokument im
 * Modulordner, referenziert wie Bilder und Videos
 * ("/content/<modul>/<datei>.html"). Bewusst ohne "..", ohne Query und
 * ohne Fragment – der Pfad zeigt genau auf eine Datei im Modulordner.
 */
export const PLANSPIEL_DATEI_MUSTER =
  /^\/content\/[a-z0-9][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.html$/;

/**
 * Pflicht-Anfang eines Planspiel-Dokuments: `<!doctype html><html><head>`
 * (Attribute und Leerraum erlaubt, optional ein BOM). Der Player fügt
 * seine Content-Security-Policy als allererstes Element in den <head> ein
 * – stünde vor dem <head> ausführbarer Inhalt, liefe er UNGESCHÜTZT.
 * Deshalb erzwingen beide Validierer UND der Player exakt dieses Muster;
 * Dokumente ohne diesen Anfang werden nicht gerendert.
 */
export const PLANSPIEL_DOKUMENT_PRAEFIX =
  /^\uFEFF?\s*<!doctype\s+html\s*>\s*<html(?:\s[^>]*)?>\s*<head(?:\s[^>]*)?>/i;

/**
 * Textmuster, die in Planspiel-HTML nicht vorkommen dürfen – Planspiele
 * sind vollständig eigenständig (keine externen Skripte, Frames oder
 * Netzwerkzugriffe). Die Prüfung läuft über den ROHEN Dateitext, also
 * bewusst auch über Kommentare und Strings (streng statt schlau); die
 * harte Grenze zur Laufzeit bleibt unabhängig davon die per CSP und
 * sandbox-Attribut gekapselte Ausführung im Player.
 */
export const PLANSPIEL_VERBOTENE_MUSTER: ReadonlyArray<{
  muster: RegExp;
  grund: string;
}> = [
  { muster: /<script[^>]*\ssrc\s*=/i, grund: "externes Skript (<script src=…>)" },
  { muster: /<link[\s/>]/i, grund: "<link>-Element (externe Stylesheets/Ressourcen)" },
  { muster: /<i?frame/i, grund: "eingebettete Frames" },
  { muster: /<object[\s/>]|<embed[\s/>]|<applet[\s/>]/i, grund: "<object>/<embed>/<applet>" },
  { muster: /<base[\s/>]/i, grund: "<base>-Element (verbiegt relative Pfade)" },
  { muster: /<meta[^>]*http-equiv/i, grund: "eigene http-equiv-Meta-Angabe (z. B. Refresh/CSP)" },
  { muster: /\bfetch\s*\(/i, grund: "fetch()-Netzwerkzugriff" },
  { muster: /XMLHttpRequest/i, grund: "XMLHttpRequest-Netzwerkzugriff" },
  { muster: /WebSocket/i, grund: "WebSocket-Verbindung" },
  { muster: /EventSource/i, grund: "EventSource-Verbindung" },
  { muster: /sendBeacon/i, grund: "sendBeacon-Netzwerkzugriff" },
  { muster: /\bimport\s*\(/i, grund: "dynamischer import()" },
  {
    // Statischer ES-Import einer externen Quelle: "import x from '//…'",
    // "import '//…'". Bewusst nur mit externer URL im String – sonst
    // träfe die Regel auch Prosa wie "Daten aus einer Datei importieren".
    muster: /\bimport\b[^;\n]{0,200}["'`](?:https?:)?\/\//i,
    grund: "statischer ES-Import einer externen Quelle",
  },
  { muster: /@import/i, grund: "@import in CSS" },
  { muster: /\burl\(\s*["']?\s*(?:https?:)?\/\//i, grund: "externe url(…)-Ressource in CSS" },
  {
    muster: /\b(?:src|href|action|poster|srcset|formaction)\s*=\s*["']?\s*(?:https?:)?\/\//i,
    grund: "externer Verweis (http(s):// bzw. //…)",
  },
  { muster: /location\s*\.\s*(?:href|assign|replace)/i, grund: "Navigation per location" },
  { muster: /window\s*\.\s*open\s*\(/i, grund: "window.open()" },
];

/**
 * Eingebettetes Lernspiel (interaktives HTML/JS), NEU seit 31.7.2026.
 * Die Spiel-Datei liegt als eigenständiges HTML-Dokument im Modulordner
 * (nicht als Roh-HTML im JSON – das bleibt verboten). Der Player führt
 * sie ausschliesslich in einem strikt gekapselten sandbox-iframe aus
 * (allow-scripts OHNE allow-same-origin, CSP ohne jeden Netzzugriff)
 * und NUR in Modulen aus dem geprüften Content-Repo – in lokal
 * eingeladenen oder per module-share empfangenen Modulen lehnt der
 * Player den Block ab (das Modul selbst bleibt gültig und spielbar).
 * Kein prüfender Block, keine Punkte: Das Planspiel zählt als
 * bearbeitet, sobald es geöffnet wurde; die inhaltliche Auswertung
 * übernimmt ein nachgelagertes Quiz im selben Modul.
 */
export const planspielBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("planspiel"),
    /**
     * Die Spiel-Datei: "/content/<modul>/<datei>.html" – dieselbe
     * Ablage-Konvention wie Bilder und moduleigene Videos. Die
     * Validierer prüfen zusätzlich Modulzugehörigkeit, Existenz,
     * Grösse, Dokumentanfang und die verbotenen Muster (oben).
     */
    datei: z.string().regex(PLANSPIEL_DATEI_MUSTER, {
      message:
        'Planspiel: "datei" muss ein moduleigener Pfad der Form ' +
        '"/content/<modul>/<datei>.html" sein.',
    }),
    /** Optionale Einleitung/Spielanleitung über dem Spiel, Markdown erlaubt. */
    intro: markdown.optional(),
    /** Höhe des Spielbereichs in CSS-Pixeln (Standard 480). */
    hoehe: z.number().int().min(240).max(1200).default(480),
  })
  .superRefine((block, ctx) => {
    // Stabile id ist Pflicht (wie bei Lückentext/Quiz): Der Lernstand
    // merkt sich pro Block, dass das Spiel geöffnet wurde.
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Planspiel: Der Block braucht eine stabile "id" (z. B. "spiel1"), damit der Bearbeitet-Stand bei Content-Änderungen korrekt bleibt.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Planspiel: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }
  });

// --- Simulation (verzweigter Rollenspiel-Dialog) ----------------------------

/** Eine Antwortoption der Lernenden in einem Dialogknoten. */
export const simulationAntwortSchema = z.strictObject({
  /** Antwort-Text, den die Lernenden wählen (reiner Text). */
  text: z.string().min(1),
  /** id des Knotens, zu dem diese Antwort führt. */
  weiter: z.string().min(1),
});

/**
 * Ein Dialogknoten: Die Figur spricht (`text`), die Lernenden wählen aus
 * 2–4 Antworten. Ein Knoten OHNE `antworten` ist ein Endpunkt; nur dort
 * darf eine `auswertung` stehen (Rückblick auf den gewählten Weg).
 */
export const simulationKnotenSchema = z.strictObject({
  /** Knoten-id, Ziel der `weiter`-Verweise (nur innerhalb des Blocks). */
  id: z.string().min(1),
  /** Was die Figur an dieser Stelle sagt, Markdown erlaubt. */
  text: markdown,
  /** 2–4 Antwortoptionen; fehlt das Feld, ist der Knoten ein Endpunkt. */
  antworten: z.array(simulationAntwortSchema).min(2).max(4).optional(),
  /** Nur Endknoten: Auswertung, die beim Erreichen angezeigt wird (Markdown). */
  auswertung: markdown.optional(),
});

/**
 * Verzweigter Rollenspiel-Dialog, NEU seit 31.7.2026 (löst den früheren
 * Zukunftstyp "simulation" ab). Vollständig als Skript definiert – der
 * Block funktioniert komplett ohne KI und ohne Netz; ist auf einem Gerät
 * der Assistent (Cate) aktiviert, darf die Figur ZUSÄTZLICH freie
 * Rückfragen beantworten, streng im Rahmen von `figur.rollenPrompt` und
 * ohne den skriptierten Pfad zu verändern. Zentrale Aussagen bleiben
 * immer skriptiert.
 *
 * Prüfend ist der Block NUR mit `abschlussfrage` (auswertbare Frage nach
 * dem Erreichen eines Endpunkts – zählt dann wie ein Quiz in Abschluss,
 * Punkte und Lernrate); ohne Abschlussfrage zählt er als bearbeitet,
 * sobald ein Endpunkt erreicht wurde.
 */
export const simulationBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("simulation"),
    /** Optionale Einleitung (Szenario, Auftrag), Markdown erlaubt. */
    intro: markdown.optional(),
    figur: z.strictObject({
      /** Name der Figur, z. B. "Frau Keller, Gemeindepräsidentin". */
      name: z.string().min(1).max(80),
      /** Kurzbeschreibung der Rolle – wird den Lernenden angezeigt. */
      rolle: z.string().min(1).max(200).optional(),
      /**
       * Rollenanweisung NUR für die optionale KI-Anreicherung (wird nie
       * angezeigt): Wer ist die Figur, was weiss sie, wie spricht sie,
       * was verrät sie nicht? Ohne aktivierten Assistenten ohne Wirkung.
       */
      rollenPrompt: z.string().min(1).max(2000).optional(),
    }),
    /** id des Startknotens. */
    start: z.string().min(1),
    knoten: z.array(simulationKnotenSchema).min(1).max(200),
    /**
     * Optionale auswertbare Abschlussfrage (gleiche Fragetypen wie im
     * Quiz, id Pflicht): erscheint nach dem Erreichen eines Endpunkts
     * und macht den Block PRÜFEND (istPruefenderBlock).
     */
    abschlussfrage: questionSchema.optional(),
  })
  .superRefine((block, ctx) => {
    // Stabile id ist Pflicht (wie bei Lückentext/Quiz): Lernstand und
    // Punktevergabe speichern Ergebnisse pro Block.
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Simulation: Der Block braucht eine stabile "id" (z. B. "sim1"), damit Lernstand und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Simulation: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }

    // Knoten-ids müssen eindeutig sein – sonst sind Verweise mehrdeutig.
    const knotenIds = new Set<string>();
    let verweisFehler = false;
    block.knoten.forEach((k, i) => {
      if (knotenIds.has(k.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["knoten", i, "id"],
          message: `Simulation: Knoten-id "${k.id}" ist mehrfach vergeben.`,
        });
        verweisFehler = true;
      }
      knotenIds.add(k.id);
    });

    if (!knotenIds.has(block.start)) {
      ctx.addIssue({
        code: "custom",
        path: ["start"],
        message: `Simulation: Startknoten "${block.start}" existiert nicht in "knoten".`,
      });
      verweisFehler = true;
    }

    block.knoten.forEach((k, i) => {
      k.antworten?.forEach((antwort, j) => {
        if (!knotenIds.has(antwort.weiter)) {
          ctx.addIssue({
            code: "custom",
            path: ["knoten", i, "antworten", j, "weiter"],
            message: `Simulation: Antwort verweist auf unbekannten Knoten "${antwort.weiter}".`,
          });
          verweisFehler = true;
        }
      });
      if (k.auswertung !== undefined && k.antworten !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["knoten", i, "auswertung"],
          message:
            'Simulation: "auswertung" ist nur auf Endknoten erlaubt (Knoten ohne "antworten").',
        });
      }
    });

    // Erreichbarkeit nur prüfen, wenn die Verweise in sich stimmen –
    // sonst gäbe es verwirrende Folgefehler zum selben Grundproblem.
    if (!verweisFehler) {
      const erreicht = new Set<string>([block.start]);
      const offen = [block.start];
      const proId = new Map(block.knoten.map((k) => [k.id, k]));
      while (offen.length > 0) {
        const aktuell = proId.get(offen.pop()!);
        for (const antwort of aktuell?.antworten ?? []) {
          if (!erreicht.has(antwort.weiter)) {
            erreicht.add(antwort.weiter);
            offen.push(antwort.weiter);
          }
        }
      }
      block.knoten.forEach((k, i) => {
        if (!erreicht.has(k.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["knoten", i],
            message: `Simulation: Knoten "${k.id}" ist vom Start aus nicht erreichbar.`,
          });
        }
      });
      const endErreichbar = block.knoten.some(
        (k) => erreicht.has(k.id) && k.antworten === undefined,
      );
      if (!endErreichbar) {
        ctx.addIssue({
          code: "custom",
          path: ["knoten"],
          message:
            "Simulation: Vom Start aus ist kein Endpunkt (Knoten ohne \"antworten\") erreichbar – das Gespräch könnte nie enden.",
        });
      }
    }

    // Die Abschlussfrage braucht eine id (Statistik pro Frage) – wie
    // Quizfragen, dort erzwingen es die Validierer.
    if (block.abschlussfrage && !block.abschlussfrage.id) {
      ctx.addIssue({
        code: "custom",
        path: ["abschlussfrage", "id"],
        message:
          'Simulation: Die Abschlussfrage braucht eine stabile "id" (z. B. "sim1-frage").',
      });
    }
  });

export const knownBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  tasksBlockSchema,
  lueckentextBlockSchema,
  quizBlockSchema,
  planspielBlockSchema,
  simulationBlockSchema,
]);

export const KNOWN_BLOCK_TYPES = [
  "text",
  "image",
  "video",
  "tasks",
  "lueckentext",
  "quiz",
  "planspiel",
  "simulation",
] as const;

/**
 * Zukunfts-Blöcke ("chat", …): jedes Objekt mit einem `type`,
 * der (noch) nicht implementiert ist. Wird vom Player als Platzhalter
 * angezeigt statt den Build zu brechen.
 */
export const unknownBlockSchema = z
  .looseObject({ type: z.string().min(1) })
  .refine(
    (b) => !(KNOWN_BLOCK_TYPES as readonly string[]).includes(b.type),
    { message: "Bekannter Blocktyp hat die Detail-Validierung nicht bestanden." },
  );

export const blockSchema = z.union([knownBlockSchema, unknownBlockSchema]);

// ---------------------------------------------------------------------------
// Modul
// ---------------------------------------------------------------------------

/** Alle Modulfelder ausser schemaVersion (und dem V1-Sonderfeld quiz) –
 *  gemeinsame Basis für moduleSchema (aktuell) und moduleV1Schema. */
const modulBasis = {
  /** Eindeutig, nur Kleinbuchstaben/Ziffern/Bindestriche. Muss dem Ordnernamen entsprechen. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  /** Kurzbeschreibung für den Katalog (1–3 Sätze). */
  description: z.string().min(1),
  /** Fachkürzel nach Lehrplan 21, z. B. "RZG", "NT", "D", "MA". */
  subject: z.string().min(1),
  /** Ausgeschriebener Fachname, z. B. "Räume, Zeiten, Gesellschaften". */
  subjectName: z.string().optional(),
  /** Lehrplan-21-Zyklus: 1 (KG–2. Kl.), 2 (3.–6. Kl.), 3 (Sek I, 7.–9. Kl.). */
  cycle: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Freitext-Angabe der Stufe, z. B. "7.–9. Klasse (Sek I)". */
  grades: z.string().optional(),
  /**
   * Lernreihenfolge innerhalb des Fachs bzw. der Einheit (1 = zuerst).
   * Der Katalog sortiert Module einer Gruppe aufsteigend danach – die
   * didaktische Reihenfolge hängt so an den Metadaten, nicht am
   * Dateinamen. Module ohne Wert folgen alphabetisch nach Titel.
   */
  sequenz: z.number().int().positive().optional(),
  /**
   * Themengruppe/Einheit, wenn mehrere Module eine Reihe bilden (z. B.
   * "Themenblock A: Grundbegriffe und Wirtschaftskreislauf"). Module mit
   * identischem Wert fasst der Katalog sichtbar als Lernpfad zusammen.
   */
  einheit: z.string().trim().min(1).max(120).optional(),
  /** Sprache des Moduls als BCP-47-Code. */
  language: z.string().default("de"),
  /**
   * Lehrplan-Referenzrahmen, auf den sich cycle/competencies beziehen –
   * z. B. "lehrplan21". Explizites Feld, damit die Plattform
   * lehrplanneutral bleibt und später weitere Lehrpläne (andere Kantone,
   * Länder) nebeneinander existieren können.
   */
  curriculum: z.string().min(1).default("lehrplan21"),
  /** Lehrplan-21-Kompetenzen, auf die das Modul einzahlt. */
  competencies: z.array(competencySchema).default([]),
  /** Lernziele aus Sicht der Lernenden ("Ich kann …"). */
  learningObjectives: z.array(z.string().min(1)).min(1),
  durationMinutes: z.number().int().positive().optional(),
  difficulty: z.enum(["leicht", "mittel", "anspruchsvoll"]).optional(),
  keywords: z.array(z.string().min(1)).default([]),
  authors: z.array(z.string().min(1)).default([]),
  /** Verwendete Quellen/Materialien (werden im Modul ausgewiesen). */
  sources: z.array(sourceSchema).default([]),
  /**
   * Lizenz der Modulinhalte – nur die bekannten Schreibweisen, damit die
   * Modul-Fusszeile immer auf den Lizenztext verlinken kann und sich
   * keine Schreibvarianten («CC-BY-SA», «ccbysa4.0») einschleichen.
   * Neue Lizenz nötig? Enum hier UND licenseUrl() in content/links.ts
   * ergänzen.
   */
  license: z
    .enum(["CC BY-SA 4.0", "CC BY 4.0", "CC BY-SA 3.0", "CC0", "CC0 1.0"])
    .optional(),
  /** Slugs von Modulen, die inhaltlich vorausgesetzt werden. */
  requires: z.array(z.string()).default([]),
  /** Inhaltsblöcke in Anzeigereihenfolge (Quiz: als Block, siehe quizBlockSchema). */
  blocks: z.array(blockSchema).min(1),
};

export const moduleSchema = z.strictObject({
  /** Muss SCHEMA_VERSION entsprechen; ältere Dateien liest parseModulDatei. */
  schemaVersion: z.literal(SCHEMA_VERSION),
  ...modulBasis,
});

/**
 * Version 1 kannte den Blocktyp "quiz" nicht – ein Block mit diesem type
 * war dort ein gültiger ZUKUNFTS-Block (Platzhalter im Player). Damit
 * solche Dateien gültig bleiben, akzeptiert der V1-Zweig ihn weiterhin
 * lose; die Migration macht daraus einen echten Quizblock (wenn die
 * Form passt) oder erhält das Platzhalter-Verhalten (Typ "quiz-v1").
 */
const quizArtigerV1Block = z.looseObject({ type: z.literal("quiz") });

/**
 * Gleiches Prinzip für die am 31.7.2026 implementierten Typen
 * "simulation" und "planspiel": In Version-1-Dateien waren Blöcke mit
 * diesen Typen gültige ZUKUNFTS-Blöcke beliebiger Form (Platzhalter im
 * Player). Damit solche Dateien gültig bleiben, akzeptiert der V1-Zweig
 * sie weiterhin lose; die Migration erhält das Platzhalter-Verhalten
 * (Umbenennung in "…-v1"), wenn die Form nicht zum echten Block passt.
 */
const zukunftsArtigerV1Block = z.looseObject({
  type: z.enum(["simulation", "planspiel"]),
});

/**
 * Schema-Version 1 (bis Juli 2026): identisch bis auf das
 * Quiz-Sonderfeld auf Modulebene. Bestehende Dateien bleiben gültig –
 * parseModulDatei migriert sie beim Einlesen verlustfrei auf Version 2.
 */
export const moduleV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  ...modulBasis,
  blocks: z
    .array(z.union([blockSchema, quizArtigerV1Block, zukunftsArtigerV1Block]))
    .min(1),
  /** Optionales Abschlussquiz mit automatischer Auswertung (nur Version 1). */
  quiz: quizSchema.optional(),
});

// ---------------------------------------------------------------------------
// Abgeleitete TypeScript-Typen
// ---------------------------------------------------------------------------

export type Competency = z.infer<typeof competencySchema>;
export type TextBlock = z.infer<typeof textBlockSchema>;
export type ImageBlock = z.infer<typeof imageBlockSchema>;
export type VideoBlock = z.infer<typeof videoBlockSchema>;
export type Task = z.infer<typeof taskSchema>;
export type TasksBlock = z.infer<typeof tasksBlockSchema>;
export type Luecke = z.infer<typeof lueckeSchema>;
export type LueckentextBlock = z.infer<typeof lueckentextBlockSchema>;
export type PlanspielBlock = z.infer<typeof planspielBlockSchema>;
export type SimulationAntwort = z.infer<typeof simulationAntwortSchema>;
export type SimulationKnoten = z.infer<typeof simulationKnotenSchema>;
export type SimulationBlock = z.infer<typeof simulationBlockSchema>;
export type KnownBlock = z.infer<typeof knownBlockSchema>;
export type UnknownBlock = z.infer<typeof unknownBlockSchema>;
export type Block = z.infer<typeof blockSchema>;
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type QuizBlock = z.infer<typeof quizBlockSchema>;
export type LearningModule = z.infer<typeof moduleSchema>;
export type LearningModuleV1 = z.infer<typeof moduleV1Schema>;

export function isKnownBlock(block: Block): block is KnownBlock {
  return (KNOWN_BLOCK_TYPES as readonly string[]).includes(block.type);
}

// ---------------------------------------------------------------------------
// Versioniertes Einlesen (v1 → v2 verlustfrei)
// ---------------------------------------------------------------------------

/**
 * Version-1-Modul verlustfrei auf Version 2 heben: Das Quiz-Sonderfeld
 * wird zum LETZTEN Block mit der id "quiz" – exakt die Position, an der
 * der Player es bisher gerendert hat, und exakt der Schlüssel, unter dem
 * der Lernstand die Ergebnisse führt (pruefSchluessel v1). Fortschritt,
 * Reports und Coin-Vergabe bleiben dadurch unverändert gültig; das
 * veraltete passingScorePercent entfällt ersatzlos (seit Juli 2026 ohne
 * Wirkung).
 */
export function migriereModulV1(alt: LearningModuleV1): LearningModule {
  const { quiz, ...rest } = alt;
  const bloecke: Block[] = rest.blocks.map((block) => {
    // V1-Blöcke mit type "quiz" waren Zukunfts-Platzhalter: Passt die
    // Form zufällig zum echten Quizblock, wird er einer – sonst bleibt
    // das Platzhalter-Verhalten erhalten (Typ "quiz-v1" ist unbekannt).
    if (block.type === "quiz" && !quizBlockSchema.safeParse(block).success) {
      return { ...block, type: "quiz-v1" };
    }
    // Dasselbe für die früheren Zukunftstypen "simulation"/"planspiel"
    // (seit 31.7.2026 echte Blöcke): Andersförmige V1-Blöcke behalten
    // ihr Platzhalter-Verhalten unter dem unbekannten Typ "…-v1".
    if (
      (block.type === "simulation" || block.type === "planspiel") &&
      !knownBlockSchema.safeParse(block).success
    ) {
      return { ...block, type: `${block.type}-v1` };
    }
    // Die id "quiz" ist der reservierte Lernstand-Schlüssel des
    // migrierten Abschlussquiz – V1 erlaubte sie als blossen Anker auf
    // anderen Blöcken/Aufgaben; solche Anker werden entfernt (sie waren
    // nie Lernstand-Schlüssel), sonst kollidierte die ID-Eindeutigkeit.
    if (quiz && block.type !== "quiz") {
      const kopie = { ...(block as Block & { id?: string }) };
      if (kopie.id === "quiz") delete kopie.id;
      if (kopie.type === "tasks") {
        const tb = kopie as TasksBlock;
        tb.tasks = tb.tasks.map((aufgabe) => {
          if (aufgabe.id !== "quiz") return aufgabe;
          const ohne = { ...aufgabe };
          delete ohne.id;
          return ohne;
        });
      }
      return kopie as Block;
    }
    return block as Block;
  });
  const blocks = quiz
    ? [
        ...bloecke,
        {
          type: "quiz" as const,
          id: "quiz",
          ...(quiz.title !== undefined ? { title: quiz.title } : {}),
          questions: quiz.questions,
        },
      ]
    : bloecke;
  return { ...rest, schemaVersion: SCHEMA_VERSION, blocks };
}

/**
 * EINZIGER Einstiegspunkt zum Einlesen einer Moduldatei: versteht die
 * aktuelle Version UND Version 1 (automatisch migriert) und liefert
 * immer die aktuelle Form. Loader (Build), Laufzeit-Import lokaler
 * Module und die Content-Repo-Validierung nutzen alle diese Funktion.
 */
export function parseModulDatei(
  raw: unknown,
):
  | { success: true; data: LearningModule }
  | { success: false; error: z.ZodError } {
  const version = (raw as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version === 1) {
    const alt = moduleV1Schema.safeParse(raw);
    return alt.success
      ? { success: true, data: migriereModulV1(alt.data) }
      : { success: false, error: alt.error };
  }
  const neu = moduleSchema.safeParse(raw);
  return neu.success
    ? { success: true, data: neu.data }
    : { success: false, error: neu.error };
}

// ---------------------------------------------------------------------------
// Prüfende Blöcke und Modulabschluss
// ---------------------------------------------------------------------------

/**
 * Konzept «prüfender Block» (ergänzt Juli 2026): Inhaltsblöcke mit
 * automatischer Auswertung. Seit Schema-Version 2 gehört auch das Quiz
 * dazu (regulärer Block, beliebig oft) – ein Modul gilt als BESTANDEN,
 * wenn ALLE prüfenden Blöcke 100 % erreicht haben (beliebig viele
 * Wiederholungen). Beim ersten Bestehen gibt es die Modul-Coins –
 * einmal PRO MODUL, nicht pro Quiz. Ein Modul braucht kein Quiz; ohne
 * jedes prüfende Element gilt es nach dem Durchsehen der Inhalte als
 * abgeschlossen (reines Lesemodul, bewusst ohne Coins). Punkte gibt es
 * unabhängig davon für jeden Aufgabenblock einzeln. Künftige
 * auto-geprüfte Aufgabentypen werden hier eingetragen und zählen dann
 * automatisch in Abschluss, Punkte und Lernrate.
 *
 * Seit 31.7.2026 entscheidet bei EINEM Typ der Inhalt: Ein
 * simulation-Block ist genau dann prüfend, wenn er eine auswertbare
 * `abschlussfrage` trägt – ohne sie zählt er (wie das Planspiel) nur
 * als bearbeitet. istPruefenderBlock ist deshalb die einzige
 * massgebliche Abfrage; die Typliste allein genügt nicht mehr.
 */
export const PRUEFENDE_BLOCK_TYPES = ["lueckentext", "quiz"] as const;

export function istPruefenderBlock(block: Block): boolean {
  if (isKnownBlock(block) && block.type === "simulation") {
    return block.abschlussfrage !== undefined;
  }
  return (PRUEFENDE_BLOCK_TYPES as readonly string[]).includes(block.type);
}

/**
 * Schlüssel aller prüfenden Elemente eines Moduls: die ids der
 * prüfenden Blöcke (Lückentexte, Quizblöcke und Simulationen mit
 * Abschlussfrage). Die id "quiz" ist der
 * historische Schlüssel des früheren Abschlussquiz und bleibt für
 * QUIZBLÖCKE erlaubt (migrierte Module behalten so ihren Lernstand);
 * andere prüfende Blöcke dürfen sie nicht tragen. Der Lernstand hält
 * den Bestehens-Stand je Schlüssel und leitet daraus den Modulabschluss
 * ab.
 */
export function pruefSchluessel(module: LearningModule): string[] {
  return module.blocks
    .filter(istPruefenderBlock)
    .map((block) =>
      "id" in block && typeof block.id === "string" ? block.id : null,
    )
    .filter((id): id is string => id !== null);
}

/** Anzeigenamen bekannter Lehrpläne (Fallback: Rohwert). */
const CURRICULUM_LABELS: Record<string, string> = {
  lehrplan21: "Lehrplan 21",
};

export function curriculumLabel(curriculum: string): string {
  return CURRICULUM_LABELS[curriculum] ?? curriculum;
}

import { z } from "zod";

/**
 * EveryCate Content-Schema (Version 1) – maschinenlesbare Referenz.
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

export const SCHEMA_VERSION = 1;

/** String, in dem Markdown erlaubt ist (GitHub Flavored Markdown). */
const markdown = z.string().min(1);

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
    /** Für provider "url": direkte Video-Datei-URL (mp4/webm). */
    url: z.string().url().optional(),
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
          message: 'Video-Block: provider "url" braucht eine Video-Datei-URL in "url".',
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

export const knownBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  tasksBlockSchema,
  lueckentextBlockSchema,
]);

export const KNOWN_BLOCK_TYPES = [
  "text",
  "image",
  "video",
  "tasks",
  "lueckentext",
] as const;

/**
 * Zukunfts-Blöcke ("simulation", "chat", …): jedes Objekt mit einem `type`,
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
// Quiz
// ---------------------------------------------------------------------------

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

export const quizSchema = z.strictObject({
  title: z.string().optional(),
  /** Ab wie viel Prozent der Punkte gilt das Quiz als bestanden (Standard 60). */
  passingScorePercent: z.number().min(0).max(100).default(60),
  questions: z.array(questionSchema).min(1),
});

// ---------------------------------------------------------------------------
// Modul
// ---------------------------------------------------------------------------

export const moduleSchema = z.strictObject({
  /** Muss SCHEMA_VERSION entsprechen; erlaubt spätere Migrationen. */
  schemaVersion: z.literal(SCHEMA_VERSION),
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
  /** Inhaltsblöcke in Anzeigereihenfolge. */
  blocks: z.array(blockSchema).min(1),
  /** Optionales Abschlussquiz mit automatischer Auswertung. */
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
export type KnownBlock = z.infer<typeof knownBlockSchema>;
export type UnknownBlock = z.infer<typeof unknownBlockSchema>;
export type Block = z.infer<typeof blockSchema>;
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type Question = z.infer<typeof questionSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type LearningModule = z.infer<typeof moduleSchema>;

export function isKnownBlock(block: Block): block is KnownBlock {
  return (KNOWN_BLOCK_TYPES as readonly string[]).includes(block.type);
}

/** Anzeigenamen bekannter Lehrpläne (Fallback: Rohwert). */
const CURRICULUM_LABELS: Record<string, string> = {
  lehrplan21: "Lehrplan 21",
};

export function curriculumLabel(curriculum: string): string {
  return CURRICULUM_LABELS[curriculum] ?? curriculum;
}

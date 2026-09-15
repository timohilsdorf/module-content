import { z } from "zod";

/**
 * EveryCate Content-Schema (Version 3) – maschinenlesbare Referenz.
 *
 * ⚠️ SYNCHRON HALTEN: Diese Datei ist eine Kopie von
 * `src/lib/content/schema.ts` aus dem Plattform-Repository (everycate).
 * Format-Änderungen müssen in BEIDEN Dateien landen – zuerst in der
 * Plattform (dort erzwingt der Build das Schema), dann hier. Ab dem
 * SYNC-BEGINN-Marker müssen beide Dateien byteidentisch sein. Geprüft
 * wird das in der CI des PLATTFORM-Repos («Schema-Drift prüfen» in
 * dessen validate.yml vergleicht seine Kopie bei jedem Push/PR gegen
 * den main-Stand DIESES Repos); die CI hier kann das nicht – das
 * Plattform-Repo ist privat und dieses Repo hält bewusst keinen
 * Zugriffs-Token darauf.
 *
 * Erweiterbarkeit: Unbekannte Blocktypen (z. B. künftige "chat"-Blöcke)
 * sind gültig, werden aber im Player mit einem Platzhalter gerendert. So
 * können Inhalte schon heute Blöcke für künftige Player-Versionen
 * enthalten.
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
 * - 2, additive Ergänzung (1.8.2026, KEIN Versionswechsel): dritter
 *   Lückentext-Modus `satzbau` (vorgegebene Bausteine in die richtige
 *   Reihenfolge bringen; nutzt `bausteine`/`alternativen` statt
 *   `text`/`luecken` – ACHTUNG: ältere Player lehnen satzbau-Blöcke ab,
 *   solche Module erst nach dem Plattform-Deploy einreichen), neuer
 *   prüfender Blocktyp `zuordnung` (Paare zuordnen, Elemente Text oder
 *   Bild) und neuer Blocktyp `audio` (moduleigene Hördatei mit
 *   Pflicht-Transkript, nicht prüfend). Ausserdem festgehalten:
 *   `language` ist die ZIELSPRACHE des Moduls – bei Fremdsprachenmodulen
 *   (z. B. "en") antwortet der KI-Lernpartner in dieser Sprache.
 *   Bestehende Dateien bleiben unverändert gültig; für die neuen
 *   BLOCKTYPEN zeigen ältere Player Platzhalter.
 * - 2, additive Ergänzung (2.8.2026, KEIN Versionswechsel): Zuordnung
 *   wird rein per Antippen bedient (beide Seiten in beliebiger
 *   Reihenfolge, Paare sichtbar verbunden und auflösbar) und darf
 *   zusätzlich LINKE Ablenker tragen (`ablenkerLinks`). Audio:
 *   `transcript` ist optional (für Höraufgaben, bei denen das Gehörte
 *   selbst eingetippt wird; `transkriptAnzeigen` steuert die Anzeige,
 *   Standard true) und als Alternative zur Datei gibt es die
 *   Vorlese-Variante `vorleseText` + `vorleseSprache` (Browser-Stimme,
 *   nur lokale Stimmen; die Datei bleibt der bevorzugte Weg). ACHTUNG:
 *   ältere Player lehnen Module mit den neuen Feldern bzw. ohne
 *   `transcript` ab – solche Module erst nach dem Plattform-Deploy
 *   einreichen.
 * - 2, additive Ergänzung (3.8.2026, KEIN Versionswechsel – reine
 *   LOCKERUNG, bestehende Dateien bleiben gültig): Audio-Blöcke dürfen
 *   `src` UND `vorleseText` gleichzeitig tragen. Der Player spielt
 *   dann die Datei (Vorrang); der `vorleseText` ist das Backup,
 *   solange (noch) keine Datei hinterlegt ist – so lässt sich ein
 *   Modul zuerst mit Browser-Vorlesen ausliefern und die Aufnahme
 *   später ergänzen, ohne die Aufgaben zu ändern. Mit `src` bleibt
 *   `transcript` erlaubt; NUR ohne `src` ist es weiterhin verboten
 *   (der `vorleseText` ist dort bereits der Text).
 * - 2, Klarstellung (3.8.2026, KEIN Versionswechsel – reine
 *   ABSPIEL-Reihenfolge im Player, die Validierung bleibt unverändert):
 *   Der Vorrang der Lockerung vom selben Tag dreht sich um. Bei
 *   Audio-Blöcken mit `vorleseText` ist das Browser-Vorlesen der
 *   BEVORZUGTE Weg, sobald eine passende Stimme der Zielsprache da ist
 *   – Lernende wählen unter «Cates Stimmen» zwischen Stimmen und
 *   Aussprachevarianten. Die hinterlegte Datei (`src`) ist die
 *   RÜCKFALLEBENE (keine passende Stimme, oder die Vorlese-Ausgabe
 *   schlägt fehl); zuletzt greift wie bisher der Text bzw. bei
 *   verborgenem Transkript der Hinweis auf «Cates Stimmen».
 * - 2, Vereinfachung (5.8.2026, KEIN Versionswechsel, aber VERENGUNG):
 *   Zuordnung OHNE Ablenker – die Felder `ablenker` und `ablenkerLinks`
 *   sind ENTFERNT (strictObject lehnt sie ab). Begründung: Geprüft
 *   werden kann erst, wenn ALLES verbunden ist – Ablenker liessen sich
 *   so gar nicht «unbenutzt» lassen und erzwangen falsche Paare. Jedes
 *   linke Element hat genau ein rechtes Gegenstück, beide Spalten sind
 *   gleich lang. ACHTUNG Rollout: Bestehende Module mit Ablenkern
 *   ZUERST bereinigen und im Content-Repo mergen, DANN die Plattform
 *   deployen (umgekehrt scheitert der Plattform-Build am alten
 *   Content); ältere Player zeigen bereinigte Module weiter an – die
 *   Felder waren dort optional.
 * - 2, additive Ergänzung (9.8.2026, KEIN Versionswechsel): zwei neue
 *   PRÜFENDE Blocktypen. `numerisch` = Zahleneingabe mit Toleranz
 *   (absolut oder prozentual), gleichwertigen Schreibweisen
 *   (Dezimalpunkt/-komma, Bruch, Prozent – parseZahlwert in dieser
 *   Datei ist die EINE Format-Logik), optionaler EINHEIT mit
 *   Umrechnung gleichwertiger Einheiten (mathjs, lebt in der
 *   Plattform) und mehreren akzeptierten Antworten. `achse` =
 *   Elemente (Zahlen, Jahreszahlen, Textkarten) auf einer oder zwei
 *   Achsen platzieren – Zahlenstrahl, Zeitstrahl, Koordinatensystem;
 *   Achsen numerisch oder mit Textkategorien; Wertung nach Position
 *   (Toleranz), Reihenfolge oder Kategorie (achseErgebnisse in dieser
 *   Datei); Darstellung über JSXGraph (Plattform). Zusätzlich ist
 *   Mathe-Notation ($…$, KaTeX) in allen Markdown-Feldern
 *   darstellbar. Bestehende Dateien bleiben gültig; ältere Player
 *   zeigen für beide neuen Typen einen Platzhalter.
 * - 2, additive Ergänzung (11.8.2026, KEIN Versionswechsel): neuer
 *   PRÜFENDER Blocktyp `term` – Eingabe eines mathematischen Terms,
 *   bei dem jede ÄQUIVALENTE UMFORMUNG als richtig gilt (2*(x+3) und
 *   2x+6 zählen gleich). Die Musterlösungen (`antworten`) stehen in
 *   mathjs-Schreibweise; die Äquivalenz prüft der Player mit mathjs
 *   (symbolische Vereinfachung der Differenz, ergänzt durch
 *   numerische Stichproben an festen Pseudozufallspunkten, wo die
 *   Vereinfachung nicht eindeutig entscheidet – Logik in der
 *   Plattform, src/lib/content/term.ts). Erlaubt sind Zahlen, die
 *   Operatoren + - * / ^, Klammern, die Funktionen aus
 *   TERM_ERLAUBTE_FUNKTIONEN und pi/e (Baum-Filter termBaumFehler in
 *   dieser Datei); syntaktisch ungültige EINGABEN werden nie als
 *   falsch gewertet, sondern blockieren das Prüfen mit einer
 *   Korrektur-Aufforderung. Bestehende Dateien bleiben gültig;
 *   ältere Player zeigen einen Platzhalter.
 * - 2, additive Ergänzung (11.8.2026, KEIN Versionswechsel):
 *   AUFGABEN-VARIANTEN für die Blocktypen lueckentext, zuordnung,
 *   numerisch und term. Ein Block darf neben seinem normalen Inhalt
 *   (= Variante A) eine Liste `varianten` mit weiteren, vollständig
 *   ausformulierten Fassungen tragen (B, C, … – ab der 27. AA, AB, …);
 *   der Player zieht beim Öffnen zufällig eine, «Wiederholen» zieht
 *   eine andere. Alle Fassungen stehen fertig in der Moduldatei
 *   (reine Daten, keine Formeln, kein Code); jede muss dieselbe
 *   Punktzahl ergeben wie der Hauptinhalt (der Lernstand bleibt pro
 *   BLOCK, die gezogene Fassung wird weder gespeichert noch
 *   übermittelt). BEWUSST ohne Varianten: tasks, quiz, simulation,
 *   planspiel (strictObject lehnt das Feld dort ab). ACHTUNG Rollout:
 *   Ältere Player lehnen Module MIT `varianten` hart ab (strictObject,
 *   kein Platzhalter) – solche Module erst NACH dem zugehörigen
 *   Plattform-Deploy einreichen; bestehende Dateien ohne Varianten
 *   bleiben unverändert gültig.
 * - 2, additive Ergänzung (11.8.2026, KEIN Versionswechsel): optionale
 *   Zuordnungstabelle `lehrplaene` auf Modulebene – pro
 *   Lehrplan-Kennung ("ch", "li", "de", "de-he" …, Format
 *   LEHRPLAN_KENNUNG_MUSTER, wählbar nur registrierte Kennungen aus
 *   LEHRPLAENE) das dort geltende Fach, die Stufe im Modell des
 *   Lehrplans (Zyklus 1–3 ODER Klassenstufen) und optionale
 *   Kompetenzverweise. DASSELBE Modul liegt so ohne Duplikat in
 *   mehreren Lehrplänen; fehlt ein Eintrag, erscheint das Modul bei
 *   dieser Lehrplan-Auswahl nicht. Die bisherigen Felder
 *   subject/cycle/curriculum/competencies bleiben Pflicht bzw.
 *   unverändert und wirken als Hauptzuordnung des Legacy-`curriculum`
 *   (lehrplanZuordnungen in dieser Datei migriert sie verlustfrei als
 *   impliziten Eintrag: "LiLe" → li [Regelfall im Repo], "lehrplan21"
 *   → ch; eine explizite Tabelle ersetzt die Migration vollständig). ACHTUNG Rollout wie beim satzbau: Das
 *   Modul-Schema ist strict – ÄLTERE Player lehnen Module MIT
 *   `lehrplaene` ab. Solche Module erst NACH dem zugehörigen
 *   Plattform-Deploy einreichen; Module ohne das Feld bleiben überall
 *   gültig.
 * - 2, Orthografie-Klarstellung (12.8.2026, KEIN Versionswechsel –
 *   Autoren-Konvention + Anzeige, die Validierung bleibt unverändert):
 *   Modulinhalte werden einheitlich in deutscher Rechtschreibung MIT ß
 *   verfasst («Straße», «groß»), damit dieselben Module auch unter
 *   deutschen/österreichischen Lehrplänen liegen können. Bei
 *   Lehrplänen mit ss-Orthografie (li, ch – Feld `orthografie` in
 *   LEHRPLAENE) ersetzt der Player in der ANZEIGE jedes ß durch ss,
 *   bewusst ohne Eigennamen-Ausnahme (amtliche Schweizer Praxis).
 *   Antwortvergleiche (istLueckeRichtig) falten ß/ss beidseitig –
 *   Lernende antworten mit jeder Tastatur in beiden Schreibweisen.
 * - 2, additive Ergänzung (13.8.2026, KEIN Versionswechsel):
 *   Lehrplan-Einträge dürfen statt einer Schulstufe die Stufe
 *   `selbststudium: true` tragen – für Module oberhalb der Schulzeit
 *   (z. B. das technische Demo-Modul). Der Katalog zeigt sie unter der
 *   eigenen Stufe «Selbststudium» NACH der höchsten Klassenstufe.
 *   Zugleich zeigt die Modulseite die Kompetenzverweise seither JE
 *   LEHRPLAN: Bei gewähltem Lehrplan erscheinen die `kompetenzen` des
 *   passenden lehrplaene-Eintrags (bzw. der impliziten Migration);
 *   fehlen sie für die Wahl, entfällt die Kompetenz-Zeile. ACHTUNG
 *   Rollout wie bei `lehrplaene`: strictObject – Module MIT
 *   `selbststudium` erst NACH dem Plattform-Deploy einreichen.
 * - 3 (14.8.2026): VEREINHEITLICHTE Lehrplan-Metadaten. Die sechs
 *   Top-Level-Felder subject/subjectName/cycle/grades/curriculum/
 *   competencies UND die Zuordnungstabelle `lehrplaene` sind ersetzt
 *   durch EIN Feld `curricula`: eine LISTE von Zuordnungen, je Eintrag
 *   mit Lehrplan-Kennung (`curriculum`), Fach (`subject`/`subjectName`),
 *   Stufe und Kompetenzverweisen (`competencies`, Code-Format frei).
 *   Die STUFE ist vereinheitlicht: Klassenstufen-ZAHLEN in `grades`
 *   (z. B. [9] oder [7, 8, 9]) – der Zyklus-Begriff entfällt, auch
 *   li/ch tragen Zahlen. Davor steht ein BEZEICHNER: das Standard-Wort
 *   je Lehrplan aus der Registry (`stufenWort`: «Stufe» bei li/ch,
 *   «Klasse» bei de/at; ein künftiger Hochschul-Lehrplan brächte
 *   «Semester» mit), per `gradesText` im Eintrag übersteuerbar – die
 *   Anzeige setzt beides zusammen («Stufe 7–9», «Klasse 9»). Module
 *   OHNE Klassenstufe (Material für Erwachsene, das Demo-Modul) tragen
 *   NUR `gradesText` (z. B. «Erwachsene»): der Bezeichner allein
 *   bildet die Stufe und erscheint im Stufen-Filter NACH allen
 *   Klassenstufen. Version-1- und Version-2-Dateien liest
 *   parseModulDatei weiterhin und migriert sie beim Einlesen
 *   verlustfrei (v1 → v2 → v3: implizite Zuordnung LiLe→li /
 *   lehrplan21→ch, Klassen-Zahlen aus dem alten Stufen-Freitext bzw.
 *   dem Zyklus, `selbststudium` → Bezeichner-Stufe) – wichtig für
 *   bereits gespeicherte LOKALE Module und alte module-share-
 *   Umschläge. Das Content-Repo nimmt per Validator-Policy nur noch
 *   Version 3 an. ACHTUNG Rollout: ÄLTERE Player lehnen
 *   Version-3-Dateien hart ab – Module erst NACH dem zugehörigen
 *   Plattform-Deploy einreichen.
 * - 3, additive Ergänzung (18.8.2026, KEIN Versionswechsel):
 *   ÜBERSETZUNGS-Felder. Am MASTER kennzeichnet `languageLearning: true`
 *   Sprachlernmodule (die Sprache ist dort Lerngegenstand – solche
 *   Module werden nie übersetzt). SPRACHFASSUNGEN sind eigene Dateien
 *   `module.<lang>.json` im selben Modulordner: vollgültige Module mit
 *   identischer Struktur (gleiche Block-/Frage-ids, gleiche Punkte –
 *   Lernstand, Reports und Coins bleiben EIN Modul), übersetzten
 *   Textfeldern und den Pflicht-Metafeldern `_hinweis` (sichtbare
 *   Warnung: automatisch erzeugt, nicht von Hand bearbeiten) und
 *   `derivedFrom` (Master-Sprache, Prüfsummen von Master/Hinweisen/
 *   sich selbst, Erzeugungs-Stempel). Die Kopplung Dateiname ↔
 *   Metafelder und die Strukturgleichheit erzwingt der Validator des
 *   Content-Repos; die Plattform liest Fassungen erst mit dem
 *   Anzeige-Paket. Bestehende Dateien bleiben unverändert gültig.
 *   ACHTUNG Rollout: ÄLTERE Plattform-Stände lehnen Master mit
 *   `languageLearning` ab (strictObject) – dieses Schema ZUERST
 *   deployen, erst danach den Content-PR mergen, der das Feld setzt.
 * - 3, additive Ergänzung (1.9.2026, KEIN Versionswechsel):
 *   TEILKOMPETENZEN. Jeder Inhaltsblock darf optional bis zu 8
 *   lehrplanUNabhängige Teilkompetenz-Kennungen tragen
 *   (`teilkompetenzen` in blockBase, Format TEILKOMPETENZ_ID_MUSTER:
 *   `<fachbereich>.<thema>.<verb-objekt>`), die benennen, worauf der
 *   Block einzahlt. Das Register der Kennungen (Namen de/en,
 *   Fachbereich) und ihr Mapping auf Lehrplan-Kompetenz-Codes leben im
 *   Content-Repo unter kompetenzen/ (teilkompetenzen.json +
 *   mapping.json); die Plattform leitet daraus zur LAUFZEIT die
 *   Kompetenz-Übersicht des Lehrer-Dashboards ab (Abdeckung +
 *   Sicherheit – nie gespeichert, nie übermittelt). Das Feld ist auf
 *   JEDEM Blocktyp gültig; auf Blöcken ohne Bearbeitet-Nachweis im
 *   Report (text, image, video, audio, planspiel, simulation ohne
 *   Abschlussfrage …) bleibt es (noch) wirkungslos – bewusst simpel,
 *   statt Typregeln zu pflegen. ACHTUNG Rollout wie beim satzbau:
 *   strictObject – ÄLTERE Player lehnen Module MIT dem Feld hart ab;
 *   solche Module erst NACH dem zugehörigen Plattform-Deploy
 *   einreichen. Bestehende Dateien bleiben unverändert gültig.
 */
export const SCHEMA_VERSION = 3;

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

// --- Lehrpläne (Mehrfach-Zuordnung eines Moduls, seit 11.8.2026) ------------

/**
 * Kennungs-Format der Lehrpläne: Länderkürzel, optional mit
 * Untergliederung(en) – "ch", "li", "de", "de-he" (Hessen), "ch-zh"
 * (Zürich). Das FORMAT erlaubt künftige Untergliederungen ohne Umbau;
 * WÄHLBAR ist eine Kennung erst, wenn sie in LEHRPLAENE registriert
 * ist (die Registry ist die eine Quelle für Validierer UND Plattform –
 * ein neuer Lehrplan ist eine neue Registry-Zeile plus Ländername im
 * i18n-Wörterbuch, kein Umbau).
 */
export const LEHRPLAN_KENNUNG_MUSTER = /^[a-z]{2}(-[a-z0-9]{2,8})*$/;

/**
 * Registrierte Lehrpläne. `lehrplanName` ist ein EIGENNAME
 * (sprachunabhängig, wie «Lehrplan 21»); der Ländername kommt aus dem
 * i18n-Wörterbuch der Plattform. `stufenWort` ist das Standard-Wort
 * VOR der Klassenzahl in der Stufen-Anzeige («Stufe 7–9», «Klasse 9»);
 * ein curricula-Eintrag kann es per `gradesText` übersteuern. Die
 * `flagge` hilft jüngeren Kindern, die noch nicht sicher lesen.
 * `orthografie` steuert
 * die ANZEIGE der Modulinhalte (seit 12.8.2026): Inhalte werden
 * einheitlich in deutscher Rechtschreibung MIT ß verfasst; bei
 * Lehrplänen mit "ss" (Schweiz/Liechtenstein) ersetzt der Player jedes
 * ß in der Anzeige durch ss – BEWUSST ohne Eigennamen-Ausnahme
 * (amtliche Schweizer Schreibpraxis ersetzt durchgehend). Die
 * umgekehrte Richtung ist nicht regelbasiert möglich und wird nie
 * versucht; hinterlegte Antworten vergleicht istLueckeRichtig
 * ß/ss-tolerant.
 */
export const LEHRPLAENE = [
  {
    kennung: "li",
    orthografie: "ss",
    flagge: "🇱🇮",
    lehrplanName: "Liechtensteiner Lehrplan (LiLe)",
    stufenWort: "Stufe",
  },
  {
    kennung: "ch",
    orthografie: "ss",
    flagge: "🇨🇭",
    lehrplanName: "Lehrplan 21",
    stufenWort: "Stufe",
  },
  {
    kennung: "de",
    orthografie: "ß",
    flagge: "🇩🇪",
    lehrplanName: "Lehrplan Deutschland",
    stufenWort: "Klasse",
  },
  {
    kennung: "at",
    orthografie: "ß",
    flagge: "🇦🇹",
    lehrplanName: "Lehrplan Österreich",
    stufenWort: "Klasse",
  },
] as const;

export type LehrplanDefinition = (typeof LEHRPLAENE)[number];

/**
 * Standard-Lehrplan: Liechtenstein – 37 der 40 Repo-Module tragen
 * curriculum "LiLe" (die Plattform ist dort beheimatet); Erstbesucher
 * sehen so weiterhin den gewohnten Katalog. Die Registry-Reihenfolge
 * oben ist zugleich die Dropdown-Reihenfolge.
 */
export const LEHRPLAN_STANDARD = "li";

export function lehrplanDefinition(
  kennung: string,
): LehrplanDefinition | undefined {
  return LEHRPLAENE.find((plan) => plan.kennung === kennung);
}

/**
 * Kompetenzverweis eines curricula-Eintrags – bewusst OHNE das
 * Lehrplan-21-Code-Format (andere Lehrpläne nummerieren anders);
 * das Legacy-Feld `competencies` (Version 1/2) behielt seine strenge
 * LP21-Regex.
 */
export const lehrplanKompetenzSchema = z.strictObject({
  code: z.string().trim().min(1).max(60),
  description: z.string().optional(),
});

/**
 * Zuordnung eines Moduls zu EINEM Lehrplan (Version 3, seit
 * 14.8.2026): Lehrplan-Kennung, das dort geltende Fach, die Stufe und
 * optionale Kompetenzverweise. Die STUFE besteht aus den
 * Klassenstufen-Zahlen (`grades`) und/oder einem Bezeichner
 * (`gradesText`): MIT Zahlen ist der Bezeichner das Wort vor der Zahl
 * (Standard liefert das `stufenWort` des Lehrplans – nur bei
 * Abweichung setzen), OHNE Zahlen bildet der Bezeichner allein die
 * Stufe (z. B. "Erwachsene" – erscheint im Stufen-Filter NACH allen
 * Klassenstufen). Mindestens eines von beiden verlangt
 * pruefeCurricula.
 */
export const curriculumEintragSchema = z.strictObject({
  /** Lehrplan-Kennung, z. B. "li", "ch", "de" (registriert in LEHRPLAENE). */
  curriculum: z.string().trim().min(1).max(30),
  /** Fachkürzel im Ziel-Lehrplan, z. B. "RZG" oder "Geschichte". */
  subject: z.string().trim().min(1).max(60),
  /** Ausgeschriebener Fachname, wenn `subject` ein Kürzel ist. */
  subjectName: z.string().trim().min(1).max(120).optional(),
  /** Klassenstufen als Zahlen, z. B. [9] oder [7, 8, 9]. */
  grades: z
    .array(z.number().int().min(1).max(13), {
      error:
        'Klassenstufen sind Zahlen, z. B. [8, 9] – ein Bezeichner wie "Klasse" oder ein Freitext wie "7.–9. Klasse" gehört in gradesText.',
    })
    .min(1)
    .max(13)
    .optional(),
  /**
   * Stufen-Bezeichner: mit `grades` das Wort vor der Zahl (übersteuert
   * das Registry-stufenWort), ohne `grades` die alleinstehende Stufe.
   */
  gradesText: z.string().trim().min(1).max(60).optional(),
  /** Kompetenzverweise dieses Lehrplans (Code-Format frei). */
  competencies: z.array(lehrplanKompetenzSchema).default([]),
});

export type CurriculumEintrag = z.infer<typeof curriculumEintragSchema>;

/** Regeln der curricula-Liste (moduleSchema, Version 3). */
function pruefeCurricula(
  curricula: CurriculumEintrag[] | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!curricula) return;
  const gesehen = new Set<string>();
  curricula.forEach((eintrag, index) => {
    const kennung = eintrag.curriculum;
    if (!LEHRPLAN_KENNUNG_MUSTER.test(kennung)) {
      ctx.addIssue({
        code: "custom",
        path: ["curricula", index, "curriculum"],
        message: `Lehrplan-Kennung "${kennung}" hat nicht das Format Länderkürzel[-Untergliederung], z. B. "ch", "de" oder "de-he".`,
      });
      return;
    }
    if (!lehrplanDefinition(kennung)) {
      ctx.addIssue({
        code: "custom",
        path: ["curricula", index, "curriculum"],
        message: `Lehrplan "${kennung}" ist (noch) nicht registriert – bekannte Kennungen: ${LEHRPLAENE.map((p) => p.kennung).join(", ")}. Neue Lehrpläne brauchen einen Registry-Eintrag (LEHRPLAENE in schema.ts).`,
      });
      return;
    }
    if (gesehen.has(kennung)) {
      ctx.addIssue({
        code: "custom",
        path: ["curricula", index, "curriculum"],
        message: `Lehrplan "${kennung}" kommt mehrfach vor – je Lehrplan ist genau ein Eintrag erlaubt.`,
      });
      return;
    }
    gesehen.add(kennung);
    if (eintrag.grades === undefined && eintrag.gradesText === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["curricula", index],
        message: `Lehrplan "${kennung}": Der Eintrag braucht eine Stufe – "grades" mit Klassenzahlen (z. B. [8, 9]) und/oder "gradesText" als Bezeichner (z. B. "Erwachsene").`,
      });
    }
    // Doppelte Klassenzahlen sind ein Autorenfehler ([9, 9] zeigte
    // sonst «Stufe 9, 9» – Review-Fund 14.8.2026).
    if (
      eintrag.grades !== undefined &&
      new Set(eintrag.grades).size !== eintrag.grades.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["curricula", index, "grades"],
        message: `Lehrplan "${kennung}": "grades" enthält doppelte Klassenzahlen – jede Stufe genau einmal listen.`,
      });
    }
  });
}

/**
 * LEGACY (Version 1/2): Zuordnung eines Moduls zu EINEM Lehrplan im
 * alten Stufenmodell (zyklus ODER klassen ODER selbststudium). Bleibt
 * für das versionierte Einlesen bestehender Dateien und gespeicherter
 * lokaler Module erhalten; migriereModulV2 überführt die Einträge in
 * die curricula-Form.
 */
export const lehrplanEintragSchema = z.strictObject({
  /** Fachkürzel im Ziel-Lehrplan, z. B. "RZG" oder "Geschichte". */
  fach: z.string().trim().min(1).max(60),
  /** Ausgeschriebener Fachname, wenn `fach` ein Kürzel ist. */
  fachName: z.string().trim().min(1).max(120).optional(),
  /** Stufenmodell "zyklus": Lehrplan-21-Zyklus 1–3. */
  zyklus: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  /** Stufenmodell "klasse": Klassenstufen, z. B. [9] oder [8, 9]. */
  klassen: z.array(z.number().int().min(1).max(13)).min(1).max(13).optional(),
  /**
   * Stufe OBERHALB der Schulzeit (seit 13.8.2026): Das Modul richtet
   * sich ans freie Selbststudium statt an eine Klassenstufe (z. B. das
   * technische Demo-Modul). Ersetzt zyklus/klassen im jeweiligen
   * Eintrag; im Katalog erscheint es unter der eigenen Stufe
   * «Selbststudium» NACH der höchsten Klassenstufe.
   */
  selbststudium: z.literal(true).optional(),
  /** Freitext-Stufe für die Anzeige, z. B. "7.–9. Klasse (Sek I)". */
  stufeText: z.string().trim().min(1).max(80).optional(),
  kompetenzen: z.array(lehrplanKompetenzSchema).default([]),
});

export type LehrplanEintrag = z.infer<typeof lehrplanEintragSchema>;

/**
 * LEGACY-Regeln der Zuordnungstabelle – geteilt von moduleV2Schema und
 * moduleV1Schema. Bewusst MILDER als bis Version 2 (die
 * stufenmodell-Prüfungen zyklus-vs-klassen sind entfallen, das Modell
 * existiert in der Registry nicht mehr): Bestandsdateien wurden beim
 * Eintritt ins Repo streng geprüft, hier geht es nur noch ums
 * verlustfreie Einlesen fürs Migrieren.
 */
function pruefeLehrplaene(
  lehrplaene: Record<string, LehrplanEintrag> | undefined,
  ctx: z.RefinementCtx,
): void {
  if (!lehrplaene) return;
  for (const [kennung, eintrag] of Object.entries(lehrplaene)) {
    if (!LEHRPLAN_KENNUNG_MUSTER.test(kennung)) {
      ctx.addIssue({
        code: "custom",
        path: ["lehrplaene", kennung],
        message: `Lehrplan-Kennung "${kennung}" hat nicht das Format Länderkürzel[-Untergliederung], z. B. "ch", "de" oder "de-he".`,
      });
      continue;
    }
    // Selbststudium ersetzte die Schulstufe komplett – ein Eintrag darf
    // nie beides tragen (die Facette wäre widersprüchlich).
    if (
      eintrag.selbststudium === true &&
      (eintrag.zyklus !== undefined || eintrag.klassen !== undefined)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["lehrplaene", kennung, "selbststudium"],
        message: `Lehrplan "${kennung}": "selbststudium" ersetzt die Schulstufe – "zyklus"/"klassen" im selben Eintrag entfernen.`,
      });
    }
  }
}

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

/**
 * Format der Teilkompetenz-Kennungen (seit 1.9.2026): mindestens zwei
 * durch Punkte getrennte Kleinbuchstaben/Ziffern-Segmente (ab dem
 * zweiten Segment auch Bindestriche), Konvention
 * `<fachbereich>.<thema>.<verb-objekt>` – z. B.
 * "wirtschaft.geld.funktionen-nennen". Die Kennungen sind
 * LEHRPLANUNABHÄNGIG; welche Kennungen es gibt (Register mit Namen
 * de/en) und wie sie auf die Kompetenz-Codes der einzelnen Lehrpläne
 * abbilden (Mapping), steht im Content-Repo unter kompetenzen/
 * (teilkompetenzen.json + mapping.json – Schemas und Loader:
 * src/lib/content/kompetenzen.ts der Plattform). Die Validierer prüfen
 * dort zusätzlich, dass jede referenzierte Kennung im Register
 * existiert.
 */
export const TEILKOMPETENZ_ID_MUSTER = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

const blockBase = {
  /** Optionale stabile ID, z. B. für Deep-Links oder spätere Auswertungen. */
  id: z.string().optional(),
  /** Optionale Überschrift des Blocks. */
  title: z.string().optional(),
  /**
   * Teilkompetenz-Kennungen, auf die dieser Block einzahlt (seit
   * 1.9.2026, optional, max. 8): lehrplanunabhängige Kennungen im
   * Format TEILKOMPETENZ_ID_MUSTER; Register und Lehrplan-Mapping der
   * Kennungen leben im Content-Repo unter kompetenzen/. Grundlage der
   * Kompetenz-Übersicht im Lehrer-Dashboard (Abdeckung + Sicherheit,
   * reine Laufzeit-Ableitung). Das Feld ist BEWUSST auf jedem Blocktyp
   * erlaubt (einfacher als Typregeln); auf Blöcken ohne
   * Bearbeitet-Nachweis im Report (text, image, video, audio,
   * planspiel, simulation ohne Abschlussfrage …) bleibt es (noch)
   * wirkungslos. ROLLOUT: Plattform VOR dem Content-Merge deployen –
   * ältere Player lehnen Module mit dem Feld hart ab (strictObject).
   */
  teilkompetenzen: z
    .array(
      z
        .string()
        .max(64)
        .regex(TEILKOMPETENZ_ID_MUSTER, {
          message:
            'Teilkompetenz-Kennungen haben das Format "<fachbereich>.<thema>.<verb-objekt>" (Kleinbuchstaben/Ziffern, Punkte als Trenner, Bindestriche ab dem zweiten Segment), z. B. "wirtschaft.geld.funktionen-nennen".',
        }),
    )
    .max(8)
    .refine((liste) => new Set(liste).size === liste.length, {
      message: "teilkompetenzen: Jede Kennung höchstens einmal listen.",
    })
    .optional(),
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

// --- Aufgaben-Varianten (mehrere Fassungen eines Aufgabenblocks) ------------

/**
 * Aufgaben-Varianten (seit 11.8.2026): Ein Aufgabenblock der Typen
 * lueckentext, zuordnung, numerisch und term darf neben seinem
 * normalen Inhalt (= Variante A) eine Liste `varianten` mit WEITEREN,
 * vollständig ausformulierten Fassungen tragen (B, C, …). Der Player
 * zieht beim Öffnen zufällig eine Fassung; «Wiederholen» zieht eine
 * ANDERE. Alle Fassungen stehen fertig in der Moduldatei – nichts wird
 * zur Laufzeit berechnet oder generiert (Moduldateien bleiben reine
 * Daten). Der Lernstand bleibt PRO BLOCK (die gezogene Fassung wird
 * weder gespeichert noch übermittelt); damit Punkte vergleichbar
 * bleiben, MUSS jede Fassung dieselbe Punktzahl ergeben (gleich viele
 * Lücken/Bausteine/Paare/Aufgaben – die Validierung erzwingt das).
 * BEWUSST OHNE Varianten: tasks (die Antworten gehen an die
 * Lehrperson – unterschiedliche Fragen machten das Dashboard
 * unbrauchbar), quiz (inhaltlicher Modulabschluss – alle beantworten
 * dieselben Kernfragen), simulation und planspiel; deren strictObject
 * lehnt ein varianten-Feld ab.
 *
 * BEWUSSTE GRENZE: Die Detail-Statistik questionStats schlüsselt pro
 * POSITION («blockId:1»), nicht pro Fassung – bei Varianten-Blöcken
 * vermischen sich dort die (inhaltlich verschiedenen) Aufgaben der
 * Fassungen. Das ist die direkte Folge der Vorgabe, die gezogene
 * Fassung NIRGENDS zu speichern; eine künftige questionStats-UI muss
 * Varianten-Blöcke entsprechend zurückhaltend auswerten.
 */
export const VARIANTEN_MAX_ZUSAETZLICH = 49;

/**
 * Anzeige-Bezeichnung einer Fassung: 0 → "A", 25 → "Z", 26 → "AA", …
 * (bijektive Basis 26, wie Tabellenspalten). Lehrpersonen ordnen so
 * bei Rückfragen zu, welche Fassung ein Gerät zeigt.
 */
export function variantenBezeichnung(index: number): string {
  let n = index + 1;
  let name = "";
  while (n > 0) {
    n -= 1;
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26);
  }
  return name;
}

/** Gesamtzahl der Fassungen eines Blocks (Hauptinhalt + varianten). */
export function variantenAnzahl(block: {
  varianten?: readonly unknown[];
}): number {
  return 1 + (block.varianten?.length ?? 0);
}

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
  // ß/ss gelten als GLEICHWERTIG (seit 12.8.2026): Inhalte sind mit ß
  // verfasst, die Anzeige ersetzt bei ss-Lehrplänen – Lernende dürfen
  // mit jeder Tastatur in beiden Schreibweisen antworten. Beide Seiten
  // laufen durch dieselbe Faltung, Anzeige und Lösung passen also
  // unabhängig von der Lehrplan-Wahl zusammen (ẞ = Grossbuchstabe).
  const getrimmt = wert
    .normalize("NFC")
    .replaceAll("ß", "ss")
    .replaceAll("ẞ", "SS")
    .trim();
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

/** Inhaltsfelder EINER Lückentext-Fassung (Hauptinhalt wie Variante). */
const lueckentextInhaltFelder = {
    /** Optionale Arbeitsanweisung über dem Text, Markdown erlaubt. */
    intro: markdown.optional(),
    /**
     * "wortbank": Lösungswörter (plus Ablenker) als antippbare Auswahl –
     * erst Wort antippen, dann Lücke. "eingabe": freies Textfeld pro Lücke.
     * "satzbau" (seit 1.8.2026): vorgegebene Bausteine in die richtige
     * Reihenfolge bringen – nutzt `bausteine`/`alternativen` statt
     * `text`/`luecken`.
     */
    modus: z.enum(["wortbank", "eingabe", "satzbau"]),
    /**
     * NUR wortbank/eingabe (dort Pflicht): Der Lückentext als reiner Text
     * (KEIN Markdown; Zeilenumbrüche mit \n bleiben erhalten). {{1}},
     * {{2}}, … markieren die Lücken und verweisen 1-basiert auf
     * `luecken`; jede Lücke kommt genau einmal vor.
     */
    text: z.string().min(1).optional(),
    /** NUR wortbank/eingabe (dort Pflicht): die Lücken zu `text`. */
    luecken: z.array(lueckeSchema).min(1).optional(),
    /**
     * NUR satzbau (dort Pflicht): die Bausteine (Wörter oder Satzteile)
     * in der KORREKTEN Reihenfolge, 2–40 Stück. Angezeigt werden sie
     * gemischt (alphabetisch, zusammen mit den Ablenkern).
     */
    bausteine: z.array(z.string().trim().min(1)).min(2).max(40).optional(),
    /**
     * NUR satzbau: weitere gültige Reihenfolgen (z. B. verschiebbare
     * Adverbien) als 1-basierte Indizes auf `bausteine`. Jede Alternative
     * stellt ALLE Bausteine um (vollständige Permutation).
     */
    alternativen: z
      .array(z.array(z.number().int().positive()))
      .max(20)
      .default([]),
    /**
     * wortbank: zusätzliche falsche Wörter in der Auswahl (dürfen mit
     * keiner akzeptierten Antwort übereinstimmen). satzbau: zusätzliche
     * Bausteine, die nicht in die Lösung gehören. Modus "eingabe": nicht
     * erlaubt.
     */
    ablenker: z.array(z.string().trim().min(1)).default([]),
};

export const lueckentextVarianteSchema = z.strictObject(lueckentextInhaltFelder);
export type LueckentextInhalt = z.infer<typeof lueckentextVarianteSchema>;

/** Punktzahl einer Lückentext-Fassung (satzbau: Bausteine, sonst Lücken). */
function lueckentextPunkte(inhalt: LueckentextInhalt): number {
  return inhalt.modus === "satzbau"
    ? (inhalt.bausteine?.length ?? 0)
    : (inhalt.luecken?.length ?? 0);
}

/**
 * Prüft EINE Fassung (Hauptinhalt oder Variante) – `pfad` ist das
 * Präfix für Fehlermeldungen (bei Varianten ["varianten", i]).
 */
function pruefeLueckentextInhalt(
  inhalt: LueckentextInhalt,
  ctx: z.RefinementCtx,
  pfad: (string | number)[],
): void {
    // --- Modus "satzbau": eigener Feldsatz --------------------------------
    if (inhalt.modus === "satzbau") {
      if (inhalt.text !== undefined || inhalt.luecken !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, inhalt.text !== undefined ? "text" : "luecken"],
          message:
            'Lückentext: "text"/"luecken" gehören zu den Modi "wortbank"/"eingabe" – der Modus "satzbau" nutzt "bausteine" (und optional "alternativen").',
        });
      }
      const bausteine = inhalt.bausteine;
      if (!bausteine) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "bausteine"],
          message:
            'Lückentext: Der Modus "satzbau" braucht "bausteine" – die Wörter oder Satzteile in der korrekten Reihenfolge.',
        });
        return;
      }
      inhalt.alternativen.forEach((indizes, a) => {
        const gueltig =
          indizes.length === bausteine.length &&
          new Set(indizes).size === indizes.length &&
          indizes.every((i) => i >= 1 && i <= bausteine.length);
        if (!gueltig) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "alternativen", a],
            message: `Lückentext: Alternative ${a + 1} muss ALLE ${bausteine.length} Bausteine genau einmal umstellen (1-basierte Indizes 1–${bausteine.length}).`,
          });
        }
      });
      inhalt.ablenker.forEach((wort, index) => {
        if (bausteine.includes(wort)) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "ablenker", index],
            message: `Lückentext: Ablenker "${wort}" ist zugleich ein Baustein der Lösung – er wäre kein Ablenker.`,
          });
        }
      });
      return;
    }

    // --- Modi "wortbank"/"eingabe": Text + Lücken sind Pflicht -------------
    if (inhalt.bausteine !== undefined || inhalt.alternativen.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: [...pfad, inhalt.bausteine !== undefined ? "bausteine" : "alternativen"],
        message:
          'Lückentext: "bausteine"/"alternativen" gehören zum Modus "satzbau".',
      });
    }
    if (!inhalt.text || !inhalt.luecken) {
      ctx.addIssue({
        code: "custom",
        path: [...pfad, !inhalt.text ? "text" : "luecken"],
        message: `Lückentext: Der Modus "${inhalt.modus}" braucht "text" (mit {{1}}-Markern) und "luecken".`,
      });
      return;
    }

    const text = inhalt.text;
    const luecken = inhalt.luecken;
    const marker = zerlegeLueckentext(text).filter((s) => s.art === "luecke");

    // Wohlgeformtheit: Jedes "{{" bzw. "}}" muss zu einem vollständigen
    // {{n}}-Marker gehören – fängt {{eins}}, {{1} und verirrte Klammern.
    const offene = (text.match(/\{\{/g) ?? []).length;
    const schliessende = (text.match(/\}\}/g) ?? []).length;
    if (offene !== marker.length || schliessende !== marker.length) {
      ctx.addIssue({
        code: "custom",
        path: [...pfad, "text"],
        message:
          "Lückentext: unvollständiger Lücken-Marker. Lücken werden exakt als {{1}}, {{2}}, … geschrieben (fortlaufende Zahl in doppelten geschweiften Klammern, ohne Leerzeichen); {{ und }} sind dafür reserviert.",
      });
    }

    const verwendungen = new Map<number, number>();
    for (const seg of marker) {
      verwendungen.set(seg.index, (verwendungen.get(seg.index) ?? 0) + 1);
    }
    for (const [index] of verwendungen) {
      if (index < 0 || index >= luecken.length) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "text"],
          message: `Lückentext: Marker {{${index + 1}}} verweist auf eine Lücke, die es nicht gibt – definiert sind ${luecken.length} Lücken ({{1}} bis {{${luecken.length}}}).`,
        });
      }
    }
    luecken.forEach((_, index) => {
      const anzahl = verwendungen.get(index) ?? 0;
      if (anzahl === 0) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "luecken", index],
          message: `Lückentext: Lücke ${index + 1} hat keinen Marker {{${index + 1}}} im Text.`,
        });
      } else if (anzahl > 1) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "text"],
          message: `Lückentext: Marker {{${index + 1}}} kommt ${anzahl}-mal vor – jede Lücke wird genau einmal verwendet.`,
        });
      }
    });

    if (inhalt.modus === "eingabe" && inhalt.ablenker.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: [...pfad, "ablenker"],
        message:
          'Lückentext: "ablenker" ist nur in den Modi "wortbank" und "satzbau" erlaubt (im Modus "eingabe" gibt es keine Auswahl).',
      });
    }
    inhalt.ablenker.forEach((wort, index) => {
      if (luecken.some((luecke) => istLueckeRichtig(wort, luecke))) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "ablenker", index],
          message: `Lückentext: Ablenker "${wort}" ist zugleich eine akzeptierte Antwort einer Lücke – er wäre kein Ablenker.`,
        });
      }
    });
}

export const lueckentextBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("lueckentext"),
    ...lueckentextInhaltFelder,
    /**
     * Optionale WEITERE Fassungen (Variante B, C, …) – jede vollständig
     * ausformuliert und mit derselben Punktzahl wie der Hauptinhalt
     * (= Variante A). Details im Varianten-Abschnitt weiter oben.
     */
    varianten: z
      .array(lueckentextVarianteSchema)
      .min(1)
      .max(VARIANTEN_MAX_ZUSAETZLICH)
      .optional(),
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
    pruefeLueckentextInhalt(block, ctx, []);
    const punkteHaupt = lueckentextPunkte(block);
    block.varianten?.forEach((variante, i) => {
      pruefeLueckentextInhalt(variante, ctx, ["varianten", i]);
      const punkte = lueckentextPunkte(variante);
      // Vergleich nur, wenn die Variante ihr eigenes Minimum erfüllt –
      // darunter meldet Zod bereits too_small, eine zusätzliche
      // Mismatch-Meldung wäre irreführend (Review 11.8.2026).
      const minimum = variante.modus === "satzbau" ? 2 : 1;
      if (punkte >= minimum && punkteHaupt > 0 && punkte !== punkteHaupt) {
        ctx.addIssue({
          code: "custom",
          path: ["varianten", i],
          message: `Lückentext: Variante ${variantenBezeichnung(i + 1)} ergibt ${punkte} Punkte, der Hauptinhalt (Variante A) ${punkteHaupt} – alle Fassungen eines Blocks müssen dieselbe Punktzahl haben (der Lernstand zählt pro BLOCK).`,
        });
      }
    });
  });

/**
 * Alle gültigen Reihenfolgen eines satzbau-Blocks als Textfolgen: die
 * Hauptreihenfolge (`bausteine` selbst) plus die `alternativen`.
 */
export function satzbauReihenfolgen(inhalt: LueckentextInhalt): string[][] {
  const bausteine = inhalt.bausteine ?? [];
  return [
    [...bausteine],
    ...inhalt.alternativen.map((indizes) =>
      indizes.map((i) => bausteine[i - 1]),
    ),
  ];
}

/**
 * Positions-Treffer einer gelegten Baustein-Reihenfolge (verglichen als
 * TEXTE – identische Bausteine sind austauschbar): Gewertet wird gegen
 * die gültige Reihenfolge mit den MEISTEN Übereinstimmungen; bei
 * mehreren erlaubten Lösungen zählt also die wohlwollendste. Einzige
 * massgebliche Auswertung – Player und Anzeige nutzen dieselbe Funktion.
 */
export function satzbauPositionsTreffer(
  gelegt: readonly string[],
  inhalt: LueckentextInhalt,
): boolean[] {
  let beste: boolean[] = (inhalt.bausteine ?? []).map(() => false);
  let besteAnzahl = -1;
  for (const reihenfolge of satzbauReihenfolgen(inhalt)) {
    const treffer = reihenfolge.map((textStueck, i) => gelegt[i] === textStueck);
    const anzahl = treffer.filter(Boolean).length;
    if (anzahl > besteAnzahl) {
      besteAnzahl = anzahl;
      beste = treffer;
    }
  }
  return beste;
}

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

// --- Zuordnung (Paare zuordnen), automatisch geprüft ------------------------

/**
 * Ein Element einer Zuordnung: entweder reiner Text ODER ein Bild. Bilder
 * tragen dieselben Angaben wie der Bild-Block; `credit` (Quelle/Lizenz)
 * ist hier PFLICHT, weil es sonst nirgends erschiene (die Nachweise
 * stehen gesammelt unter dem Block).
 */
export const zuordnungElementSchema = z
  .strictObject({
    text: z.string().min(1).max(200).optional(),
    bild: z
      .strictObject({
        /** Pfad "/content/<modul-id>/<datei>" oder freigegebene https-URL. */
        src: z.string().min(1),
        /** Alternativtext für Screenreader – Pflicht. */
        alt: z.string().min(1),
        /** Bildnachweis/Lizenz – Pflicht. */
        credit: z.string().min(1),
      })
      .optional(),
  })
  .refine((e) => (e.text !== undefined) !== (e.bild !== undefined), {
    message:
      'Zuordnung: Ein Element hat entweder "text" ODER "bild" (genau eines von beiden).',
  });

export const zuordnungPaarSchema = z.strictObject({
  links: zuordnungElementSchema,
  rechts: zuordnungElementSchema,
});

/** Anzeige-/Vergleichstext eines Zuordnungs-Elements (Bild: Alt-Text). */
export function zuordnungElementText(
  element: z.infer<typeof zuordnungElementSchema>,
): string {
  return element.text ?? element.bild?.alt ?? "";
}

/**
 * Zuordnungsaufgabe, NEU seit 1.8.2026: Paare werden einander zugeordnet
 * (Wort–Definition, Wort–Bild, Begriff–Beispiel). Beide Spalten
 * erscheinen gemischt nebeneinander; bedient wird rein per ANTIPPEN
 * (seit 2.8.2026): ein Element links und eines rechts antippen bildet
 * ein Paar – in beliebiger Reihenfolge; Paare sind sichtbar verbunden
 * und wieder auflösbar. PRÜFENDER Block: ein Punkt pro korrektem Paar,
 * bestanden bei 100 %. Seit 5.8.2026 OHNE Ablenker (Felder entfernt,
 * siehe Versionsgeschichte): Jedes linke Element hat genau ein rechtes
 * Gegenstück, beide Spalten sind gleich lang.
 */
/** Inhaltsfelder EINER Zuordnungs-Fassung (Hauptinhalt wie Variante). */
const zuordnungInhaltFelder = {
  /** Optionale Arbeitsanweisung, Markdown erlaubt. */
  intro: markdown.optional(),
  paare: z.array(zuordnungPaarSchema).min(2).max(12),
};

export const zuordnungVarianteSchema = z.strictObject(zuordnungInhaltFelder);
export type ZuordnungInhalt = z.infer<typeof zuordnungVarianteSchema>;

/** Prüft EINE Fassung; `pfad` prefixt die Fehlermeldungen (Varianten). */
function pruefeZuordnungInhalt(
  inhalt: ZuordnungInhalt,
  ctx: z.RefinementCtx,
  pfad: (string | number)[],
): void {
    // Die Elemente JEDER Spalte müssen unterscheidbar sein – zwei
    // gleich aussehende Einträge machten die Zuordnung zum Ratespiel.
    // Bild-Elemente vergleichen über die BILD-Identität (src):
    // dasselbe Foto mit zwei Alt-Texten sieht identisch aus.
    const pruefeSpalte = (
      seite: "links" | "rechts",
      elemente: Array<z.infer<typeof zuordnungElementSchema>>,
    ) => {
      const gesehen = new Map<string, number>();
      elemente.forEach((element, i) => {
        const schluessel = element.bild
          ? `bild:${element.bild.src}`
          : `text:${element.text}`;
        const vorher = gesehen.get(schluessel);
        if (vorher !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "paare", i, seite],
            message: `Zuordnung: Das ${seite === "links" ? "linke" : "rechte"} Element "${zuordnungElementText(element)}" kommt mehrfach vor (Bilder zählen über die Bilddatei) – die Elemente einer Spalte müssen unterscheidbar sein.`,
          });
        }
        gesehen.set(schluessel, i);
      });
    };
    pruefeSpalte(
      "rechts",
      inhalt.paare.map((p) => p.rechts),
    );
    pruefeSpalte(
      "links",
      inhalt.paare.map((p) => p.links),
    );
}

export const zuordnungBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("zuordnung"),
    ...zuordnungInhaltFelder,
    /** Optionale WEITERE Fassungen (Variante B, C, …) – siehe Varianten-Abschnitt. */
    varianten: z
      .array(zuordnungVarianteSchema)
      .min(1)
      .max(VARIANTEN_MAX_ZUSAETZLICH)
      .optional(),
  })
  .superRefine((block, ctx) => {
    // Stabile id ist Pflicht (wie bei Lückentext/Quiz).
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Zuordnung: Der Block braucht eine stabile "id" (z. B. "zu1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Zuordnung: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }
    pruefeZuordnungInhalt(block, ctx, []);
    block.varianten?.forEach((variante, i) => {
      pruefeZuordnungInhalt(variante, ctx, ["varianten", i]);
      // >= 2: darunter meldet Zod bereits too_small (Review 11.8.2026).
      if (variante.paare.length >= 2 && variante.paare.length !== block.paare.length) {
        ctx.addIssue({
          code: "custom",
          path: ["varianten", i, "paare"],
          message: `Zuordnung: Variante ${variantenBezeichnung(i + 1)} hat ${variante.paare.length} Paare, der Hauptinhalt (Variante A) ${block.paare.length} – alle Fassungen eines Blocks müssen dieselbe Punktzahl haben (der Lernstand zählt pro BLOCK).`,
        });
      }
    });
  });

// --- Audio (Hörverstehen) ---------------------------------------------------

/**
 * Moduleigene Audio-Datei: derselbe Ort wie Bilder und Videos
 * ("/content/<modul>/<datei>"), Endung .mp3 oder .m4a. Bewusst ohne
 * "..", ohne Query und ohne Fragment. Fremde Audio-Hosts gibt es nicht –
 * Hördateien liegen IMMER im Modulordner (kein dynamisches Text-to-Speech).
 */
export const AUDIO_DATEI_MUSTER =
  /^\/content\/[a-z0-9][a-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*\.(?:mp3|m4a)$/;

/**
 * Hörverstehens-Audio, NEU seit 1.8.2026 (analog zum Video-Block, aber
 * ausschliesslich moduleigene Dateien): Abspielsteuerung mit Start/Pause,
 * Fortschrittsleiste, erneut abspielen und verlangsamter Wiedergabe.
 * KEIN prüfender Block – die Auswertung übernehmen nachfolgende
 * Aufgabenblöcke im selben Modul (Lückentext, Quiz, Zuordnung).
 *
 * Zwei Quellen, seit 3.8.2026 KOMBINIERBAR (mindestens eine pro
 * Block; Abspiel-Reihenfolge: Vorlesen bevorzugt → Datei →
 * Text/Hinweis):
 * - `vorleseText` + `vorleseSprache`: der Browser liest den Text mit
 *   einer Stimme der angegebenen Sprache vor (die Automatik wählt nur
 *   LOKALE Stimmen) – der BEVORZUGTE Weg, sobald eine passende Stimme
 *   da ist: Lernende wählen unter «Cates Stimmen» zwischen Stimmen
 *   und Aussprachevarianten.
 * - `src`: hinterlegte Hördatei als RÜCKFALLEBENE – gespielt, wenn
 *   keine passende Stimme da ist oder die Vorlese-Ausgabe fehlschlägt
 *   (offline zuverlässig, feste Aussprache). `credit` ist dann
 *   Pflicht. Ohne beides zeigt der Player den Text bzw. bei
 *   Höraufgaben (transkriptAnzeigen=false) einen Hinweis.
 */
export const audioBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("audio"),
    /** Variante Datei (Rückfallebene): "/content/<modul>/<datei>.mp3|m4a". */
    src: z
      .string()
      .regex(AUDIO_DATEI_MUSTER, {
        message:
          'Audio: "src" muss ein moduleigener Pfad der Form "/content/<modul>/<datei>.mp3" (auch .m4a) sein.',
      })
      .optional(),
    /** Worum geht es bzw. Höraufgabe («Hör zu und achte auf …»). */
    description: z.string().optional(),
    /**
     * Transkript (Markdown): Textalternative zum Nachlesen. Seit
     * 2.8.2026 optional – weglassen nur bei Höraufgaben, bei denen die
     * Lernenden das Gehörte selbst eintippen sollen (Barrierefreiheit
     * bedenken!). In der Vorlese-Variante entfällt es: `vorleseText`
     * IST dort der Text.
     */
    transcript: markdown.optional(),
    /**
     * Transkript (bzw. Vorlesetext) anzeigen? Standard true
     * (Barrierefreiheit). false NUR für Höraufgaben, bei denen das
     * Gehörte selbst eingetippt werden soll – dann übernimmt der
     * nachfolgende Aufgabenblock die Kontrolle.
     */
    transkriptAnzeigen: z.boolean().default(true),
    /** Quelle und Lizenz der Aufnahme (Pflicht in der Datei-Variante). */
    credit: z.string().min(1).optional(),
    /**
     * Variante Vorlesen (bevorzugt): dieser Text wird über die
     * Browser-Vorlesefunktion ausgegeben (reiner Text, kein Markdown).
     */
    vorleseText: z.string().min(1).max(4000).optional(),
    /** Sprache des Vorlesetexts als BCP-47-Code, z. B. "en-GB". */
    vorleseSprache: z
      .string()
      .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, {
        message:
          'Audio: "vorleseSprache" muss ein BCP-47-Code sein, z. B. "en-GB" oder "fr".',
      })
      .optional(),
  })
  .superRefine((block, ctx) => {
    // Titel ist hier Pflicht (in blockBase optional): Ohne Überschrift
    // stünde nur ein nackter Player auf der Seite.
    if (!block.title) {
      ctx.addIssue({
        code: "custom",
        path: ["title"],
        message:
          'Audio: "title" ist Pflicht – die Überschrift benennt, was zu hören ist.',
      });
    }
    // Mindestens EINE Quelle: Vorlesetext und/oder Datei (seit
    // 3.8.2026 kombinierbar – das Vorlesen ist beim Abspielen
    // bevorzugt, die Datei ist die Rückfallebene ohne passende Stimme
    // oder bei einem Ausgabefehler).
    if (block.src === undefined && block.vorleseText === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["src"],
        message:
          'Audio: Der Block braucht "vorleseText" + "vorleseSprache" (Browser-Vorlesen, bevorzugt) und/oder "src" (Hördatei als Rückfallebene).',
      });
      return;
    }
    if (block.src !== undefined && !block.credit) {
      ctx.addIssue({
        code: "custom",
        path: ["credit"],
        message:
          'Audio: Bei einer hinterlegten Aufnahme ist "credit" (Quelle und Lizenz) Pflicht.',
      });
    }
    if (block.vorleseText !== undefined) {
      if (!block.vorleseSprache) {
        ctx.addIssue({
          code: "custom",
          path: ["vorleseSprache"],
          message:
            'Audio: Die Vorlese-Variante braucht "vorleseSprache" (BCP-47, z. B. "en-GB"), damit eine passende Stimme gewählt wird.',
        });
      }
      if (block.transcript !== undefined && block.src === undefined) {
        // Mit Datei ist transcript weiter erlaubt (Datei-Regeln gelten);
        // als REINE Vorlese-Variante ist der vorleseText bereits der Text.
        ctx.addIssue({
          code: "custom",
          path: ["transcript"],
          message:
            'Audio: Ohne "src" entfällt "transcript" – der "vorleseText" ist bereits der Text (Anzeige über "transkriptAnzeigen").',
        });
      }
    } else if (block.vorleseSprache !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["vorleseSprache"],
        message: 'Audio: "vorleseSprache" gehört zur Vorlese-Variante ("vorleseText").',
      });
    }
  });

// --- Numerische Eingabe -----------------------------------------------------

/**
 * Zahlwert aus einer Schreibweise, NEU seit 9.8.2026 – die EINE
 * Format-Logik für Autoren-Antworten (Validierung) und Lernenden-
 * Eingaben (Player). Gleichwertig sind: Dezimalpunkt und -komma
 * («0.5» = «0,5» – das Komma zählt NUR als Dezimaltrennzeichen, nie
 * als Tausendergruppierung), Brüche («1/2») und – sofern die Aufgabe
 * es zulässt – die Prozent-Schreibweise («50 %» = 0,5).
 * Einheiten gehören NICHT hierher (der Player trennt sie vorher ab
 * und rechnet sie mit mathjs um). Liefert null für alles Unlesbare.
 */
export function parseZahlwert(
  roh: string,
  { prozentErlaubt = true }: { prozentErlaubt?: boolean } = {},
): number | null {
  let text = roh.trim();
  if (text === "") return null;
  // Prozent-Schreibweise: mathematisch ist «50 %» der Bruchteil 0,5.
  let faktor = 1;
  if (text.endsWith("%")) {
    if (!prozentErlaubt) return null;
    faktor = 1 / 100;
    text = text.slice(0, -1).trim();
  }
  // Dezimalkomma: Ohne Punkt werden ALLE Kommas zu Punkten («1,5/2,5»);
  // Komma UND Punkt zusammen (Tausendergruppen) sind bewusst unlesbar.
  if (text.includes(",")) {
    if (text.includes(".")) return null;
    text = text.replaceAll(",", ".");
  }
  const DEZIMAL = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
  // Bruch a/b (b ≠ 0) – nach der Komma-Ersetzung, «1,5/2» geht also.
  const bruch = text.match(
    new RegExp(`^([+-]?${DEZIMAL})\\s*/\\s*(${DEZIMAL})$`),
  );
  if (bruch) {
    const nenner = Number(bruch[2]);
    if (nenner === 0) return null;
    return (Number(bruch[1]) / nenner) * faktor;
  }
  if (!new RegExp(`^[+-]?${DEZIMAL}(?:[eE][+-]?\\d+)?$`).test(text)) {
    return null;
  }
  const wert = Number(text);
  return Number.isFinite(wert) ? wert * faktor : null;
}

/**
 * Trifft die Eingabe eine der akzeptierten Antworten? Ohne Toleranz
 * gilt Wertgleichheit mit winzigem Epsilon (Binär-Rundung von 0,1+0,2
 * & Co.); «absolut» ist eine Spanne in der Zieleinheit, «prozent»
 * relativ zum Zielwert. Ein zusätzliches Mini-Epsilon verhindert,
 * dass exakt AUF der Toleranzgrenze liegende Eingaben an der
 * Gleitkomma-Darstellung scheitern.
 */
export function numerischKorrekt(
  eingabe: number,
  ziele: number[],
  toleranz?: { art: "absolut" | "prozent"; wert: number },
): boolean {
  return ziele.some((ziel) => {
    const spanne =
      toleranz === undefined
        ? Math.max(1e-9, Math.abs(ziel) * 1e-9)
        : toleranz.art === "absolut"
          ? toleranz.wert
          : Math.abs(ziel) * (toleranz.wert / 100);
    return Math.abs(eingabe - ziel) <= spanne + spanne * 1e-12 + 1e-12;
  });
}

export const numerischToleranzSchema = z.strictObject({
  /** "absolut" = Spanne in der Zieleinheit, "prozent" = relativ zum Zielwert. */
  art: z.enum(["absolut", "prozent"]),
  wert: z.number().positive(),
});

export const numerischAufgabeSchema = z.strictObject({
  /** Aufgabenstellung, Markdown und Mathe-Notation ($…$, KaTeX) erlaubt. */
  prompt: markdown,
  /**
   * Akzeptierte Antworten als Schreibweisen OHNE Einheit («0.5»,
   * «1/2», «50 %») – der Wert gilt in der Einheit aus `einheit`,
   * falls gesetzt. Gleichwertige Schreibweisen desselben Werts muss
   * niemand doppelt listen (die Äquivalenz rechnet der Player);
   * mehrere Einträge sind für WIRKLICH verschiedene akzeptierte
   * Werte da.
   */
  antworten: z.array(z.string().trim().min(1)).min(1).max(8),
  toleranz: numerischToleranzSchema.optional(),
  /**
   * Erwartete Einheit (mathjs-Schreibweise, z. B. "m", "km/h", "kg",
   * "degC"). Wenn gesetzt, MUSS die Eingabe eine Einheit tragen;
   * gleichwertige Einheiten werden umgerechnet (42 cm = 0.42 m).
   * Ohne dieses Feld sind Eingaben mit Einheit falsch.
   */
  einheit: z.string().trim().min(1).max(24).optional(),
  /** «50 %» als Bruchteil 0,5 werten (Standard true). */
  prozentErlaubt: z.boolean().default(true),
});

/**
 * Numerische Eingabe, NEU seit 9.8.2026: eine oder mehrere
 * Teilaufgaben, je ein Zahlen-Eingabefeld mit optionaler Einheit.
 * PRÜFENDER Block – ein Punkt pro Teilaufgabe, bestanden bei 100 %,
 * Auswertung/Wiederholen wie Lückentext und Zuordnung (pruefung.tsx).
 */
/** Inhaltsfelder EINER Zahlenaufgaben-Fassung (Hauptinhalt wie Variante). */
const numerischInhaltFelder = {
  /** Optionale Arbeitsanweisung, Markdown/Mathe erlaubt. */
  intro: markdown.optional(),
  aufgaben: z.array(numerischAufgabeSchema).min(1).max(12),
};

export const numerischVarianteSchema = z.strictObject(numerischInhaltFelder);
export type NumerischInhalt = z.infer<typeof numerischVarianteSchema>;

/** Prüft EINE Fassung; `pfad` prefixt die Fehlermeldungen (Varianten). */
function pruefeNumerischInhalt(
  inhalt: NumerischInhalt,
  ctx: z.RefinementCtx,
  pfad: (string | number)[],
): void {
    inhalt.aufgaben.forEach((aufgabe, i) => {
      aufgabe.antworten.forEach((antwort, j) => {
        if (
          parseZahlwert(antwort, { prozentErlaubt: aufgabe.prozentErlaubt }) ===
          null
        ) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "aufgaben", i, "antworten", j],
            message: `Numerisch: Die Antwort "${antwort}" ist keine lesbare Zahl (erlaubt: Dezimalzahl mit Punkt oder Komma, Bruch "a/b"${aufgabe.prozentErlaubt ? ', Prozent "50 %"' : ""} – OHNE Einheit, die steht im Feld "einheit").`,
          });
        }
      });
      // Autoren-Falle: x % von 0 sind 0 – eine Prozent-Toleranz um den
      // Zielwert 0 wirkte nie, die Aufgabe wäre praktisch unlösbar
      // streng. Früh ablehnen statt still exakt prüfen.
      if (
        aufgabe.toleranz?.art === "prozent" &&
        aufgabe.antworten.some(
          (antwort) =>
            parseZahlwert(antwort, {
              prozentErlaubt: aufgabe.prozentErlaubt,
            }) === 0,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "aufgaben", i, "toleranz"],
          message:
            'Numerisch: Bei einer akzeptierten Antwort mit dem Wert 0 wirkt eine PROZENT-Toleranz nicht (x % von 0 sind 0) – nutze { "art": "absolut", "wert": … }.',
        });
      }
      // Ob eine Einheit mathjs-bekannt ist, prüfen die Validierer mit
      // mathjs (die Bibliothek gehört bewusst nicht in diese Datei) –
      // hier nur die Grundform gegen Tippfehler wie Leerzeichen.
      if (aufgabe.einheit !== undefined && /\s/.test(aufgabe.einheit)) {
        ctx.addIssue({
          code: "custom",
          path: [...pfad, "aufgaben", i, "einheit"],
          message: `Numerisch: Die Einheit "${aufgabe.einheit}" darf keine Leerzeichen enthalten (mathjs-Schreibweise, z. B. "m", "km/h", "degC").`,
        });
      }
    });
}

export const numerischBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("numerisch"),
    ...numerischInhaltFelder,
    /** Optionale WEITERE Fassungen (Variante B, C, …) – siehe Varianten-Abschnitt. */
    varianten: z
      .array(numerischVarianteSchema)
      .min(1)
      .max(VARIANTEN_MAX_ZUSAETZLICH)
      .optional(),
  })
  .superRefine((block, ctx) => {
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Numerisch: Der Block braucht eine stabile "id" (z. B. "num1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Numerisch: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }
    pruefeNumerischInhalt(block, ctx, []);
    block.varianten?.forEach((variante, i) => {
      pruefeNumerischInhalt(variante, ctx, ["varianten", i]);
      // >= 1: bei leerem Array meldet Zod bereits too_small (Review 11.8.2026).
      if (variante.aufgaben.length >= 1 && variante.aufgaben.length !== block.aufgaben.length) {
        ctx.addIssue({
          code: "custom",
          path: ["varianten", i, "aufgaben"],
          message: `Numerisch: Variante ${variantenBezeichnung(i + 1)} hat ${variante.aufgaben.length} Teilaufgaben, der Hauptinhalt (Variante A) ${block.aufgaben.length} – alle Fassungen eines Blocks müssen dieselbe Punktzahl haben (der Lernstand zählt pro BLOCK).`,
        });
      }
    });
  });

// --- Achse (Zahlenstrahl, Zeitstrahl, Koordinatensystem) --------------------

export const achseSkalaSchema = z.strictObject({
  /** Numerische Achse: Bereichsanfang (Pflicht ohne `kategorien`). */
  min: z.number().optional(),
  /** Numerische Achse: Bereichsende (Pflicht ohne `kategorien`). */
  max: z.number().optional(),
  /** Raster, auf dem platzierte Elemente einrasten (z. B. 1 oder 0.5). */
  schritt: z.number().positive().optional(),
  /** Abstand der beschrifteten Achsen-Teilstriche (Standard: automatisch). */
  teilstriche: z.number().positive().optional(),
  /** Achsentitel, z. B. "Jahr" oder "x". */
  beschriftung: z.string().trim().min(1).max(60).optional(),
  /**
   * Kategorien-Achse statt Zahlen: benannte Abschnitte (z. B. Epochen).
   * Elemente werden dann einem Abschnitt zugeordnet; `min`/`max`/
   * `schritt`/`teilstriche` entfallen.
   */
  kategorien: z.array(z.string().trim().min(1).max(40)).min(2).max(12).optional(),
});

export const achseElementSchema = z.strictObject({
  /** Karten-Beschriftung: Zahl, Jahreszahl oder Begriff/Ereignisname. */
  text: z.string().trim().min(1).max(80),
  /** Zielposition auf der X-Achse (numerische Achse). */
  x: z.number().optional(),
  /** Ziel-Kategorie (Kategorien-Achse). */
  xKategorie: z.string().trim().min(1).optional(),
  /** Zielposition auf der Y-Achse (nur mit zweiter Achse). */
  y: z.number().optional(),
  /** Eigene Toleranz in Achseneinheiten (überschreibt die des Blocks). */
  toleranz: z.number().nonnegative().optional(),
});

type AchseSkala = z.infer<typeof achseSkalaSchema>;
type AchseElement = z.infer<typeof achseElementSchema>;

/**
 * Standard-Toleranz einer numerischen Achse: halber Rasterschritt,
 * sonst 1/40 des Bereichs – grosszügig genug fürs Treffen per Finger,
 * streng genug, dass Nachbarpositionen unterscheidbar bleiben.
 */
export function achseStandardToleranz(skala: AchseSkala): number {
  if (skala.schritt !== undefined) return skala.schritt / 2;
  if (skala.min !== undefined && skala.max !== undefined) {
    return (skala.max - skala.min) / 40;
  }
  return 0;
}

/** Vom Player gemeldete Position eines platzierten Elements –
 *  bei einer Kategorien-Achse ist `x` der KATEGORIEN-INDEX. */
export interface AchsePosition {
  x: number;
  y?: number;
}

/**
 * Auswertung des Achsen-Blocks – die EINE Rechenstelle für Player und
 * Tests. `positionen[i]` gehört zu `elemente[i]`; nicht platzierte
 * Elemente (null) sind falsch (der Player lässt Prüfen erst zu, wenn
 * alles platziert ist – wie bei der Zuordnung).
 *
 * Wertung: Kategorien-Achse → richtige Kategorie; `wertung:
 * "reihenfolge"` → das Element steht zu JEDEM anderen Element in der
 * richtigen Ordnung (die exakte Position ist egal – Zeitstrahl-Fall);
 * sonst Position mit Toleranz (je Element, sonst Block, sonst
 * Standard) – bei zwei Achsen auf beiden.
 */
export function achseErgebnisse(
  block: {
    x: AchseSkala;
    y?: AchseSkala;
    wertung: "position" | "reihenfolge";
    toleranz?: number;
    elemente: AchseElement[];
  },
  positionen: (AchsePosition | null)[],
): boolean[] {
  const { elemente } = block;
  if (block.x.kategorien) {
    return elemente.map((element, i) => {
      const pos = positionen[i];
      if (!pos) return false;
      return block.x.kategorien!.indexOf(element.xKategorie ?? "") === pos.x;
    });
  }
  if (block.wertung === "reihenfolge") {
    return elemente.map((element, i) => {
      const pos = positionen[i];
      if (!pos) return false;
      return elemente.every((anderes, j) => {
        if (j === i) return true;
        const andererPos = positionen[j];
        if (!andererPos) return true; // fehlende Nachbarn zählen gegen SIE
        return (
          Math.sign(pos.x - andererPos.x) ===
          Math.sign((element.x ?? 0) - (anderes.x ?? 0))
        );
      });
    });
  }
  return elemente.map((element, i) => {
    const pos = positionen[i];
    if (!pos) return false;
    const tolX = element.toleranz ?? block.toleranz ?? achseStandardToleranz(block.x);
    if (Math.abs(pos.x - (element.x ?? 0)) > tolX + tolX * 1e-12 + 1e-12) {
      return false;
    }
    if (block.y) {
      const tolY =
        element.toleranz ?? block.toleranz ?? achseStandardToleranz(block.y);
      if (
        Math.abs((pos.y ?? 0) - (element.y ?? 0)) >
        tolY + tolY * 1e-12 + 1e-12
      ) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Achsen-Aufgabe, NEU seit 9.8.2026: Elemente (Zahlen, Jahreszahlen
 * oder Textkarten) an Positionen auf EINER Achse (Zahlenstrahl,
 * Zeitstrahl) oder – mit zweiter Achse – in einem Koordinatensystem
 * platzieren. Bedienung wie die Zuordnung: Ziehen mit feiner
 * Zeigereingabe, Antippen (erst Karte, dann Position) auf Touch.
 * PRÜFENDER Block – ein Punkt pro Element, bestanden bei 100 %.
 */
export const achseBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("achse"),
    /** Optionale Arbeitsanweisung, Markdown/Mathe erlaubt. */
    intro: markdown.optional(),
    x: achseSkalaSchema,
    /** Zweite Achse: macht aus dem Strahl ein Koordinatensystem (nur numerisch). */
    y: achseSkalaSchema.optional(),
    /**
     * "position" (Standard): Zielposition mit Toleranz. "reihenfolge":
     * nur die Ordnung der Elemente entlang der Achse zählt (Zeitstrahl:
     * Ereignisse richtig einordnen, ohne das exakte Jahr zu treffen).
     */
    wertung: z.enum(["position", "reihenfolge"]).default("position"),
    /** Toleranz in Achseneinheiten für alle Elemente (Standard: siehe achseStandardToleranz). */
    toleranz: z.number().nonnegative().optional(),
    elemente: z.array(achseElementSchema).min(1).max(12),
  })
  .superRefine((block, ctx) => {
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Achse: Der Block braucht eine stabile "id" (z. B. "achse1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Achse: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }
    const istKategorien = block.x.kategorien !== undefined;
    if (istKategorien) {
      if (block.x.min !== undefined || block.x.max !== undefined || block.x.schritt !== undefined || block.x.teilstriche !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["x"],
          message:
            'Achse: Eine Kategorien-Achse hat keine "min"/"max"/"schritt"/"teilstriche" – die Abschnitte kommen aus "kategorien".',
        });
      }
      if (block.y) {
        ctx.addIssue({
          code: "custom",
          path: ["y"],
          message:
            "Achse: Eine Kategorien-Achse kann keine zweite Achse tragen (Koordinatensysteme sind rein numerisch).",
        });
      }
      if (block.wertung === "reihenfolge") {
        ctx.addIssue({
          code: "custom",
          path: ["wertung"],
          message:
            'Achse: Bei einer Kategorien-Achse zählt automatisch die richtige Kategorie – "reihenfolge" gibt es nur auf numerischen Achsen.',
        });
      }
    } else if (
      block.x.min === undefined ||
      block.x.max === undefined ||
      block.x.min >= block.x.max
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["x"],
        message:
          'Achse: Eine numerische Achse braucht "min" und "max" mit min < max (oder "kategorien" für benannte Abschnitte).',
      });
    }
    if (block.y) {
      if (block.y.kategorien !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["y", "kategorien"],
          message: "Achse: Die zweite Achse ist immer numerisch.",
        });
      } else if (
        block.y.min === undefined ||
        block.y.max === undefined ||
        block.y.min >= block.y.max
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["y"],
          message: 'Achse: Die zweite Achse braucht "min" und "max" mit min < max.',
        });
      }
      if (block.wertung === "reihenfolge") {
        ctx.addIssue({
          code: "custom",
          path: ["wertung"],
          message:
            'Achse: "reihenfolge" gibt es nur auf einer einzelnen Achse (1D).',
        });
      }
    }
    if (block.wertung === "reihenfolge" && block.elemente.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["elemente"],
        message: "Achse: Eine Reihenfolge braucht mindestens zwei Elemente.",
      });
    }
    const texte = new Map<string, number>();
    const zielXs = new Map<number, number>();
    block.elemente.forEach((element, i) => {
      const vorher = texte.get(element.text);
      if (vorher !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["elemente", i, "text"],
          message: `Achse: Das Element "${element.text}" kommt mehrfach vor – die Karten müssen unterscheidbar sein.`,
        });
      }
      texte.set(element.text, i);
      if (istKategorien) {
        if (element.x !== undefined || element.y !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["elemente", i],
            message:
              'Achse: Auf einer Kategorien-Achse haben Elemente eine "xKategorie", keine Zahlen-Ziele.',
          });
        }
        if (
          element.xKategorie === undefined ||
          !block.x.kategorien!.includes(element.xKategorie)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["elemente", i, "xKategorie"],
            message: `Achse: "${element.xKategorie ?? "(fehlt)"}" ist keine der Kategorien der Achse.`,
          });
        }
        return;
      }
      if (element.xKategorie !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["elemente", i, "xKategorie"],
          message:
            'Achse: "xKategorie" gehört zur Kategorien-Achse – auf einer numerischen Achse trägt das Element ein Zahlen-Ziel "x".',
        });
      }
      if (
        element.x === undefined ||
        (block.x.min !== undefined && element.x < block.x.min) ||
        (block.x.max !== undefined && element.x > block.x.max)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["elemente", i, "x"],
          message:
            'Achse: Jedes Element braucht eine Zielposition "x" innerhalb des Achsenbereichs.',
        });
      }
      if (block.wertung === "reihenfolge" && element.x !== undefined) {
        const gleich = zielXs.get(element.x);
        if (gleich !== undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["elemente", i, "x"],
            message:
              "Achse: Für die Reihenfolge-Wertung müssen alle Zielpositionen verschieden sein (sonst ist die Ordnung mehrdeutig).",
          });
        }
        zielXs.set(element.x, i);
      }
      if (block.y) {
        if (
          element.y === undefined ||
          (block.y.min !== undefined && element.y < block.y.min) ||
          (block.y.max !== undefined && element.y > block.y.max)
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["elemente", i, "y"],
            message:
              'Achse: Mit zweiter Achse braucht jedes Element eine Zielposition "y" innerhalb des Bereichs.',
          });
        }
      } else if (element.y !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["elemente", i, "y"],
          message: 'Achse: "y" gibt es nur mit einer zweiten Achse.',
        });
      }
    });
  });

// --- Term (mathematischer Term/Formel eingeben), automatisch geprüft --------

/**
 * Funktions-Whitelist des term-Blocks – die EINZIGEN Funktionsnamen,
 * die in Musterlösungen und Eingaben vorkommen dürfen (alle
 * EINargumentig; mathjs-Namen: "log" ist dort der NATÜRLICHE
 * Logarithmus, die Eingabe-Normalisierung des Players bildet "ln("
 * darauf ab). Player und beide Node-Validierer prüfen über
 * termBaumFehler gegen DIESELBE Liste.
 */
export const TERM_ERLAUBTE_FUNKTIONEN = [
  "sqrt",
  "abs",
  "sin",
  "cos",
  "tan",
  "log",
  "exp",
] as const;

/** Neben den Variablen der Aufgabe immer erlaubte Symbole (Konstanten). */
export const TERM_ERLAUBTE_KONSTANTEN = ["pi", "e"] as const;

/**
 * Minimales STRUKTURELLES Interface eines geparsten mathjs-Knotens –
 * diese Datei bleibt bewusst mathjs-frei (sie steckt im Schema-Bundle
 * jeder Seite); Player und Node-Validierer reichen echte mathjs-Nodes
 * herein, die dieses Interface erfüllen.
 */
export interface TermKnoten {
  type: string;
  /** SymbolNode: Variablen-/Konstantenname; FunctionNode: Funktionsname. */
  name?: string;
  /** OperatorNode: mathjs-Funktionsname ("add", "multiply", "unaryMinus" …). */
  fn?: unknown;
  /** ConstantNode: der Wert (nur Zahlen sind erlaubt – parse('"text"') liefert Strings). */
  value?: unknown;
  /** Operator-/Funktions-Argumente. */
  args?: TermKnoten[];
  /** ParenthesisNode: der eingeklammerte Ausdruck. */
  content?: TermKnoten;
  traverse(
    besucher: (
      knoten: TermKnoten,
      pfad: string | null,
      eltern: TermKnoten | null,
    ) => void,
  ): void;
}

export type TermBaumFehler =
  | { art: "funktion"; name: string }
  | { art: "funktionOhneKlammern"; name: string }
  | { art: "variable"; name: string }
  | { art: "zuTief" }
  | { art: "potenz" }
  | { art: "knoten"; typ: string };

/** Operator-Whitelist: die mathjs-fn-Namen von + - * / ^ und Vorzeichen. */
const TERM_ERLAUBTE_OPERATOREN = new Set([
  "add",
  "subtract",
  "multiply",
  "divide",
  "pow",
  "unaryMinus",
  "unaryPlus",
]);

/**
 * Maximale Verschachtelungstiefe eines Term-Baums. Schulterme liegen
 * unter 10 Ebenen; ab ~Tiefe 20 explodiert die LaTeX-Erzeugung von
 * mathjs exponentiell (23-fach verschachtelte Funktionsaufrufe: >1,5 s
 * pro toTex-Aufruf – gemessen, Review 11.8.2026). Die Grenze schützt
 * Live-Vorschau, Prüf-Klick und die Validierungsläufe der CI.
 */
export const TERM_MAX_TIEFE = 16;

/**
 * Grösster erlaubter Betrag eines KONSTANTEN Potenz-Exponenten.
 * mathjs-simplify wertet ganzzahlige Potenzen exakt aus – «9^9^9»
 * (Exponentwert 387 Millionen) blockierte den Haupt-Thread ~8 s PRO
 * Vergleich (gemessen, Review 11.8.2026). 10 000 lässt jede sinnvolle
 * Schul-Potenz zu (auch 2^64-Reiskorn-Aufgaben) und hält die exakte
 * Arithmetik im Millisekunden-Bereich.
 */
export const TERM_MAX_EXPONENT = 10000;

/** Verschachtelungstiefe eines Term-Baums (Klammern zählen mit). */
function termTiefe(knoten: TermKnoten): number {
  const kinder =
    knoten.args ?? (knoten.content !== undefined ? [knoten.content] : []);
  let tiefste = 0;
  for (const kind of kinder) {
    const t = termTiefe(kind);
    if (t > tiefste) tiefste = t;
  }
  return 1 + tiefste;
}

/**
 * Mini-Konstantenfaltung OHNE mathjs (diese Datei bleibt mathjs-frei):
 * wertet einen variablen- und funktionsfreien Teilbaum aus den
 * erlaubten Operatoren aus. null = nicht konstant faltbar (Variablen,
 * Funktionen, Unbekanntes) – dann greift die Exponenten-Grenze nicht
 * (sqrt(2) oder x im Exponenten sind harmlos, die simplify-Falle
 * betrifft nur exakt auswertbare Zahl-Potenzen).
 */
function termKonstante(knoten: TermKnoten): number | null {
  switch (knoten.type) {
    case "ConstantNode":
      return typeof knoten.value === "number" ? knoten.value : null;
    case "ParenthesisNode":
      return knoten.content ? termKonstante(knoten.content) : null;
    case "OperatorNode": {
      const op = typeof knoten.fn === "string" ? knoten.fn : "";
      const argWerte = (knoten.args ?? []).map(termKonstante);
      if (argWerte.some((wert) => wert === null)) return null;
      const [a, b] = argWerte as number[];
      switch (op) {
        case "add":
          return a + b;
        case "subtract":
          return a - b;
        case "multiply":
          return a * b;
        case "divide":
          return a / b;
        case "pow":
          return Math.pow(a, b);
        case "unaryMinus":
          return -a;
        case "unaryPlus":
          return a;
        default:
          return null;
      }
    }
    default:
      return null;
  }
}

/**
 * Prüft einen geparsten Term-Baum gegen die Whitelists: erlaubt sind
 * Zahlen, + - * / ^, Klammern, die Funktionen aus
 * TERM_ERLAUBTE_FUNKTIONEN (einargumentig) und Symbole aus
 * `erlaubteVariablen` plus pi/e. Alles andere – Zuweisungen,
 * Eigenschaftszugriffe, Strings, Matrizen, fremde Funktionen – wird
 * abgelehnt: Der mathjs-Parser kann weit mehr, als ein Schulterm
 * braucht, und NUR diese Filterung macht das Auswerten von
 * Nutzer-Eingaben sicher. Liefert null, wenn alles in Ordnung ist,
 * sonst den ERSTEN Fehler (für eine ehrliche Meldung).
 * `erlaubteVariablen` undefined = beliebige Variablennamen (die
 * Musterlösungen der AUTOREN definieren die Variablen einer Aufgabe;
 * für Eingaben der LERNENDEN wird deren Menge hereingereicht).
 */
export function termBaumFehler(
  wurzel: TermKnoten,
  erlaubteVariablen?: ReadonlySet<string>,
): TermBaumFehler | null {
  const funktionen = new Set<string>(TERM_ERLAUBTE_FUNKTIONEN);
  const konstanten = new Set<string>(TERM_ERLAUBTE_KONSTANTEN);
  if (termTiefe(wurzel) > TERM_MAX_TIEFE) return { art: "zuTief" };
  let fehler: TermBaumFehler | null = null;
  wurzel.traverse((knoten, pfad, eltern) => {
    if (fehler) return;
    switch (knoten.type) {
      case "ConstantNode":
        // parse('"text"') liefert einen String-, `true` einen
        // boolean-ConstantNode – nur Zahlen sind ein Term.
        if (typeof knoten.value !== "number") {
          fehler = { art: "knoten", typ: knoten.type };
        }
        return;
      case "ParenthesisNode":
        return;
      case "OperatorNode": {
        // Bei OperatorNodes ist fn der Funktionsname als String –
        // die Whitelist sperrt auch !, ', mod, ==, and, % …
        const op = typeof knoten.fn === "string" ? knoten.fn : "";
        if (!TERM_ERLAUBTE_OPERATOREN.has(op)) {
          fehler = { art: "knoten", typ: `Operator:${op}` };
          return;
        }
        // Konstante Riesen-Exponenten («9^9^9» = 9^387420489) blockieren
        // mathjs-simplify sekundenlang (exakte Ganzzahl-Arithmetik) –
        // früh ablehnen; NaN/Infinity als Exponentwert ist ebenso sinnlos.
        if (op === "pow") {
          const exponent = knoten.args?.[1]
            ? termKonstante(knoten.args[1])
            : null;
          if (
            exponent !== null &&
            !(Math.abs(exponent) <= TERM_MAX_EXPONENT)
          ) {
            fehler = { art: "potenz" };
          }
        }
        return;
      }
      case "SymbolNode": {
        // traverse besucht auch den FUNKTIONSNAMEN eines
        // FunctionNode als SymbolNode-Kind (pfad "fn") – der ist
        // bereits über FunctionNode.name geprüft.
        if (pfad === "fn" && eltern?.type === "FunctionNode") return;
        const name = knoten.name ?? "";
        if (konstanten.has(name)) return;
        // Nacktes «sqrt» (ohne Klammern) wäre sonst eine gültige
        // «Variable» – und evaluierte zum Funktionsobjekt.
        if (funktionen.has(name)) {
          fehler = { art: "funktionOhneKlammern", name };
          return;
        }
        if (erlaubteVariablen === undefined || erlaubteVariablen.has(name)) {
          return;
        }
        fehler = { art: "variable", name };
        return;
      }
      case "FunctionNode": {
        const name = knoten.name ?? "";
        if (!funktionen.has(name)) {
          fehler = { art: "funktion", name };
        }
        return;
      }
      default:
        fehler = { art: "knoten", typ: knoten.type };
    }
  });
  return fehler;
}

/**
 * Grobe Zeichen-Prüfung der AUTOREN-Musterlösungen – läuft ohne
 * mathjs im Schema (die echte Parse-Prüfung übernehmen die
 * Node-Validierer und der Player). ASCII-mathjs-Schreibweise:
 * Ziffern, Buchstaben, + - * / ^ ( ) Dezimal-PUNKT und Leerzeichen
 * (BEWUSST ohne Komma – das ist in mathjs ein Argument-Trenner).
 */
export const TERM_ANTWORT_MUSTER = /^[0-9A-Za-z+\-*/^(). ]+$/;

export const termAufgabeSchema = z.strictObject({
  /** Aufgabenstellung, Markdown und Mathe-Notation ($$…$$, KaTeX) erlaubt. */
  prompt: markdown,
  /**
   * Akzeptierte Musterlösungen in mathjs-Schreibweise («2x+6»,
   * «2*(x+3)», «pi*r^2» – Dezimalzahlen mit PUNKT, Potenz «^»,
   * Funktionen aus TERM_ERLAUBTE_FUNKTIONEN). Äquivalente
   * UMFORMUNGEN muss niemand listen (die erkennt der Player);
   * mehrere Einträge sind für WIRKLICH verschiedene akzeptierte
   * Terme da.
   */
  antworten: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
});

/**
 * Term-Eingabe, NEU seit 11.8.2026: eine oder mehrere Teilaufgaben,
 * je ein Eingabefeld für einen mathematischen Term. Jede äquivalente
 * Umformung der Musterlösung zählt als richtig. PRÜFENDER Block –
 * ein Punkt pro Teilaufgabe, bestanden bei 100 %, Auswertung/
 * Wiederholen wie Lückentext, Zuordnung und Zahlenaufgabe
 * (pruefung.tsx).
 */
/** Inhaltsfelder EINER Term-Fassung (Hauptinhalt wie Variante). */
const termInhaltFelder = {
  /** Optionale Arbeitsanweisung, Markdown/Mathe erlaubt. */
  intro: markdown.optional(),
  aufgaben: z.array(termAufgabeSchema).min(1).max(12),
};

export const termVarianteSchema = z.strictObject(termInhaltFelder);
export type TermInhalt = z.infer<typeof termVarianteSchema>;

/** Prüft EINE Fassung; `pfad` prefixt die Fehlermeldungen (Varianten). */
function pruefeTermInhalt(
  inhalt: TermInhalt,
  ctx: z.RefinementCtx,
  pfad: (string | number)[],
): void {
    inhalt.aufgaben.forEach((aufgabe, i) => {
      aufgabe.antworten.forEach((antwort, j) => {
        if (antwort.includes("=")) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "aufgaben", i, "antworten", j],
            message: `Term: Die Antwort "${antwort}" enthält ein Gleichheitszeichen – Musterlösungen sind TERME, keine Gleichungen (statt "y = 2x+6" nur "2x+6" eintragen).`,
          });
        } else if (!TERM_ANTWORT_MUSTER.test(antwort)) {
          ctx.addIssue({
            code: "custom",
            path: [...pfad, "aufgaben", i, "antworten", j],
            message: `Term: Die Antwort "${antwort}" enthält unerlaubte Zeichen – erlaubt ist die mathjs-ASCII-Schreibweise (Ziffern, Buchstaben, + - * / ^ Klammern, Dezimal-PUNKT; "sqrt(x)" statt "√x", "pi" statt "π"). Ob die Antwort parsebar ist, prüft die Validierung beim Einreichen.`,
          });
        }
      });
    });
}

export const termBlockSchema = z
  .strictObject({
    ...blockBase,
    type: z.literal("term"),
    ...termInhaltFelder,
    /** Optionale WEITERE Fassungen (Variante B, C, …) – siehe Varianten-Abschnitt. */
    varianten: z
      .array(termVarianteSchema)
      .min(1)
      .max(VARIANTEN_MAX_ZUSAETZLICH)
      .optional(),
  })
  .superRefine((block, ctx) => {
    if (!block.id) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Term: Der Block braucht eine stabile "id" (z. B. "term1"), damit Lernstatistik und Punktevergabe bei Content-Änderungen korrekt bleiben.',
      });
    } else if (block.id === "quiz") {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          'Term: Die id "quiz" ist für Quizblöcke reserviert – bitte eine andere id wählen.',
      });
    }
    pruefeTermInhalt(block, ctx, []);
    block.varianten?.forEach((variante, i) => {
      pruefeTermInhalt(variante, ctx, ["varianten", i]);
      // >= 1: bei leerem Array meldet Zod bereits too_small (Review 11.8.2026).
      if (variante.aufgaben.length >= 1 && variante.aufgaben.length !== block.aufgaben.length) {
        ctx.addIssue({
          code: "custom",
          path: ["varianten", i, "aufgaben"],
          message: `Term: Variante ${variantenBezeichnung(i + 1)} hat ${variante.aufgaben.length} Teilaufgaben, der Hauptinhalt (Variante A) ${block.aufgaben.length} – alle Fassungen eines Blocks müssen dieselbe Punktzahl haben (der Lernstand zählt pro BLOCK).`,
        });
      }
    });
  });

export const knownBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  audioBlockSchema,
  tasksBlockSchema,
  lueckentextBlockSchema,
  quizBlockSchema,
  zuordnungBlockSchema,
  numerischBlockSchema,
  achseBlockSchema,
  termBlockSchema,
  planspielBlockSchema,
  simulationBlockSchema,
]);

export const KNOWN_BLOCK_TYPES = [
  "text",
  "image",
  "video",
  "audio",
  "tasks",
  "lueckentext",
  "quiz",
  "zuordnung",
  "numerisch",
  "achse",
  "term",
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

/** Alle versionsUNabhängigen Modulfelder – gemeinsame Basis für
 *  moduleSchema (Version 3) und die Legacy-Schemas (Version 1/2). */
const modulBasis = {
  /** Eindeutig, nur Kleinbuchstaben/Ziffern/Bindestriche. Muss dem Ordnernamen entsprechen. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  /** Kurzbeschreibung für den Katalog (1–3 Sätze). */
  description: z.string().min(1),
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

/**
 * LEGACY-Metadaten der Versionen 1/2 (bis 14.8.2026): sechs
 * Top-Level-Felder als Hauptzuordnung plus die Zuordnungstabelle
 * `lehrplaene`. In Version 3 ersetzt `curricula` beides;
 * migriereModulV2 überführt diese Felder verlustfrei.
 */
const legacyMetadatenV2 = {
  /** Fachkürzel nach Lehrplan 21, z. B. "RZG", "NT", "D", "MA". */
  subject: z.string().min(1),
  /** Ausgeschriebener Fachname, z. B. "Räume, Zeiten, Gesellschaften". */
  subjectName: z.string().optional(),
  /** Lehrplan-21-Zyklus: 1 (KG–2. Kl.), 2 (3.–6. Kl.), 3 (Sek I, 7.–9. Kl.). */
  cycle: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  /** Freitext-Angabe der Stufe, z. B. "7.–9. Klasse (Sek I)". */
  grades: z.string().optional(),
  /** Lehrplan-Referenzrahmen, z. B. "lehrplan21" oder "LiLe". */
  curriculum: z.string().min(1).default("lehrplan21"),
  /** Lehrplan-21-Kompetenzen, auf die das Modul einzahlt. */
  competencies: z.array(competencySchema).default([]),
  /** Zuordnungstabelle je Lehrplan (11.8.–14.8.2026). */
  lehrplaene: z.record(z.string(), lehrplanEintragSchema).optional(),
};

/**
 * Herkunfts-Stempel einer SPRACHFASSUNG (`module.<lang>.json`, seit
 * 18.8.2026): verbindet die Fassung mit ihrem Master und macht
 * Veraltung und Handänderungen maschinell erkennbar. Die Prüfsummen
 * sind SHA-256 über Datei-Bytes («sha256:<hex>»); `selfHash` wird über
 * die kanonische Serialisierung der Fassung selbst gerechnet, wobei
 * das Feld währenddessen den Platzhalter "" trägt (deshalb ist der
 * leere String hier gültig). Ob die Werte STIMMEN, prüft der Validator
 * des Content-Repos – das Schema prüft nur die Form.
 */
const derivedFromSchema = z.strictObject({
  /** Sprache des Masters (BCP-47, wie das language-Feld). */
  language: z.string().min(1),
  /** Prüfsumme der Master-Datei, deren Stand übersetzt wurde. */
  masterHash: z.string().regex(/^sha256:[0-9a-f]{64}$/),
  /** Git-Commit des Master-Stands – rein informativ, für Menschen. */
  masterCommit: z.string().optional(),
  /** Prüfsumme der Korrekturhinweis-Datei (null = keine Hinweise). */
  hintsHash: z
    .string()
    .regex(/^sha256:[0-9a-f]{64}$/)
    .nullable(),
  /** Erzeugungsdatum (JJJJ-MM-TT). */
  generatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Erzeugendes Werkzeug samt Version. */
  generator: z.string().min(1),
  /** Verwendetes Übersetzungs-Modell. */
  model: z.string().min(1),
  /** Prüfsumme der Fassung selbst ("" nur während der Berechnung). */
  selfHash: z.string().regex(/^(sha256:[0-9a-f]{64})?$/),
});

export type DerivedFrom = z.infer<typeof derivedFromSchema>;

export const moduleSchema = z
  .strictObject({
    /** Muss SCHEMA_VERSION entsprechen; ältere Dateien liest parseModulDatei. */
    schemaVersion: z.literal(SCHEMA_VERSION),
    /**
     * Sichtbare Warnung in SPRACHFASSUNGEN (module.<lang>.json), als
     * erstes Feld der Datei: automatisch erzeugt, nicht von Hand
     * bearbeiten. Der Validator des Content-Repos erzwingt das Feld
     * dort und verbietet es in Master-Dateien (module.json).
     */
    _hinweis: z.string().min(1).optional(),
    /** Herkunfts-Stempel einer Sprachfassung (nur module.<lang>.json). */
    derivedFrom: derivedFromSchema.optional(),
    /**
     * true = Sprachlernmodul (z. B. die Englischmodule): Die Sprache
     * ist Lerngegenstand, zielsprachliche Inhalte (Hörtexte,
     * Lücken-Antworten) sind der Stoff selbst. Solche Module werden
     * NIE in andere Sprachen übersetzt – der Content-Validator lehnt
     * Sprachfassungen dafür ab, das Übersetzungswerkzeug verweigert
     * sie. Die Plattform darf das Feld zusätzlich nutzen (z. B. für
     * den Fremdsprachen-Banner).
     */
    languageLearning: z.boolean().optional(),
    ...modulBasis,
    /**
     * Lehrplan-Zuordnungen des Moduls (seit Version 3 die EINZIGE
     * Quelle für Fach, Stufe und Kompetenzen): eine Liste – die
     * Reihenfolge ist zugleich die Anzeige-Reihenfolge der
     * «alle Lehrpläne»-Zeile. Fehlt ein Lehrplan, erscheint das Modul
     * bei dieser Auswahl nicht; ohne das Feld erscheint es in keinem
     * Lehrplan-Filter (das Content-Repo verlangt per Validator-Policy
     * mindestens einen Eintrag, lokale Module dürfen ohne auskommen).
     */
    curricula: z.array(curriculumEintragSchema).min(1).max(20).optional(),
  })
  .superRefine((mod, ctx) => pruefeCurricula(mod.curricula, ctx));

/**
 * LEGACY Schema-Version 2 (Juli–August 2026): Metadaten über die sechs
 * Top-Level-Felder plus optionale `lehrplaene`-Tabelle. Bestehende
 * Dateien und gespeicherte lokale Module bleiben gültig –
 * parseModulDatei migriert sie beim Einlesen verlustfrei auf
 * Version 3.
 */
export const moduleV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    ...modulBasis,
    ...legacyMetadatenV2,
  })
  .superRefine((mod, ctx) => pruefeLehrplaene(mod.lehrplaene, ctx));

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
 * LEGACY Schema-Version 1 (bis Juli 2026): wie Version 2, zusätzlich
 * mit dem Quiz-Sonderfeld auf Modulebene. Bestehende Dateien bleiben
 * gültig – parseModulDatei migriert sie beim Einlesen verlustfrei
 * (v1 → v2 → v3).
 */
export const moduleV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  ...modulBasis,
  ...legacyMetadatenV2,
  blocks: z
    .array(z.union([blockSchema, quizArtigerV1Block, zukunftsArtigerV1Block]))
    .min(1),
  /** Optionales Abschlussquiz mit automatischer Auswertung (nur Version 1). */
  quiz: quizSchema.optional(),
}).superRefine((mod, ctx) => pruefeLehrplaene(mod.lehrplaene, ctx));

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
export type ZuordnungElement = z.infer<typeof zuordnungElementSchema>;
export type ZuordnungPaar = z.infer<typeof zuordnungPaarSchema>;
export type ZuordnungBlock = z.infer<typeof zuordnungBlockSchema>;
export type NumerischBlock = z.infer<typeof numerischBlockSchema>;
export type NumerischAufgabe = z.infer<typeof numerischAufgabeSchema>;
export type TermBlock = z.infer<typeof termBlockSchema>;
export type TermAufgabe = z.infer<typeof termAufgabeSchema>;
export type AchseBlock = z.infer<typeof achseBlockSchema>;
export type AchseSkalaDef = z.infer<typeof achseSkalaSchema>;
export type AchseElementDef = z.infer<typeof achseElementSchema>;
export type AudioBlock = z.infer<typeof audioBlockSchema>;
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
export type LearningModuleV2 = z.infer<typeof moduleV2Schema>;
export type LearningModuleV1 = z.infer<typeof moduleV1Schema>;

export function isKnownBlock(block: Block): block is KnownBlock {
  return (KNOWN_BLOCK_TYPES as readonly string[]).includes(block.type);
}

// ---------------------------------------------------------------------------
// Versioniertes Einlesen (v1 → v2 → v3 verlustfrei)
// ---------------------------------------------------------------------------

/**
 * Version-1-Modul verlustfrei auf Version 2 heben: Das Quiz-Sonderfeld
 * wird zum LETZTEN Block mit der id "quiz" – exakt die Position, an der
 * der Player es bisher gerendert hat, und exakt der Schlüssel, unter dem
 * der Lernstand die Ergebnisse führt (pruefSchluessel v1). Fortschritt,
 * Reports und Coin-Vergabe bleiben dadurch unverändert gültig; das
 * veraltete passingScorePercent entfällt ersatzlos (seit Juli 2026 ohne
 * Wirkung). Liefert BEWUSST ein Version-2-Modul mit dem Stempel 2 (nie
 * SCHEMA_VERSION!): parseModulDatei kettet ausdrücklich
 * migriereModulV2(migriereModulV1(…)) – ein v2-förmiges Objekt darf
 * nie Version 3 behaupten, sonst wäre eine vergessene Verkettung für
 * Compiler UND Build unsichtbar.
 */
export function migriereModulV1(alt: LearningModuleV1): LearningModuleV2 {
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
  return { ...rest, schemaVersion: 2 as const, blocks };
}

/**
 * Bekannte Werte des LEGACY-Felds `curriculum` → Lehrplan-Kennung für
 * die implizite Migration ("LiLe" trägt der Grossteil der Bestandsmodule
 * aus Liechtensteiner PRs). UNBEKANNTE Werte werden als rohe Kennung
 * übernommen: nicht filterbar (keine Registry-Zeile), aber Fach, Stufe,
 * Kompetenzen und der Cate-Alterskontext bleiben erhalten –
 * die Migration verliert nie Daten.
 */
const CURRICULUM_ZU_KENNUNG: Record<string, string> = {
  lehrplan21: "ch",
  LiLe: "li",
  lile: "li",
};

/** Zyklus → Klassenstufen (Rückfallebene, wenn der alte Stufen-Freitext keine Zahlen trägt). */
const ZYKLUS_ZU_KLASSEN: Record<1 | 2 | 3, number[]> = {
  1: [1, 2],
  2: [3, 4, 5, 6],
  3: [7, 8, 9],
};

/**
 * Stufen-Bezeichner, den die Migration für Legacy-Einträge mit
 * `selbststudium: true` schreibt (Betreiber-Entscheid 14.8.2026) –
 * dieselbe Konvention nutzen neue Module direkt als `gradesText`.
 */
export const STUFE_OHNE_ZAHL_LABEL = "Erwachsene";

/** Getrimmter Wert oder undefined – leere/Whitespace-Strings fallen weg. */
function migrationsText(wert: string | undefined): string | undefined {
  const getrimmt = wert?.trim();
  return getrimmt ? getrimmt : undefined;
}

/**
 * Klassenstufen-Zahlen aus dem alten Stufen-Freitext ziehen
 * ("9. Klasse (Sek I)" → [9]; "7.–9. Klasse" → [7, 8, 9] – genau zwei
 * Zahlen plus Gedankenstrich/Bindestrich gelten als Bereich). Liefert
 * undefined, wenn keine Zahl im Schulbereich 1–13 vorkommt.
 */
function klassenAusFreitext(text: string | undefined): number[] | undefined {
  if (!text) return undefined;
  const zahlen = [...text.matchAll(/\b\d{1,2}\b/g)]
    .map((treffer) => Number(treffer[0]))
    .filter((zahl) => zahl >= 1 && zahl <= 13);
  if (zahlen.length === 0) return undefined;
  const eindeutig = [...new Set(zahlen)].sort((a, b) => a - b);
  if (eindeutig.length === 2 && /[–—-]/.test(text)) {
    const [von, bis] = eindeutig;
    return Array.from({ length: bis - von + 1 }, (_, i) => von + i);
  }
  return eindeutig;
}

/** Einen Legacy-Lehrplan-Eintrag in die curricula-Form überführen. */
function baueCurriculumEintrag(
  kennung: string,
  alt: {
    fach: string;
    fachName?: string;
    zyklus?: 1 | 2 | 3;
    klassen?: number[];
    selbststudium?: true;
    stufeText?: string;
    kompetenzen?: { code: string; description?: string }[];
  },
): CurriculumEintrag {
  const subjectName = migrationsText(alt.fachName);
  let grades: number[] | undefined;
  let gradesText: string | undefined;
  if (alt.selbststudium === true) {
    // Stufe ohne Zahl: der Bezeichner allein bildet die Stufe.
    gradesText = STUFE_OHNE_ZAHL_LABEL;
  } else if (alt.klassen !== undefined && alt.klassen.length > 0) {
    grades = [...alt.klassen];
  } else {
    // zyklus-Modell: der alte Freitext ist präziser als der Zyklus
    // ("9. Klasse (Sek I)" bei Zyklus 3 heisst wirklich NUR Klasse 9).
    grades =
      klassenAusFreitext(alt.stufeText) ??
      (alt.zyklus !== undefined ? ZYKLUS_ZU_KLASSEN[alt.zyklus] : undefined);
    if (grades === undefined) {
      // Defensiv (regulär unerreichbar): gar keine Stufenangabe – der
      // alte Freitext wird zum alleinstehenden Bezeichner, statt Daten
      // zu verlieren.
      gradesText = migrationsText(alt.stufeText);
    }
  }
  return {
    curriculum: kennung,
    subject: migrationsText(alt.fach) ?? alt.fach,
    ...(subjectName !== undefined ? { subjectName } : {}),
    ...(grades !== undefined ? { grades } : {}),
    ...(gradesText !== undefined ? { gradesText } : {}),
    competencies: alt.kompetenzen ?? [],
  };
}

/**
 * Version-2-Modul verlustfrei auf Version 3 heben: Die explizite
 * `lehrplaene`-Tabelle wird zur curricula-Liste in Registry-Reihenfolge
 * (li, ch, de, at – unregistrierte Kennungen danach in
 * Objektreihenfolge); ohne Tabelle entsteht EIN Eintrag aus den sechs
 * Legacy-Feldern unter der Kennung des `curriculum`-Werts. Die Regeln
 * sind bewusst DEFENSIV (leere Strings fallen weg, Überlängen bleiben
 * unverändert, KEINE Re-Validierung gegen das v3-Schema): heute
 * gespeicherte lokale Module dürfen an den strengeren v3-Feldgrenzen
 * nie scheitern – sie verschwänden sonst kommentarlos aus dem Katalog.
 */
export function migriereModulV2(alt: LearningModuleV2): LearningModule {
  const {
    subject,
    subjectName,
    cycle,
    grades,
    curriculum,
    competencies,
    lehrplaene,
    ...rest
  } = alt;
  const eintraege: CurriculumEintrag[] = [];
  if (lehrplaene !== undefined) {
    const kennungen = Object.keys(lehrplaene);
    const registriert = LEHRPLAENE.map((plan) => plan.kennung) as string[];
    const sortiert = [
      ...registriert.filter((kennung) => kennungen.includes(kennung)),
      ...kennungen.filter((kennung) => !registriert.includes(kennung)),
    ];
    for (const kennung of sortiert) {
      eintraege.push(baueCurriculumEintrag(kennung, lehrplaene[kennung]));
    }
  } else {
    const kennung =
      CURRICULUM_ZU_KENNUNG[curriculum] ?? migrationsText(curriculum);
    if (kennung !== undefined) {
      eintraege.push(
        baueCurriculumEintrag(kennung, {
          fach: subject,
          fachName: subjectName,
          zyklus: cycle,
          stufeText: grades,
          kompetenzen: competencies,
        }),
      );
    }
  }
  return {
    ...rest,
    schemaVersion: SCHEMA_VERSION,
    ...(eintraege.length > 0 ? { curricula: eintraege } : {}),
  };
}

/**
 * EINZIGER Einstiegspunkt zum Einlesen einer Moduldatei: versteht die
 * aktuelle Version UND die Versionen 1/2 (automatisch migriert,
 * v1 → v2 → v3) und liefert immer die aktuelle Form. Loader (Build),
 * Laufzeit-Import lokaler Module und die Content-Repo-Validierung
 * nutzen alle diese Funktion.
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
      ? { success: true, data: migriereModulV2(migriereModulV1(alt.data)) }
      : { success: false, error: alt.error };
  }
  if (version === 2) {
    const alt = moduleV2Schema.safeParse(raw);
    return alt.success
      ? { success: true, data: migriereModulV2(alt.data) }
      : { success: false, error: alt.error };
  }
  // Neuere Formatversion als dieser Player: klare Meldung statt eines
  // kryptischen Literal-Fehlers – trifft z. B. offline gecachte alte
  // App-Stände, die ein frisch geteiltes Modul importieren sollen.
  if (typeof version === "number" && version > SCHEMA_VERSION) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          path: ["schemaVersion"],
          message: `Dieses Modul stammt aus einer neueren EveryCate-Version (Format ${version}, diese App versteht bis ${SCHEMA_VERSION}). Bitte die App neu laden bzw. aktualisieren und den Import wiederholen.`,
          input: version,
        },
      ]),
    };
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
export const PRUEFENDE_BLOCK_TYPES = [
  "lueckentext",
  "quiz",
  "zuordnung",
  "numerisch",
  "achse",
  "term",
] as const;

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


/**
 * Erreichbare Punkte eines prüfenden Blocks – spiegelt EXAKT die
 * maxPoints-Berechnung der Player beim Prüfen: Quiz = Summe der
 * Fragenpunkte (Quiz.tsx), Lückentext = Anzahl Lücken bzw. im
 * satzbau-Modus Anzahl Bausteine (LueckentextBlockView), Zuordnung =
 * Anzahl Paare (pruefung.tsx zählt die ergebnisse), numerisch/term =
 * Anzahl Aufgaben, achse = Anzahl Elemente, Simulation mit
 * Abschlussfrage = Punkte dieser einen Frage. Unbekannte künftige
 * prüfende Typen liefern undefined (Fallback beim Aufrufer). Lebt seit
 * 18.8.2026 in der SYNC-Region, damit dieselbe Rechenstelle das
 * Katalog-DTO der Plattform (meta.ts maxPunkteVonBlock delegiert
 * hierher), die Strukturgleichheits-Prüfung von Sprachfassungen im
 * Content-Repo und das Übersetzungswerkzeug speist.
 */
export function punkteVonBlock(block: Block): number | undefined {
  // Der Guard verengt die Block-Union auf die bekannten Typen –
  // Zukunftsblöcke (unbekannter type) liefern undefined (Fallback).
  if (!isKnownBlock(block)) return undefined;
  switch (block.type) {
    case "quiz":
      return block.questions.reduce((sum, q) => sum + q.points, 0);
    case "lueckentext":
      return block.modus === "satzbau"
        ? block.bausteine?.length
        : block.luecken?.length;
    case "zuordnung":
      return block.paare.length;
    case "numerisch":
      return block.aufgaben.length;
    case "term":
      return block.aufgaben.length;
    case "achse":
      return block.elemente.length;
    case "simulation":
      return block.abschlussfrage ? block.abschlussfrage.points : undefined;
    default:
      return undefined;
  }
}

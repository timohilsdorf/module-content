/**
 * Geteilte Text-Prüfungen für Modul-Strings – EINE Quelle für
 * schema/validate.ts, die Fassungs-Prüfung (pruefung.ts) und das
 * Übersetzungswerkzeug (uebersetze.ts). Unverändert aus validate.ts
 * hierher gezogen (18.8.2026), Verhalten identisch.
 */

function stripCode(value: string): string {
  return value.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}

/**
 * Findet Roh-HTML in einem String. Erlaubt bleiben Markdown-Autolinks
 * (`<https://…>`, `<mailto:…>`) sowie Tag-Beispiele in Code-Spans und
 * Code-Blöcken (dort rendert Markdown sie als Text, z. B. wenn ein Modul
 * HTML erklärt). Alles andere, das wie ein Tag aussieht, wird gemeldet –
 * der Player rendert kein HTML, in Markdown-Feldern würde es sogar
 * verschluckt.
 */
export function findHtmlTags(value: string): string[] {
  const matches = stripCode(value).match(/<\/?[a-zA-Z][^>]*>/g) ?? [];
  return matches.filter((m) => !/^<(https?:\/\/|mailto:)/i.test(m));
}

/**
 * Bilder in Markdown-Text (`![alt](url)`): unterliegen denselben Regeln wie
 * image-Blöcke – sonst liesse sich die Bild-Host-Whitelist per Textfeld
 * umgehen (automatischer Request an Drittserver = Tracking-Risiko).
 * Referenz-Stil (`![alt][ref]`) ist nicht erlaubt, damit die URL immer
 * direkt an der Bildstelle prüfbar ist.
 */
export function findMarkdownImages(value: string): {
  urls: string[];
  malformed: number;
} {
  const text = stripCode(value);
  const inline = /!\[[^\]]*\]\(\s*<?([^\s)>]+)[^)]*\)/g;
  const urls: string[] = [];
  let match: RegExpExecArray | null;
  let wellFormed = 0;
  while ((match = inline.exec(text)) !== null) {
    urls.push(match[1]);
    wellFormed++;
  }
  const total = (text.match(/!\[/g) ?? []).length;
  return { urls, malformed: total - wellFormed };
}

/**
 * Lesbare Zod-Fehlermeldungen – EINE Rechenstelle für schema/validate.ts
 * und das Übersetzungswerkzeug (Review-Fund 18.8.2026: der Abbruchpfad
 * des Werkzeugs zeigte bei Block-Union-Fehlern nur «Invalid input»,
 * während der Validator die präzise superRefine-Meldung auflöste).
 * Unverändert aus validate.ts hierher gezogen.
 */
import type { z } from "zod";
import { KNOWN_BLOCK_TYPES, knownBlockSchema } from "../schema/schema";

function valueAtPath(value: unknown, pathParts: PropertyKey[]): unknown {
  return pathParts.reduce<unknown>(
    (acc, key) =>
      acc == null ? undefined : (acc as Record<PropertyKey, unknown>)[key],
    value,
  );
}

/**
 * Macht Zod-Fehler für Content-Autoren (Mensch wie KI) lesbar. Zods
 * Union-Heuristik verwirft bei `blocks` die präzisen Issues des bekannten
 * Block-Zweigs – deshalb wird ein Block mit bekanntem `type` gezielt
 * nachvalidiert.
 */
export function describeIssues(raw: unknown, error: z.ZodError): string[] {
  const lines: string[] = [];

  const walk = (issues: z.core.$ZodIssue[], basePath: PropertyKey[]) => {
    for (const issue of issues) {
      const fullPath = [...basePath, ...issue.path];
      const pathStr = fullPath.join(".") || "(root)";

      const value = valueAtPath(raw, fullPath);
      const type =
        value && typeof value === "object"
          ? (value as { type?: unknown }).type
          : undefined;
      if (
        typeof type === "string" &&
        (KNOWN_BLOCK_TYPES as readonly string[]).includes(type) &&
        (issue.code === "invalid_union" ||
          issue.message.includes("Bekannter Blocktyp"))
      ) {
        const sub = knownBlockSchema.safeParse(value);
        if (!sub.success) {
          walk(sub.error.issues, fullPath);
          continue;
        }
      }

      if (issue.code === "invalid_union") {
        const branches = (issue as { errors?: z.core.$ZodIssue[][] }).errors;
        if (branches?.length) {
          for (const branch of branches) walk(branch, fullPath);
          continue;
        }
      }

      lines.push(`  - ${pathStr}: ${issue.message}`);
    }
  };

  walk(error.issues, []);
  return [...new Set(lines)];
}

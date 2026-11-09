// Resolve hook so plain `node` can run the app's TypeScript modules directly.
//
// Node 24 strips TypeScript types on its own, but it does not read tsconfig's
// `paths`, so every `@/lib/...` import inside the app fails. This maps that
// prefix onto the repo root and supplies the extension the source omits.
//
// Usage (from a .mjs entry point, before any `@/` import):
//   import { register } from "node:module";
//   register("./ts-alias-loader.mjs", import.meta.url);
//   const mod = await import("@/lib/whatever");

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);

  const base = path.join(root, specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  return nextResolve(specifier, context);
}

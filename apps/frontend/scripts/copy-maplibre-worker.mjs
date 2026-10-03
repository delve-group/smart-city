// MapLibre 6 loads its worker as a separate ES module, which Next's bundler does not emit.
// Serve the installed worker (and the shared chunk it imports) from public/ instead.
import { cpSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/maplibre-gl/dist/", import.meta.url);
const to = new URL("../public/maplibre/", import.meta.url);

mkdirSync(to, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  cpSync(new URL(file, from), new URL(file, to));
}

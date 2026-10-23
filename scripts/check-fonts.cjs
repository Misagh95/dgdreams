const d = require("../node_modules/next/dist/compiled/@next/font/dist/google/font-data.json");
const names = ["Archivo", "Archivo Narrow", "IBM Plex Mono", "Barlow Condensed", "Roboto Condensed"];
for (const k of names) {
  const f = d[k];
  if (!f) {
    console.log(k, "MISSING");
    continue;
  }
  const axes = (f.axes || [])
    .map((a) => a.tag + (a.min !== undefined ? "(" + a.min + "-" + a.max + ")" : ""))
    .join(",");
  console.log(
    "==",
    k,
    "| weights:",
    (f.weights || []).join(","),
    "| styles:",
    (f.styles || []).join(","),
    "| axes:",
    axes
  );
}

// Builds mradar-submission.pdf from pixel-exact renders of each main slide, so gradients and
// shadows match the audience view (PDF viewers mangle clipped gradient text in print output).
// Needs `puppeteer-core` and Google Chrome: node export-pdf.mjs [chrome-path]
import puppeteer from "puppeteer-core";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const chrome = process.argv[2] ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const pages = mkdtempSync(path.join(tmpdir(), "mradar-deck-"));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, protocolTimeout: 120000 });
const deck = await browser.newPage();
await deck.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
await deck.goto("file://" + path.join(here, "index.html"), { waitUntil: "networkidle0" });
await deck.evaluate(() => document.fonts.ready);
await deck.addStyleTag({ content: "#controls,#controlsToggle,#status{display:none!important}" });
const files = [];
for (const [n, index] of (await deck.evaluate(() => [...window.deck.main])).entries()) {
  await deck.evaluate((i) => window.deck.show(i), index);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const file = path.join(pages, `page-${n + 1}.jpg`);
  await deck.screenshot({ path: file, type: "jpeg", quality: 90 });
  files.push(file);
}
const sheet = path.join(pages, "pdf.html");
writeFileSync(sheet, `<!doctype html><style>@page{size:1920px 1080px;margin:0}*{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>${files.map((f) => `<img src="file://${f}">`).join("")}`);
const print = await browser.newPage();
await print.goto("file://" + sheet, { waitUntil: "networkidle0" });
await print.pdf({ path: path.join(here, "mradar-submission.pdf"), printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log(`Wrote mradar-submission.pdf (${files.length} pages)`);

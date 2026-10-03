import puppeteer from "puppeteer-core";
export const BASE = "http://localhost:3000";
export const OUT = new URL("./shots/", import.meta.url).pathname;
export async function launch() {
  return puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true, protocolTimeout: 120000, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
}
export async function page(browser, { width = 1600, height = 1000, dark = false, mobile = false } = {}) {
  const p = await browser.newPage();
  await p.setViewport({ width, height, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile });
  await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: dark ? "dark" : "light" }, { name: "prefers-reduced-motion", value: "reduce" }]);
  return p;
}
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export async function hideDevBadge(p) {
  await p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {});
}
export async function shot(p, name) { await hideDevBadge(p); await wait(300); await p.screenshot({ path: OUT + name + ".png" }); console.log("shot", name); }
export async function press(p, text, { exact = false, tag = "button" } = {}) {
  for (let i = 0; i < 20; i++) {
    const ok = await p.evaluate((text, exact, tag) => {
      const els = [...document.querySelectorAll(tag)];
      const el = els.find((e) => { const t = e.textContent.replace(/\s+/g, " ").trim(); return exact ? t === text : t.includes(text); });
      if (!el || el.disabled) return false;
      el.scrollIntoView({ block: "center" }); el.click(); return true;
    }, text, exact, tag);
    if (ok) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("No button: " + text);
}

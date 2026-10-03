#!/usr/bin/env node
// Usage: node verify.mjs deck.html --playwright /path/to/playwright/index.mjs --browser chrome
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const args = process.argv.slice(2);
if (!args[0] || args[0].startsWith('--')) throw new Error('Supply a deck HTML path. Optional: --playwright <module-path> --browser chrome');
const option = name => args[args.indexOf(name) + 1];
const modulePath = args.includes('--playwright') ? option('--playwright') : null;
const {chromium} = await import(modulePath ? pathToFileURL(path.resolve(modulePath)).href : 'playwright');
const file = path.resolve(args[0]);
const out = path.join(path.dirname(file), 'qa');
await fs.mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true, ...(args.includes('--browser') ? {channel:option('--browser')} : {})});
const context = await browser.newContext({viewport:{width:1440,height:810},reducedMotion:'reduce',acceptDownloads:true});
const errors = [], network = [], report = {file, checks:[], slides:[]};
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route(/^https?:/, route => { network.push(route.request().url()); return route.abort(); });
const page = await context.newPage();
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); };
try {
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => window.deck?.slides.length);
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(() => ({length:deck.slides.length,main:[...deck.main],backup:[...deck.backup]}));
  for (let i = 0; i < info.length; i++) {
    await page.evaluate(index => { deck.show(index); document.body.classList.remove('controls-visible'); }, i);
    await page.waitForTimeout(100);
    const problems = await page.evaluate(() => {
      const slide = deck.slides[deck.current], box = slide.getBoundingClientRect(), problems = [];
      if (slide.scrollWidth > slide.clientWidth + 1 || slide.scrollHeight > slide.clientHeight + 1) problems.push('slide overflow');
      slide.querySelectorAll('h1,h2,h3,p,img,[data-check-bounds]').forEach(el => {
        if (el.closest('[data-allow-overflow]')) return;
        const b = el.getBoundingClientRect();
        if (b.width && b.height && (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1)) problems.push('out of bounds: ' + (el.textContent.slice(0,70) || el.tagName));
        if (el.tagName === 'IMG' && (!el.complete || !el.naturalWidth)) problems.push('broken image');
      });
      return problems;
    });
    report.slides.push({slide:i+1,problems});
    assert.deepEqual(problems, [], `Slide ${i+1} layout`);
    await page.screenshot({path:path.join(out,`slide-${String(i+1).padStart(2,'0')}.png`)});
  }
  report.checks.push('All slide bounds and images');
  await page.evaluate(() => deck.show(deck.main.at(-1)));
  await page.keyboard.press('ArrowRight');
  check('Main ending stays out of appendix', await page.evaluate(() => deck.current === deck.main.at(-1)));
  if (info.backup.length) {
    await page.keyboard.press('a');
    check('Appendix opens', await page.evaluate(() => deck.inAppendix));
    await page.keyboard.press('a');
    check('Appendix returns to previous main slide', await page.evaluate(() => deck.current === deck.main.at(-1)));
  }
  await page.keyboard.press('Home');
  const [speaker] = await Promise.all([context.waitForEvent('page'),page.keyboard.press('p')]);
  await speaker.waitForFunction(() => document.getElementById('notes')?.textContent.length > 0);
  check('Speaker notes match selected slide', await speaker.locator('#notes').textContent() === await page.evaluate(() => deck.config.notes[deck.slides[deck.current].id].text));
  check('Current and next previews exist', await speaker.locator('#currentPreview').getAttribute('srcdoc') && (info.main.length === 1 || await speaker.locator('#nextPreview').getAttribute('srcdoc')));
  if (info.main.length > 1) {
    check('Next preview does not show end label', !await speaker.locator('#endLabel').isVisible());
    await page.evaluate(() => deck.show(deck.main.at(-1)));
    await speaker.waitForFunction(() => !document.getElementById('endLabel').hidden);
    check('End of section is explicit', await speaker.locator('#endLabel').isVisible());
    await page.keyboard.press('Home');
    await speaker.waitForFunction(() => document.getElementById('endLabel').hidden);
    await speaker.locator('#next').click();
    check('Speaker → audience sync', await page.evaluate(() => deck.current === deck.main[1]));
    await page.keyboard.press('ArrowLeft');
    await speaker.waitForFunction(() => document.getElementById('counter').textContent.startsWith('1 /'));
    check('Audience → speaker sync', await page.evaluate(() => deck.current === deck.main[0]));
  }
  await speaker.locator('#timer').click();
  await page.waitForTimeout(1100);
  await speaker.locator('#timer').click();
  const paused = await page.evaluate(() => deck.elapsed);
  await page.waitForTimeout(300);
  check('Timer starts and pauses', paused > 900 && Math.abs(await page.evaluate(() => deck.elapsed) - paused) < 80);
  await speaker.screenshot({path:path.join(out,'presenter.png')});
  await speaker.close();
  const [reopened] = await Promise.all([context.waitForEvent('page'),page.keyboard.press('p')]);
  await reopened.waitForFunction(() => document.getElementById('notes')?.textContent.length > 0);
  check('Speaker reopening preserves timer', Math.abs(await page.evaluate(() => deck.elapsed) - paused) < 80);
  await reopened.locator('#timer').click();
  await page.waitForTimeout(250);
  check('Timer resumes', await page.evaluate(() => deck.elapsed) > paused + 150);
  await reopened.locator('#reset').click();
  check('Timer resets', await page.evaluate(() => deck.elapsed === 0 && !deck.running));
  await reopened.close();
  const editable = page.locator('.slide.active [data-key]').first();
  if (await editable.count()) {
    const key = await editable.getAttribute('data-key');
    const original = await editable.innerHTML();
    await page.keyboard.press('e');
    await editable.fill('Verified local edit');
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForFunction(() => window.deck);
    check('Edits survive reload', await page.locator(`[data-key="${key}"]`).textContent() === 'Verified local edit');
    const [download] = await Promise.all([page.waitForEvent('download'),page.evaluate(() => deck.export())]);
    const exported = path.join(out,'exported-check.html');
    await download.saveAs(exported);
    const exportedPage = await context.newPage();
    await exportedPage.goto(pathToFileURL(exported).href);
    await exportedPage.waitForFunction(() => window.deck);
    check('Export preserves edit and resets state', await exportedPage.evaluate(key => deck.current === deck.main[0] && !deck.editing && document.querySelector(`[data-key="${key}"]`).textContent === 'Verified local edit', key));
    const [exportSpeaker] = await Promise.all([context.waitForEvent('page'),exportedPage.keyboard.press('p')]);
    await exportSpeaker.waitForFunction(() => document.getElementById('notes')?.textContent.length > 0);
    report.checks.push('Exported presenter mode works');
    await exportSpeaker.close(); await exportedPage.close();
    await page.evaluate(({key, original}) => {
      const node = document.querySelector(`[data-key="${key}"]`); node.innerHTML = original;
      node.dispatchEvent(new Event('input',{bubbles:true}));
    }, {key,original});
    // The export is a QA scratch file, not an alternate delivery artifact.
    await fs.unlink(exported);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(() => { deck.fit(); document.body.classList.remove('controls-visible'); });
  check('Narrow viewport retains 16:9 without scrolling', await page.evaluate(() => {
    const b = document.getElementById('deckStage').getBoundingClientRect();
    return Math.abs(b.width / b.height - 16 / 9) < .01 && b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth;
  }));
  await page.screenshot({path:path.join(out,'mobile.png')});
  assert.deepEqual(network, [], 'Deck must not request external resources');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  report.checks.push('Offline: no network requests', 'No browser runtime errors');
  report.passed = true;
} catch (error) {
  report.passed = false; report.error = String(error); throw error;
} finally {
  report.browserErrors = errors; report.networkRequests = network;
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
console.log(`Passed ${report.checks.length} checks; screenshots and report: ${out}`);

# mRadar submission deck

Ten-slide HackYeah submission presentation, built with the repository's [HTML presentations skill](../../.agents/skills/html-presentations/SKILL.md).

- `mradar-submission.pdf` — the PDF to upload (10 pages, 16:9).
- `index.html` — the offline deck. Press `P` for the speaker window with notes and timers (a 4-minute talk).
- `source/` — editable slides, theme and notes. Screenshots in `source/assets/` were taken from `npm run dev:ui` (fictional demo data).

After editing `source/`, run `python3 build.py`, then `node export-pdf.mjs` (needs `puppeteer-core` and Google Chrome) to refresh the PDF.

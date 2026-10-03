# Submission presentation

`mradar-submission.pdf` is the 10-slide HackYeah submission deck (1920×1080). Its source is `deck.html`; the screenshots in `shots/` were taken from `npm run dev:ui` (mock data) at 2× and downscaled.

To rebuild the PDF after editing `deck.html`, install `puppeteer-core` next to `render.mjs` (it drives the installed Google Chrome) and run `node render.mjs`.

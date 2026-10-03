# mRadar submission deck

Twelve-slide HackYeah submission presentation in Polish, built with the repository's [HTML presentations skill](../../.agents/skills/html-presentations/SKILL.md). It is written to be read on its own, without a speaker.

- `mradar-submission.pdf` — the PDF to upload (12 pages, 16:9).
- `index.html` — the offline deck. Press `P` for the speaker window with notes and timers.
- `source/` — editable slides, theme and notes. Screenshots in `source/assets/pl-*.jpg` were taken from the local app (current `main`, Polish interface, fictional fixture data from `npm run db:seed`), because local search needs Qdrant and staff screens need a sign-in. Device frames are Apple product bezels (iPhone 17, iMac M4) from Apple Design Resources, used under Apple's licence for mock-ups.

The closing slide lists the production URLs. Staff passwords are never in the deck; they go in a separate note attached to the submission.

After editing `source/`, run `python3 build.py`, then `node export-pdf.mjs` (needs `puppeteer-core` and Google Chrome) to refresh the PDF.

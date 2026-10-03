---
name: html-presentations
description: Create or edit polished, brand-aware HTML slide decks with a separate presenter window, synchronized slide previews, speaker notes, timers, keyboard navigation, appendix slides, and offline HTML export. Use for HTML presentations, pitch decks, demo-day talks, conference talks, speaker-led slides, or requests for presenter mode, including presentations based on an existing deck. Prefer this skill when the deliverable is HTML; do not substitute PowerPoint or a website framework unless requested.
---

# HTML presentations

Build a speaker-led visual story and a dependable presentation tool. Use the included starter for a new deck. Preserve an existing deck's identity and working features when editing it.

## 1. Establish the brief and the brand

Read the repository's `AGENTS.md`, relevant knowledge entry points, and the owning project's instructions. Find its design tokens, fonts, logos, components and image assets. Product branding takes precedence over organisation branding when the deck concerns that product.

Inspect the supplied reference deck or screenshots before extracting its visual grammar. Reuse its hierarchy, rhythm and useful interaction patterns; do not carry over private names, metrics, photos, brand assets or machine-specific paths into unrelated projects.

Resolve only missing decisions that materially change the result:

- Audience, purpose and the action they should take.
- Speaking time, slide language and narration language; these can differ.
- Existing content, required proof, approved assets and any forbidden topics.

Use the current conversation for answers already provided. If details are optional, state a reasonable assumption and continue. If the user has approved the outline or asks for a specific edit, implement it without another approval loop.

## 2. Write the story before laying out slides

Outline each slide as **one takeaway + evidence/visual + spoken point + time budget**. Choose the number of slides to fit the talk; never impose a fixed slide count. Put detail for questions in an appendix. Keep the last main slide on a concrete ask.

For a founder introduction, a useful optional arc is people → shared origin → problem discovered → first focused solution → observed signals → larger vision → ask. Use it only when it fits the actual request. A product demo is optional, not a default requirement.

Separate confirmed facts, customer reports, current availability, plans and estimates. Verify external claims using dated primary sources. Put source links and methodology in notes or appendix, with concise on-slide attribution where helpful. Never invent traction, biographies, market counts, unit economics, revenue projections or financing asks. A TAM/SAM/SOM request does not justify treating GMV as software revenue or inventing per-client economics.

Write natural speaker notes that add context instead of repeating the slide. Their main-slide durations should sum to the agreed talk length; appendix time is separate.

## 3. Create or edit the portable deck

For a new deck, resolve this skill directory and run:

```sh
python3 <skill-dir>/scripts/new_deck.py <repo>/artifacts/<deck-name> --title "Presentation title" --lang en
```

This creates an editable `source/`, a portable `build.py`, and `index.html`. The initializer refuses to overwrite an existing directory. All starter copy is illustrative: replace it before delivering a real presentation.

Read [the authoring contract](references/authoring.md) for file ownership, data structures, assets and integration with an existing deck. Read only files needed for the current edit. The starter's core files are:

- `source/slides.html`: authored slides and stable editable text keys.
- `source/theme.css`: project-specific visual language.
- `source/deck.json`: identity, language, speaker notes and timing keyed by slide id.
- `source/stage.css`, `runtime.js`, `presenter.html`, `presenter.js`, `shell.html`: presentation mechanics and UI.

Adapt the theme to the repository. The supplied colours and system font are a fallback, not a universal brand. Localise controls, help and runtime messages when appropriate. Keep the starter's fixed 1920 × 1080 canvas, scaled uniformly to fit any viewport; mobile gets a letterboxed slide, not a rearranged webpage.

Use large typography, deliberate whitespace, strong contrast and varied compositions. Prefer a meaningful photo, diagram, product screen or focused chart over ornamental cards. Keep text short enough to read while listening. Preserve real aspect ratios and use deliberate crops. Move excess detail to notes or appendix instead of shrinking type until it becomes unreadable.

Rebuild after every source change:

```sh
python3 <deck-dir>/build.py
```

The builder embeds CSS, JavaScript, local images and fonts into one offline HTML. Keep authoring sources alongside the output so later changes remain manageable. Never use CDN dependencies, remote fonts, absolute author-machine paths, or runtime fetches in the delivered deck.

## 4. Preserve presenter behaviour

A separate speaker window is the default. `P` or **Present** opens it through a user gesture. It contains current and next slide previews, notes, per-slide and total timing, and navigation. Audience navigation updates it, and its controls update the audience. Timers start explicitly and support pause/resume/reset. Closing and reopening the speaker window preserves the audience position and timer state.

Ordinary navigation stops at the last main slide. `A` opens the appendix and returns to the previous main slide. Support keyboard navigation, touch swipes, fullscreen, visible focus states, and reduced motion. Keep presentation controls outside slide content and hide them when idle.

`E` enables local text editing; Ctrl/Cmd+S or **Save** downloads a standalone edited HTML. Stable keys and source revisions prevent older browser edits from overriding rebuilt content. Pasted text is plain text; stored edits are sanitised. Exports reset transient presentation state. Explain that browser edits must be copied back to source before a rebuild if they should persist there.

Notes are hidden from the audience **visually**, but embedded in the file. Do not call them confidential or stripped from export. For presenting, share only the audience window. If popups are blocked, show an actionable message; never reveal notes on the audience screen as an automatic fallback. See [presenter behaviour and checks](references/presenter.md).

## 5. Verify the artifact, then deliver

Use the available browser tooling or Playwright from the environment. Do not assume a hardcoded runtime path. The bundled verifier accepts an installed Playwright module path:

```sh
node <skill-dir>/scripts/verify.mjs <deck-dir>/index.html --playwright <path-to-playwright/index.mjs> --browser chrome
```

It checks offline loading, slide bounds, images, main/appendix navigation, speaker synchronization in both directions, notes, timers, speaker reopening, editing, persistence, export and a narrow viewport. It writes screenshots and a report in `<deck-dir>/qa/`. The checks are a starting point, not proof that the story or every layout is good.

Inspect screenshots of every slide and the presenter window. Fix clipped text, awkward wraps, unintended overlaps, unreadable labels, bad crops, placeholder content and unsupported claims. Confirm notes and timings still match after reordering slides. For a small later edit, verify affected slides and behaviour rather than rerunning unrelated research.

Deliver a clickable HTML file and, when helpful, open it in the app. Briefly give the presenter shortcut and mention any actual limitations. Include the source directory for future edits. Keep any source/knowledge documentation required by the repository accurate; do not turn a one-off presentation choice into an organisation-wide rule.

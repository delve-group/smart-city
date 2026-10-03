# Authoring contract

## Source and output

The initializer copies `assets/starter/` into the requested deck's `source/` and copies the builder to its root. `python3 build.py` works without the installed skill or third-party Python packages. It reads its sibling `source/` and writes `index.html`. `--output <path>` can change the output location.

Do not edit generated HTML when maintainable source exists. Rebuild it. Browser text edits live in local storage and in downloaded exports, not in `source/slides.html`; reconcile them before rebuilding. To modify an existing deck without sources, preserve a backup and inspect its controller/storage model before editing.

## Markup

```html
<section class="slide" id="problem">
  <div class="brand">Project brand</div>
  <p class="eyebrow" data-key="problem-eyebrow">The problem</p>
  <h2 data-key="problem-title">One concrete takeaway.</h2>
  <p class="lead" data-key="problem-detail">Short supporting evidence.</p>
</section>
<section class="slide" id="methodology" data-kind="appendix">…</section>
```

Slides are direct children of `#deckStage`; the shell supplies that container. Give each slide a unique id and each editable text block a unique `data-key`. Do not nest editable blocks. Keep links, images and complex charts outside editable blocks, whose sanitizer retains only text and `br`, `em`, `strong`, `span`, `small`. Harmless classes survive; arbitrary attributes do not.

Do not add script, style, iframe or external resource tags to slide markup. Put styles in `theme.css` and behaviour in `runtime.js`. A local SVG image is supported as an asset. Build error messages flag missing assets, invalid keys and note mismatches.

## Notes

```json
{
  "id": "unique-deck-slug",
  "title": "A meaningful title",
  "lang": "en",
  "notes": {
    "problem": {"seconds": 45, "text": "Spoken context.\n\nTransition to the next point."},
    "methodology": {"seconds": 0, "text": "Sources, dates, caveats and calculation details."}
  }
}
```

The notes keys must match slide ids exactly. Stable ids make reordering safer. `seconds` is a nonnegative target duration, not a command to advance automatically. Main-slide targets determine the total target; appendix durations are excluded. Set the HTML language to the slide language; notes may use another language.

## Assets and typography

Copy approved assets into `source/assets/`, then use relative references such as `src="assets/team.jpg"` or `url("assets/font.woff2")`. The builder embeds these assets as data URIs. It refuses external asset URLs and paths escaping `source/`. Ordinary source/contact hyperlinks may remain external. No asset download is implied by the skill.

Use local licensed fonts when available, otherwise a reliable system stack. Compress oversized photos appropriately when needed; preserve faces and important details. CSS `object-fit` and `object-position` allow non-destructive crops. Do not replace a person's image with an invented likeness.

The starter uses a 1920 × 1080 canvas. Suggested hierarchy: 80–110 px headline, 30–42 px body, 20–25 px secondary text. These are starting points: shorten, split or redesign before reducing below readable projected sizes. Do not apply viewport units to slide text; scale the entire canvas.

## Existing presentations

Preserve the original style and approved content. If it already has reliable presenter mode, do not replace its controller just to use the starter. If it only has an audience-visible notes overlay, describe that distinction and implement a separate speaker window when requested. Integrate the same behavioural contract, adapting selectors rather than duplicating controllers. Test existing keyboard shortcuts and export again after integrating.

## Limits

The starter is for static HTML/CSS slides and local images. Live embeds, video playback, interactive demos and shared remote presenter control need deliberate extensions and their own verification. The speaker window uses `window.opener` and a sandboxed static iframe for each preview. It works offline in tested desktop browsers; environments that block popups or opener access require opening the HTML in a normal desktop browser. Never silently fall back to showing notes on the audience screen.

# Presenter mode and acceptance checks

## Interaction contract

- Audience: fixed 16:9 canvas, with no notes or timer visible on the slide.
- Speaker: separate window showing current and next previews, notes, current section/slide number, total and per-slide elapsed time, and planned durations.
- Navigation: arrows, Page Up/Down and Space stay within the current section. Home selects the first main slide. End selects the last slide in the current section. `A` toggles appendix/return. Main-story completion must not accidentally reveal appendix content.
- Synchronization: commands from either window update both; previews and notes refer to the same stable slide id.
- Timing: manual start, pause/resume, reset. Slide elapsed time resets when the selected slide changes. Total time continues across navigation. Reopening the speaker window preserves timing while the audience remains open. Reloading the audience resets timing and requires reopening presenter mode.
- Fullscreen: `F` operates the audience window. Browsers may require a user gesture or their own fullscreen command.
- Editing: `E`; navigation shortcuts must not fire while typing. Escape finishes editing. Save exports a self-contained HTML with edits and embedded notes, without edit mode or open dialogs.
- Popup failure: visible audience-side status message with instructions to allow popups. Never automatically show notes in that window.

## Rehearsal checklist

1. Open the exported HTML directly via `file://`, disconnect network or block requests, and confirm all fonts/images/slides still work.
2. Open presenter mode with a click or `P`. Move it to a second display. Share only the audience window.
3. Advance from each window. Check current preview, next preview, note and counter. The last slide of a section has an explicit end indication rather than a misleading preview.
4. Start/pause/resume/reset timing; navigate while paused and running. Close/reopen the speaker window. Confirm audience position and timer state stay coherent.
5. Reach the closing slide and press next. It stays there. Enter appendix and return; the previous main slide returns.
6. Check keyboard focus, fullscreen failure messaging, narrow-screen fitting and reduced motion. No page scrolling or slide reflow should appear.
7. Edit a text block, reload, export, reopen the export and open its presenter mode. The edit persists; source updates must not be masked by old browser-local edits.
8. Review every rendered slide and the speaker window. Automated bounds checks cannot judge meaningful crops, reading density or storytelling.

The script `scripts/verify.mjs` automates the repeatable subset. It needs Playwright and a browser supplied by the environment; discover those paths instead of installing global packages or copying one machine's paths into the skill. If browser execution is unavailable, run the builder and static checks, keep the artifact, and report exactly which interaction checks remain unverified.

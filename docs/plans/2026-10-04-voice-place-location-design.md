# Named venues and early voice map preview

## Intent

For the demo observation "Dzień dobry, są zepsute toalety na Tauron Arenie", the recognizable venue is a sufficient location. Asking the resident to choose unrelated street numbers or transit stops prevents useful clarification. When an address does need clarification, the map should already show the place the assistant is discussing.

## Chosen scope

Reuse actual Photon geography rather than adding a venue catalogue with manually maintained coordinates or relying on prompt-only guesses. Preserve place names in candidate labels. A unique exact normalized name match selects a named venue from its nearby suggestions; multiple matching records remain ambiguous. Normalize the demo venue's Polish inflections without adding geography. Other named landmarks use the same exact-match rule.

The existing session-bound location tool remains read-only. Its browser adapter previews the first actual candidate before returning the result to the provider and identifies that provisional target in `map_preview`. The v5 prompt starts ambiguous clarification with this label, accepts a resolved venue name without an exact-number question and resolves corrected addresses immediately. Useful floor/sector/toilet details may be unknown. A preview never changes the draft or bypasses final revision agreement.

## Data and appearance

Optional `matched_place` metadata carries the actual candidate ID, name and validated geocoder extent. Candidate and stored draft shapes stay unchanged; the name remains in their human-readable label. The resident screen owns transient preview state. The map canvas draws a neutral labelled pin and a dashed extent rectangle using existing theme tokens. Extent fitting can zoom out; normal focus uses the existing smooth animation and respects reduced motion. The rectangle is an approximate geocoder extent, not a surveyed footprint or affected-scope claim. Failed/unresolved lookup clears the preview; same-place draft preparation retains its display extent; stopped sessions cannot change it.

## Integration and verification

The change integrates the concurrent v4 end-call work instead of replacing it. Guarded setup upgrades only its exact reviewed immutable configuration to v5, retaining five client tools, system end-call and client events. The isolated review app loads the new pin; other runtime pins and production are separate rollout actions.

No tests are added in the PoC. Manual review covers real geography, owned HTTP tools, unchanged draft state after lookup, named-place preparation, ambiguous preview, correction and unresolved clearing. Review the actual canvas at 390/1440 px in both themes, including keyboard settings and focus controls. Remove the temporary review screen before delivery and run lint, typecheck and build after integrating the current target branch. Actual evidence and remaining microphone/deployment limits live in `docs/voice-sessions.md`.

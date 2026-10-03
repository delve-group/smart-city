# Resident public search

Scope: #33, using the completed #32 backend and #28 public map. Localhost is the delivery gate; deploy only after the complete citizen flow works locally.

Keep the existing map combobox and geographic place search. The shared endpoint supplies keyword, semantic and hybrid ordering; a small Appica selector in the popup chooses the mode without crowding the mobile map controls. This avoids a separate search screen and a second semantic ranking implementation.

The resident client omits cookies so an existing staff session cannot select an official projection. Validate the common envelope and incident-only result kind, retain source IDs, and render/open records through the map's strict public incident DTO. Never display scores as certainty. Forward selected categories; no selected category means no incident request.

Debounce and cancel requests. Query, mode, categories and retry identify each response; obsolete results are not shown for a different query. Empty results differ from unavailable search and incomplete indexing. Keep existing map-text matching as an explicitly labelled fallback when indexing is stale or the provider fails; geographic browsing remains independent. The database-free preview uses labelled local examples, never a pretend semantic provider.

Manual verification covers Polish paraphrases, place preservation, all modes, category filtering, empty/outage/stale/recovery behavior, rapid edits, keyboard use and 390/1440 px in light/dark. Run lint, typecheck and build; do not introduce automated tests.

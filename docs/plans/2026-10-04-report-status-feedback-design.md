# Saved-report status feedback

The current Check status action recovers the same owned draft/report but has no visible completion feedback when the status is unchanged. Show the operation's actual state: an Appica spinner and localized Checking label during the read, then Status checked at with the browser's local time only after successful recovery. Keep the current report's status and next step visible.

A completion timestamp is more useful than a click counter, which does not establish that a read succeeded. A spinner alone is too brief to notice for a fast unchanged response. No artificial delay, automatic polling or new endpoint is needed.

The outcome component owns temporary presentation state, while the existing intake controller retains persistence, ownership and recovery. Its callback returns success; the existing recovery API accepts a 15-second abort signal. Disable repeated checks/new report creation while checking, retain keyboard focus and announce completion politely. On failure keep the committed reference and last-known status, retain the existing error/retry path and show no new success timestamp. Reset feedback per report reference. Reuse the shared English/Polish language and theme tokens.

Verify through the browser for unchanged and changed status, delayed response, failure and keyboard use, including phone/desktop and both themes. Run lint, typecheck and build; add no automated tests. Record actual manual evidence and deployment limits in the PR.

# Operator queue ordering

Date: 2026-10-04. User requirement: newly added reports must appear at the top of the operator's list.

The review queue currently puts urgent incidents first, then sorts by the oldest review time. Reverse its chronological order and remove urgency as a sorting priority so a newer item can appear above an older urgent item. Keep the urgent icon. Active and Done already use descending change time.

Use the existing pure queue helper, which runs after initial loading, polling, commands and filtering in both persistent and mock modes. No API, data model, component or dependency changes are needed. In incident evidence, sort linked reports by descending submission time as well; the incident's start time continues to be derived independently from its earliest report.

Verify ordering, filtering, refresh, linked-report details and keyboard use with a short manual review, then run lint, typecheck and build. Do not introduce tests during the PoC phase. D074 and the design system record the resulting behavior.

# Local response-loop rehearsal

Recorded: 2026-10-03. Partial evidence for [#35](https://github.com/delve-group/smart-city/issues/35), on `feature/browser-voice` based on `20b7d77` with the bounded voice-recovery change present. This was localhost Docker development, not deployment or full spoken/browser intake acceptance.

## Environment and scope

PostgreSQL, the worker, Qdrant and local multilingual embeddings were real. Decision mode was disabled: the proposer, service observation and electricity connector were labelled fictional demo integrations. Three separate guest sessions submitted owned, confirmed drafts through the real HTTP API; they were not three browser users or spoken conversations. The known observation timestamp was 17 days earlier to isolate matching from existing scenarios. All inputs described a fictional rehearsal; no actual outage was reported.

Reports `R-26-001019`, `R-26-001020` and `R-26-001021` grouped into `INC-26-000208` with three distinct supporters. Each submission replay returned its original report. Reporter contribution replays kept support at three.

## Decisions and institution progress

- Resident approval was `403 forbidden`; an old incident-version approval was `409 stale_approval`.
- Rejecting the first proposal left zero tickets. The official selected Electricity again, reviewed the new proposal and approved it.
- The worker created `ELE-26-000423`. Repeating exact approval left one ticket for this incident.
- Water's foreign ticket read and update were both `404 not_found`.
- Electricity advanced acknowledgement, work started and resolution. Each old-version repeat was `409 version_conflict`.
- A different resident's private-report read was `404 not_found`; a new contribution after resolution was `409 incident_closed`.

The actual resident browser opened this incident from real public search. Its public history and separate response status changed without reloading; after resolution the contribution button was disabled and the selected finished incident remained visible.

| Transition | Mutation HTTP time | First browser observation after mutation start |
| --- | --- | --- |
| Acknowledged | 60 ms | 4,280 ms |
| Work started | 124 ms | 4,174 ms |
| Resolved | 134 ms | 8,355 ms |

The browser was visible, with `INC-26-000208` checked before the measurement. Timings include command/tool and observation overhead and are upper bounds for this one run. Acknowledgement/work satisfy the five-second target in these observations. Resolution was already visible at the first late observation: this supplies no proof of its actual display latency or the five-second target. Repeat with an observer armed before mutation during final acceptance; do not call SC-004 fully passed from this run.

## Public boundary

The incident, public list and anonymous hybrid search exposed none of the unique fictional markers inserted into private narrative, unit, official rejection reason and institution progress notes. Public search results were incident-only. The actual browser showed controlled public wording, separate unverified corroboration, fictional-event labels, distinct support and template timeline, with none of the private marker text.

## Remaining

Three scripted spoken reports and actual client-tool execution during speech; denial/navigation/disconnect and provider cleanup; real decision-maker in this full local browser journey; final cross-role browser actions, tighter resolution timing, the independent capacity rehearsal and final integrated deployment. This record does not close #29 or #35 and does not claim new deployed evidence.

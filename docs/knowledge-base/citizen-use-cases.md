# Citizen use cases for testing and demos

Updated: 2026-10-03. Status: selected by the user; scenarios have not been executed or verified.

These four fictional citizen reports are the reusable source for manual testing, voice rehearsals, demo videos and presentations. Their IDs preserve the numbering of the original examples: **5, 3, 2 and 1**. Example 4 (overflowing rubbish containers) is not part of the selected set.

The incidents and address details are fictional. They are not reports of actual problems or evidence of a live city-service integration. The [feature specification](../../specs/001-voice-incident-response/spec.md) defines product behavior and acceptance criteria; this note supplies concrete citizen inputs without expanding that scope.

| ID | Original example | API category | Main demonstration focus |
| --- | --- | --- | --- |
| UC-005 | Broken lift | `accessibility` — Accessibility | Understanding accessibility impact and identifying the exact asset. |
| UC-003 | Dangerous pothole | `roads` — Roads & traffic | Completing an imprecise address with a map pin. |
| UC-002 | Blocked drain | `water` — Water & sewage | Clarifying changing conditions and retaining uncertainty. |
| UC-001 | Power outage | `power` — Power & lighting | Clarifying affected scope and finding related outage reports. |

## UC-005 — Broken lift

**Citizen report**

> The lift at the pedestrian underpass near our tram stop isn’t working. The doors stay closed when I press the button, and the display is blank. I use a wheelchair and couldn’t reach the platform this morning. I can share my location to identify which lift it is.

**Clarify:** Which stop, underpass entrance and lift? Where should the map pin be? Approximately when was the fault observed?

**Manual review / demo focus:** The dispatcher identifies and confirms the asset, captures that the fault blocks access to the platform, and saves a report reference. The operator can review responsibility without the resident knowing the maintenance provider. Do not expose the resident's personal circumstances in the public incident summary or invent a working alternative route.

## UC-003 — Dangerous pothole

**Citizen report**

> There’s a large pothole on Długa Street, just before the junction. I saw a cyclist nearly fall after hitting it this afternoon. Cars are swerving around it. I don’t know the exact building number, but I can mark the spot on the map.

**Clarify:** Which city and junction? Which side or direction of travel? Can the resident confirm the location with a pin?

**Manual review / demo focus:** A missing building number does not prevent intake when the resident confirms a precise map location. Preserve the observed near miss and swerving as reported facts; do not turn them into a confirmed collision or injury. The operator reviews the road hazard and responsible service.

## UC-002 — Blocked drain

**Citizen report**

> The drain near the pedestrian crossing on Kwiatowa Street is blocked. After this morning’s rain, water is covering the pavement and part of the crossing. People are walking into the road to get around it. I can’t tell whether water is still rising.

**Clarify:** Which city and crossing? When was the water last observed? Is its level known to be changing, or does that remain unknown?

**Manual review / demo focus:** Confirm the location and capture the obstructed crossing. Keep “water is rising” unknown unless the resident supplies that observation. Distinguish the resident's suspected blocked drain from a verified cause. Show responsibility review and, if the video includes it, a clearly labelled demo institution ticket after official approval.

## UC-001 — Power outage

**Citizen report**

> There’s no electricity in our building on Jarzębinowa Street in Kraków. It went out about twenty minutes ago. The staircase lights are off too, and neighbours in the building opposite say they have the same problem.

**Clarify:** Which building? What approximate start time does “twenty minutes ago” refer to? Is the resident describing their own building and relaying neighbours' observations, or has a wider street outage been established?

**Manual review / demo focus:** Confirm location and affected scope, save the report, and retrieve related incidents. The neighbours mentioned in this one report are not automatically counted as separate reporting identities. A separate resident submission may support the same incident only under the specification's matching rules. The full demo can continue through evidence review, official approval, the Demo Electricity Operator ticket and public progress updates.

## Reuse guidance

- Use the citizen report verbatim as the reference opening statement; keep paraphrases as explicitly named variants under the same use-case ID.
- Before a map-based rehearsal, prepare and confirm a suitable demo pin/asset and any fixture response. Do not assume these narrative address details have been geocoded or that an actual institution owns the asset.
- Resolve relative phrases such as “this morning” and “twenty minutes ago” against the rehearsal's clock. Record the resulting observation time in the fixture without rewriting the canonical quote.
- For voice/form comparisons, use the same scenario and confirmed facts. Keep each run's IDs and results separate so repeat-request checks are not confused with new intentional reports.
- Record the use-case ID, application version, fixture setup, expected step, observed outcome and limitations when a manual run is performed. Do not mark a scenario passed solely because a video or script exists.
- Keep demo labels visible in recordings. Show only behavior actually implemented; identify any storyboard, simulated institution update or fixture observation.
- The current specification automates grouping only for the power-outage reference case. Lift, pothole and drain reports exercise intake and human review; selecting them for demos does not silently enable new automatic routing or grouping rules.

These are narrative use cases, not automated tests. Follow the verification policy in [AGENTS.md](../../AGENTS.md).

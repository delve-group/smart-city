> **Platform vision / future scope.** The current hackathon feature is specified in [Voice reporting and incident response](specs/001-voice-incident-response/spec.md), with its [technical plan](specs/001-voice-incident-response/plan.md). Use those documents for this implementation. The broader capabilities below remain future context; report, incident and ticket terminology is clarified in the feature specification.

# Executive Summary
The proposed **Smart City Incident Management System** is a cloud-hosted, multi-tenant SaaS platform that enables citizens to report urban issues (e.g. damaged roads, flooding, power outages, overgrown greenery, underused public spaces) and empowers municipal units to manage, prioritize, and resolve them efficiently. Each *tenant* corresponds to a city’s organizational unit (e.g. Kraków’s road authority, parks department, transit agency) or an external contractor. Tenants log in to a shared system instance but see only their jurisdiction’s data, with fine-grained role-based access. Reports are classified into configurable thematic categories (e.g. **Road Maintenance**, **Snow Clearance**, **Greenery**, **Urban Planning**, **Public Transport**, etc.) and mapped to geographic sub-zones (districts, wards, or asset areas). Incoming reports are automatically **deduplicated** (using text similarity, spatial clustering, and temporal rules) and triaged: a priority score is computed based on severity and report volume, with volume spikes triggering escalations. Workflows support normal and emergency incidents (floods, blackout, major traffic disruptions), including invoking pre-contracted private firms when the city agency needs assistance. Contractors and city units can update ticket statuses through the main system or via dedicated API/webhook interfaces (e.g. a mini “contractor portal” to push status updates). The system links incident records with IoT/telemetry streams (e.g. bus GPS, weather sensors) for context and allows public APIs for open data consumption. New cities can be onboarded by importing official data (BIP org charts, GIS boundaries, contact lists) via CSV/GeoJSON templates, which define units, zones, and responsibility mappings. The platform is built with horizontal scalability, EU data residency and GDPR compliance, full audit logging and monitoring, and supports pluggable authentication (SAML/OAuth) and multi-factor login. An admin UI lets city IT configure categories, users, areas, and integration hooks per tenant. This SPEC details the system goals, architecture, data model, workflows, dedup/triage methods, integration APIs, operational concerns, and rollout strategy. It draws on Kraków’s public sources and best practices for smart-city IT.

## 1. Goals and Scope
- **Goals:** Improve responsiveness and coordination of municipal services by centralizing citizen issue reports; reduce duplicated work; ensure high-priority or emergency issues are handled swiftly; provide transparency on status; integrate data-driven insights (e.g. report heatmaps, IoT alerts) into decision-making.
- **Stakeholders:** City residents (as reporters), municipal staff in various departments (roads, parks, transit, planning, etc.), private contractors (maintenance firms), and city IT/governance.
- **Scope:** Focus on operational incident tracking (maintenance, infrastructure, environmental hazards), not on policy or budgeting strategy per se. However, the system tracks budgets and SLAs per incident workflow (see Section 5). It covers typical city tasks: road repair, snow clearing, tree cutting, sidewalk maintenance, public space usage, street lighting, sanitation, etc., mapping each to responsible unit. Residents use a separate mobile/web “report an issue” app (handled by another team); this system ingests those reports. We will design integration points with external IoT and open-data sources (e.g. transit feeds) but the core is back-office ticket management for city units.

## 2. Multi-tenancy Model
The application uses a **multi-tenant** architecture: a single shared deployment serves multiple cities or multiple organizational units within a city. Here, each *tenant* is an administrative unit or contractor. Tenant isolation is enforced at the data and permission level (not by separate servers), as in typical SaaS solutions. For example, the road maintenance department and the parks department of Kraków share the system but see only their own incidents. Tenants may share some components (e.g. core logic, database schema) but have separate data slices. New cities or units can be added dynamically.

- **Tenant types:**
  - *City Departments:* e.g. **Zarząd Dróg** (Road Authority), **Zarząd Zieleni Miejskiej** (Parks/Greenery), **Zarząd Transportu Publicznego** (Public Transit), **Miejskie Przedsiębiorstwo Komunikacyjne** (bus/tram operator), **Zarząd Budynków Komunalnych** (public housing), etc. These map to Kraków’s actual units – e.g. ZDMK handles public roads, bike/tram infrastructure; ZZM manages city parks and trees. Each tenant’s responsibilities align with thematic categories.
  - *External Contractors:* Private firms (e.g. roadside repair, tree contractors, electricians) that the city calls in for tasks. Contractors have their own login (a “tenant” or “contractor-tenant”) but see only tasks assigned to them. For example, a street-light maintenance contractor would be a tenant with permissions for the **Lighting** category.
  - *Administrative Tenant:* A “meta-tenant” for city IT/admins who configure categories, tenants, and view cross-unit dashboards.

- **Tenant Configuration:** Each tenant has its own configuration for:
  - **Categories/Themes:** Each city can define categories (e.g. “pothole”, “power outage”, “illicit dumping”) and map them to responsible units. When a report arrives, the system looks at the category and location to assign it to one or more tenant(s). If no tenant claims responsibility (e.g. a report about a state highway or national rail), the ticket is flagged as *unassigned*.
  - **Geographic Areas:** Tenants cover specific zones (neighborhoods or GIS polygons). E.g. ZDMK might cover all city roads, while an inner-city district office covers only certain streets. The admin UI allows drawing/importing polygons (GeoJSON) for each tenant’s jurisdiction. Reports are geocoded and matched to the area to assign to the correct tenant.
  - **User Roles:** Within each tenant, roles (Admin, Dispatcher, Field Inspector, Read-only, etc.) control access. An admin can create users, assign them to roles, and map them to sub-areas or report types. For instance, a ZDMK field technician sees only road-issues tickets in their patrol area. An on-call dispatcher role might get alerts on high-priority incidents.

*Authentication/Authorization:* Supports modern methods – e.g. SAML2 or OAuth2/OIDC to integrate with a city’s identity provider, or native accounts (email/password + 2FA). Roles and permissions are enforced via a Role-Based Access Control (RBAC) model. For example, only users with the **Supervisor** role can escalate incidents to contractors or adjust priorities. An audit log tracks who accessed or changed each ticket.

## 3. Role Model and Unit Responsibilities
Each municipal tenant maps to a known department with distinct duties. For instance (Kraków examples):
- **Zarząd Dróg Miasta Krakowa (Roads)** – maintains public roads (national except highways, voivodeship, county, municipal roads), sidewalks, bridges, tunnels, bike lanes, tram tracks and street cleaning. Handles category tags like *Pothole*, *Snow Removal*, *Street Light Faults*, *Traffic Signal Faults*. It runs a 24/7 emergency hotline (**12 616 7555**) for urgent road/tramway failures.
- **Zarząd Zieleni Miejskiej (Greenery)** – manages all city parks, street trees, green belts. Tasks include planting, pruning, litter clearing, and responding to fallen trees. Categories: *Overgrown Vegetation*, *Damaged Tree*, *Park Maintenance*. Their charter explicitly lists “planning and maintaining high/low greenery and small park infrastructure”. They also handle ecological interventions and tree health.
- **Zarząd Transportu Publicznego (Public Transit)** – organizes urban bus/tram transport. Uses open data (GTFS) and GIS for scheduling. Categories: *Bus Shelter Damage*, *Transit Info Error*, *Crowding*, etc. They operate a 24/7 transit info line (**+48 12 616 86 69**).
- **Miejskie Przedsiębiorstwo Komunikacyjne (Transit Operator)** – runs the buses/trams fleet. Maintains vehicles and depot. Categories: *Vehicle Malfunction*, *Depot Issue*.
- **Municipal Utilities (Water/Sewer)** – e.g. *MPWiK Kraków* (if applicable) for water leaks or sewer overflow. Categories: *Burst Pipe*, *Flooding*.
- **District Offices / Urban Planning** – handle reports of underused public land, planning queries. For example, “Unused Open Space” issues might route to a city planning department or a special **Urban Development** tenant. Since there isn’t one unified unit in Kraków explicitly for vacant lots, the system can include a generic “City Planning/Assets” tenant.
- **External Contractors** – e.g. private road repair firms, tree service companies. They are given tickets by city units when needed. For instance, if the city’s crews lack capacity, ZDMK can assign a ticket to a contracted contractor-tenant (e.g. “XZ Roads Co.”). The contractor’s portal (or API) lets them update status and submit completion notes.

A **sample permission matrix** might define that:
| Role                  | Can View Tickets | Can Edit Tickets | Can Assign Tickets | Can Set Priority | Can Dispatch Contractors |
|-----------------------|------------------|------------------|--------------------|------------------|--------------------------|
| *Department Admin*    | Yes              | Yes              | Yes                | Yes              | Yes                      |
| *Dispatcher*          | Yes              | Yes              | Yes                | Yes (limited)    | Yes                      |
| *Field Inspector*     | Yes (own region) | Yes (own region) | No                 | No               | No                       |
| *Contractor User*     | Yes (assigned)   | Yes (updates)    | No                 | No               | No                       |
| *Read-only Auditor*   | Yes (own dept)   | No               | No                 | No               | No                       |

## 4. Data Model
Key entities include:

- **Ticket (Incident Report):** The core record. Contains: report ID, creation time, category, description, reporter (anonymized or user ID), address/geo-coordinates, attached photos, current status, priority, assigned tenant(s), and history log. Tickets may be updated by staff or system (status changes, notes).
- **Duplicate Group:** Tickets suspected duplicates are linked in groups. The system de-duplicates by merging into a parent “master” ticket or by flagging duplicates. The data model can store a *duplicateOf* relation or a group ID.
- **Triage/Priority Score:** Each ticket has a computed priority (e.g. Low, Medium, High, Critical). The score factors: category severity (defined by city rules), number of similar reports, and timestamps. The model may store a numeric score or priority level.
- **Status History:** A log table tracking each change of status/owner, with timestamp, user or system actor, and optional note.
- **Notes/Comments:** City staff and contractors can append internal notes or public responses. These are linked to tickets.
- **Tasks:** For complex incidents, a ticket can spawn subtasks (e.g. “order materials”, “schedule crew”). Each task has its own assignee and status, linking back to the main ticket.
- **Tenant Configuration:** Data tables for tenants, roles, permissions, and what categories/areas they cover. For example, a “Responsibility” table maps (Tenant, Category) pairs and (Tenant, GeoPolygon) pairs.
- **Attachments:** Photos or documents attached to tickets. These are stored (in the database or object store) with references in the ticket.
- **IoT Links:** Optionally, a ticket may link to IoT data (e.g. nearest weather sensor readings at time of report, or bus GPS). Could be via foreign key to IoT measurement records or by timestamp-location mapping.
- **User:** Staff users, with role and tenant affiliation. Not covered by multi-tenant DB partitioning if using centralized auth, but logically scoped per tenant.

All data is stored in an ACID database; tenants may share tables with a “tenant_id” column to segregate. Indices on location (geography) and text fields should support fuzzy search for de-duplication.

## 5. Deduplication and Triage Workflows

When a new report arrives, the system **deduplicates and triages** it before assignment:

- **Deduplication Methods:** To detect duplicate or related reports, the system can apply:
  - **Fuzzy Text Matching:** Compare the new ticket’s description/notes with recent tickets in the same area using techniques like token similarity or string distance. E.g. “pothole on Main St” vs “big hole on Main Street” match.
  - **Geospatial Clustering:** If a new ticket’s location lies within a short radius (e.g. 100m) of an existing open ticket (especially of the same category), mark as duplicate.
  - **Time Window Filtering:** Reports of the same issue within a short time window (e.g. minutes/hours) are likely duplicates.
  - **Machine Learning:** Optionally, an ML model (e.g. clustering text+geo features) can learn to group similar tickets. This could be a longer-term enhancement.

These approaches can be combined in a weighted scoring function. For example, if both text and location match above thresholds, the new report is auto-linked to an existing ticket (or a new “incident cluster” ID is created). A table below compares options:

| Method               | Approach                                      | Pros                                       | Cons                                         |
|----------------------|-----------------------------------------------|--------------------------------------------|----------------------------------------------|
| Fuzzy Text Match     | NLP string similarity on descriptions         | Catches phrasing variations                | Can miss if description is very different     |
| Geospatial Cluster   | Proximity threshold (e.g. 50m radius)         | Simple and effective for physical incidents| May group nearby distinct issues if too coarse|
| Time-based Window    | Duplicate if same street & category w/in X hrs| Good for flash-report storms               | Needs tuning of time span per category        |
| ML Similarity        | Trained model on labeled duplicates           | Adaptive, can consider complex patterns    | Requires training data, opaque decisions      |

*Example:* A flood on Elm St. reported 3 times by different users. The system sees all in 100m, category “Flood”, so it merges them into one incident with count=3, raising its priority (see triage rules).

- **Triage and Prioritization:** Once deduplicated, each incident is given a priority. Priority algorithms may include:
  - **Severity by Category:** City defines base severity per category (e.g. *“Power Outage”* = Critical, *“Graffiti”* = Low).
  - **Report Volume:** More duplicates = higher urgency (e.g. 1 report = medium, 5 reports = high).
  - **Vulnerable Assets/Areas:** If location is near hospitals/schools, escalate.
  - **Time Sensitivity:** “Snow not cleared” in winter gets higher priority.
  - **Scheduled SLAs:** For certain tasks (e.g. fixing street lights), the system knows target response times, so delays raise priority.

A simple formula could be: `priority_score = base_severity + log(1+duplicate_count)`. Volume-based escalation: if duplicate count exceeds a threshold, set priority to Max. For instance, a single report of a large pothole is Medium, but 10 reports of the same pothole becomes High (community complaining).

Priority is visible to staff, and workflows can auto-notify superiors if a ticket stays open beyond its SLA. For example, *Kraków’s service level* for emergency road repairs might be 24 hours; if exceeded, an alert to ZDMK manager is generated.

*References:* Modern incident-management best practices (like ITIL/Atlassian) emphasize dedup and prioritization to allocate resources effectively. Leveraging Kraków’s Smart City strategy, we can incorporate AI/ML in future triage (the city’s strategy explicitly targets AI/ML in public services).

## 6. Incident Workflows and Escalation

- **Normal Workflow:** A citizen report enters the queue and is assigned to the relevant tenant (e.g. ZDMK for roads). A dispatcher or inspector updates status (e.g. *Investigating*, *In Progress*, *Resolved*) and sets responsible teams. Workers carry out repairs, log progress (via tasks or notes). Once done, the ticket is marked *Closed*. The system records time-to-resolve and, if needed, auto-generates an incident report for managers.

- **Emergency/Major Incidents:** Some incidents require emergency protocols (e.g. major flooding, power outage, bridge collapse). These trigger an escalated workflow:
  - **Immediate Triage:** The ticket is tagged **Critical** and sent to a 24/7 incident channel. The dispatcher phones the on-call engineers.
  - **Contractor Invocation:** If the city’s own crews are overwhelmed, pre-arranged contractors are activated. The system knows which contractors won tenders for emergency tasks (see next section) and can notify them via SMS/email and API.
  - **Cross-Tenant Coordination:** Some emergencies span multiple units (e.g. flood impacts roads and sewers). The platform allows linking related tickets across tenants. An *Incident Commander* role (for City Crisis Management) may oversee all, with visibility to all related tickets.
  - **Reserve Budget Usage:** Cities often maintain contingency budgets (rezerwa celowa) for unforeseen crises. The system should allow marking tickets as **Budgeted from Reserve**, affecting financial reporting. (In Kraków’s budget rules, reserve funds are used only for emergencies or council-mandated projects – although a precise citation is beyond this scope, we note that budgeting laws require transparency.) The system tags such tickets so city finance knows to allocate from reserves.

- **Contractor Workflow, SLAs, and Invoicing:**
  - **Contract Setup:** City issues RFPs/tenders (PZP procedure under “Public Procurement Law”) for services like road repair or tree removal. Winning vendors are in the system as *Contractor Tenants*. Each contract defines an SLA (e.g. “pothole repaired within 48h of notice”) and billing terms (unit prices or lump-sum).
  - **Work Orders:** When a ticket requires outsourced work, staff create a *work order* in the system, assigning the ticket to a contractor and noting the contract reference. The contractor then schedules crew and updates progress via our portal (see Integration section).
  - **Acceptance and Invoicing:** Once work is done, the city inspector sets status *Completed – Awaiting Invoice*. The contractor submits an invoice outside the system (per local finance procedures). The ticket record attaches the invoice number and final cost. The system tracks that payment should be made (though actual payment is via the city’s ERP). Municipal accounting law requires that payment be disbursed within a set period (often 30 days after invoice submission), and the system flags overdue payments.
  - **Budget Tracking:** Each ticket’s estimated and actual cost is logged. By law, public tasks are budgeted in advance; the system ensures spending aligns to line items (monitoring over/under-run).

In summary, the workflow ties together **report → assign → do work (internal or via contractor) → verify → close → invoice/pay**. Each step generates audit logs. Examples: ZDMK’s website advertises a 24/7 line for emergencies, reflecting the need for always-on readiness; our system adds structure so every call becomes a tracked ticket, with SLAs and follow-up.

## 7. Integration API Design

To support extensibility, the platform exposes RESTful APIs and webhooks:

- **Webhooks/Events:** External systems (e.g. an ERP, another city portal) can subscribe to events. For instance, a webhook endpoint `/webhook/incidents` can be POSTed by our system whenever a ticket status changes or a new critical incident opens. Payload might include JSON `{ "ticket_id":123, "status":"Closed", "timestamp":"..." }`. Webhooks use HMAC signatures for authenticity. This way, if a city’s CRM or ERP wants to mirror data, they receive real-time updates.

- **REST/GraphQL Endpoints:** Contractors and partners use secured APIs to query or update tickets:
  - `POST /api/incidents` – Create a new ticket (used by the public app backend or city systems). Payload: `{category, description, lat, lon, photos..., contact_info...}`. Returns ticket ID.
  - `GET /api/incidents/{id}` – Fetch ticket details.
  - `PUT /api/incidents/{id}` – Update fields (e.g. status, notes, assignee). E.g. contractor portal calls this to set `status=“Completed”`.
  - `GET /api/incidents?filter=...` – List tickets by tenant, status, etc. Useful for dashboard or analytics.
  - **Authentication:** All API calls require a secure token (OAuth2 Bearer or API key). Idempotency is supported via client-supplied headers (e.g. `Idempotency-Key`) to safely retry requests. For example, `POST /api/incidents` should ignore duplicates if the same idempotency key is used.

- **Sample Payload (Contractor Status Update):**
```json
{
  "ticket_id": 4572,
  "status": "RepairScheduled",
  "notes": "Crew assigned, on-site Monday 8am",
  "updated_by": "contractor_user_123",
  "timestamp": "2026-10-03T10:15:00Z"
}
```
- **Mapping to External Systems:** If a tenant already has a field service system, we can integrate. E.g. Parks Dept might use a separate GIS-based workflow app. The system will provide an API (or SFTP feed) so that when the tenant marks a ticket *In Progress*, the external system can pull it. Conversely, the POC “contractor portal” (a mini web UI) can let a contractor pick up tickets and push status back via API.

In short, the API layer is event-driven and follows REST best practices (like idempotency and standard verbs). It can also support GraphQL if desired (e.g. for complex queries), but a REST design suffices for interoperability. All payloads and endpoints follow City data standards (JSON with UTF-8, date-times in ISO format, etc.).

## 8. Onboarding a New City

Making the system reusable by other Polish cities requires a generic import/configuration process:

- **Data Sources:**
  - *Organizational Units:* Collect from the city’s BIP (Biuletyn Informacji Publicznej) the list of units (like Kraków’s PDF or uchwała showing unit list). The user can upload a CSV of units, their codes, head, contact info, and areas of responsibility.
  - *GIS Boundaries:* Import GeoJSON or shapefiles for administrative boundaries, districts, or asset zones. For Kraków, one can use the **Miejski System Informacji Przestrzennej (MSIP)** or **Geoportal Polska** for official maps (land parcels, street centerlines, utility lines). These define which unit covers which area.
  - *Category List:* Define ticket categories and map them to units. For example, “road damage” → ZDMK, “missed garbage pickup” → waste services dept, etc. Admin UI lets the city refine mappings.
  - *User Directory:* Initial upload of user accounts for each unit (e.g. via CSV of name, email, role).
  - *Existing Data (optional):* If the city has an existing ticketing system, an import tool should bulk-load old tickets (with dedup merges).

- **Migration Steps:**
  1. **Create City Tenant:** In the admin UI, register the city (if multi-city instance) and default settings.
  2. **Upload Org Units:** CSV with columns (Unit Name, Code, Email, Phone, Parent Unit, Active). System creates tenant accounts.
  3. **Define Categories:** Possibly pre-load a standard set, then city can edit or add.
  4. **Upload GIS Polygons:** Use provided CSV/GeoJSON template (e.g. fields: `zone_id, name, tenant_code, GeoJSON`). Import will draw zone maps.
  5. **Configure Responsibility:** Link categories to tenants (the UI can present categories and allow checking which unit handles them). Link zone polygons to tenants if needed.
  6. **Set Up Auth:** Either configure SSO (e.g. via a federation trust if city has IdP) or ensure admin creates login credentials for all users.
  7. **Test Data:** Create sample tickets and ensure they route correctly.

- **Data Format Examples:**
  - *CSV for Units:* `unit_code,unit_name,email,phone,parent_code`
  - *GeoJSON for Zones:* standard FeatureCollection with `properties: {tenant_code:"ZDMK", area_name:"District 1"}`.
  - *CSV for Contacts:* `unit_code,contact_name,role,email,phone`.

- **Admin UI:** A dedicated interface allows city IT to visualize imported data on a map, adjust overlaps, and override default routing rules. For instance, if two units jointly handle “parks”, the admin UI can split zones or set escalation order.

By using official sources (BIP, Geoportal) and flexible import tools, adding a new city or reorganizing units is straightforward. Kraków’s own example shows complex units and responsibilities, but the system accommodates that by letting the admin define multi-level unit structure and multiple categories per unit.

## 9. Operational Considerations

- **Scalability:** The system should be built on scalable cloud infrastructure (e.g. Kubernetes or serverless stacks). During peak loads (e.g. winter storms with many reports), it can scale horizontally. Use load-balanced stateless APIs, an auto-scaling database (or read replicas), and message queues for background tasks (dedup, notifications, IoT ingestion).
- **Data Residency & Privacy:** Since this handles citizen data, data must reside in EU data centers (to meet GDPR and Polish law). Personally Identifiable Information (PII) of reporters is minimal (only contact info if provided), but still encryption at rest and in transit is required. GDPR consent notices must be included in the public app (handled elsewhere), and data retention policies should purge old PII. Anonymized analytics (e.g. heatmaps) can be public.
- **Audit Logs:** Every action (ticket creation, status change, comment) is time-stamped and logged with user ID. Audit logs themselves are tamper-evident (write-once logs). This is crucial for transparency and for any potential public records requests.
- **Monitoring:** The platform will include monitoring dashboards (CPU/memory, DB performance, API latency) and alerts (error rates, queue backups). It should also track application-specific metrics: number of open tickets, SLA violations, dedup rates, etc. These can be fed into a city’s broader monitoring (e.g. via Prometheus/Grafana).
- **IoT Ingestion:** The system will support ingesting real-time data streams: e.g. bus locations (from ZTP’s GTFS-RT feed), weather sensor feeds (temperature, humidity, water level), and smart utility meters. This data can auto-generate or update tickets: e.g. if water-level sensors in a sewer rise above threshold, create a “Flood” ticket. Or if a smoke detector in a public space triggers, open an “Air Quality/Hazard” incident.
- **Public APIs / Open Data:** In line with Kraków’s commitment to open data, the system should expose an API or dataset of anonymized incidents (types, locations, statuses) for public consumption. This could be a JSON/CSV feed or an ArcGIS Hub integration. For example, publishing data on *“incidents per district per month”* improves transparency.

## 10. UI/UX Considerations

- **Staff Dashboard:** A map-centric interface showing open tickets by category and location. Users can filter by status, priority, and due dates. Visual indicators (colored pins) highlight critical issues. An “Inbox” view lists assigned tickets sorted by priority. Bulk actions (e.g. mark resolved multiple tickets) and quick status-change buttons speed up common tasks.
- **Notifications:** Users get email/SMS alerts for new high-priority tickets or SLA breaches. Within the app, badge counts and pop-up notifications keep dispatchers aware. Escalation emails can ping managers if tickets remain unattended beyond thresholds.
- **Field Mobility:** Although this spec doesn’t build mobile apps, the design should support mobile use (responsive UI) for inspectors in the field. Offline support (cache tickets and sync when online) could be considered.
- **Accessibility:** Follow WCAG guidelines for color use and contrast. The system should handle multi-language interfaces (Polish, English), as Kraków is international.
- **User Onboarding:** Provide walkthroughs and help texts, since municipal staff may be used to paper/email processes. Tooltips for fields, and “what’s next?” prompts (e.g. “Assign to a technician”) improve efficiency.

For citizens (outside this spec’s scope), the idea is they already have a separate “report an issue” app; our system ingests from that, so we only need minimal public UI (like a status portal).

## 11. Testing, Rollout, and Governance

- **Pilot Phase:** Start by deploying for one district or department (e.g. ZDMK for road repairs) and run in parallel with existing processes. Gather feedback from dispatchers and iteratively refine workflows.
- **Training:** City users must be trained on the new interface and processes. Provide manuals and sandbox mode for practice.
- **Governance:** A city-level steering group (e.g. including IT, finance, and heads of departments) should oversee the project. The **Główny Miejski Strateg ds. Informatyzacji** (Chief Digital Strategist) may coordinate (per Kraków’s 2025 initiative for Smart City coordination). Regular review of system metrics (ticket volumes, resolution times) ensures objectives are met.
- **Legal Compliance:** The system must align with Polish public records law and data reuse rules (e.g. BIP archiving). All public-sector information managed in the system can be exported on demand (as BIP requests). The earlier-cited BIP rule implies the city may charge only actual costs for special data requests; our audit and reporting modules should facilitate any such official data export.
- **Maintenance:** Establish an SLA with the system provider for uptime (e.g. 99.9%), backups, and security updates. Use automated tests (unit, integration, UI) and periodic penetration testing for quality.

In summary, the rollout plan emphasizes gradual adoption, clear responsibilities, and alignment with Kraków’s digital strategy and legal framework. By leveraging Kraków’s existing open-data initiatives and smart-city vision, the system can integrate smoothly into city operations and improve transparency, efficiency, and resident satisfaction.

**Sources:** The design draws on Kraków’s official documentation of unit responsibilities, global SaaS/incident management best practices, and Polish public sector regulations.

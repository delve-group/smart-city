"use client";

import { ArrowLeft } from "@appica/icons-react";
import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { useMediaQuery } from "@appica/ui-react/hooks/use-media-query";
import { Spinner } from "@appica/ui-react/spinner";
import { useToastManager } from "@appica/ui-react/toast";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/api/categories/types";
import { decideProposal } from "@/api/operations/decide-proposal";
import { reconcileProposal } from "@/api/operations/reconcile-proposal";
import { runIncidentCommand } from "@/api/operations/run-incident-command";
import { triageReport } from "@/api/operations/triage-report";
import {
  OperationsApiError,
  type Incident,
  type IncidentCommand,
  type OperationsReport,
  type ProposalDecision,
  type ReportTriage,
  type Workspace,
} from "@/api/operations/types";
import type { MapArea, MapFocus, MapPoint } from "@/features/city-map/components/city-map-canvas/map-types";
import { MapSettings } from "@/features/city-map/components/map-settings/map-settings";
import { useNow } from "@/shared/hooks/use-now";
import { useI18n } from "@/shared/i18n/locale";
import { useOperationsData } from "../../hooks/use-operations-data";
import { buildQueue, incidentKey, institutionName, reportKey, type QueueItem, type QueueTab } from "../../utils/queue";
import { IncidentPanel } from "../incident-panel/incident-panel";
import { OperationsSidebar } from "../operations-sidebar/operations-sidebar";
import { ReportReviewPanel } from "../report-review-panel/report-review-panel";

// MapLibre needs the browser (WebGL, window), so the map is client-only.
const CityMapCanvas = dynamic(() => import("@/features/city-map/components/city-map-canvas/city-map-canvas"), { ssr: false });

/** Opens at street level over the centre, where the demo incidents are. */
const INITIAL_VIEW = { longitude: 19.9425, latitude: 50.0555, zoom: 14.8 };
/** Desktop panel width (25rem) plus its 0.75rem margin. */
const PANEL_INSET = 412;
const EMPTY_QUEUE: Record<QueueTab, QueueItem[]> = { review: [], active: [], done: [] };
const NO_CATEGORIES: Category[] = [];
/** Codes that mean "the record moved on while you looked at it", not a failure. */
const STALE_CODES = new Set(["version_conflict", "stale_approval", "proposal_closed", "invalid_state"]);

type Selection = { kind: "incident"; incident: Incident } | { kind: "report"; report: OperationsReport } | null;

function resolveSelection(workspace: Workspace | undefined, key: string | null): Selection {
  if (!workspace || !key) return null;
  const [kind, id] = key.split(":");
  if (kind === "incident") {
    const incident = workspace.incidents.find((candidate) => candidate.id === id);
    return incident ? { kind, incident } : null;
  }
  const report = workspace.reports.find((candidate) => candidate.id === id);
  return report ? { kind: "report", report } : null;
}

/** Official workspace: review queue beside the map, details in the same floating panel as the resident map. */
export function OperationsWorkspace({ onSessionLost, onSignOut }: { onSessionLost: () => void; onSignOut?: () => void }) {
  const { t } = useI18n();
  const { state, retry, refresh, apply, updatedAt, refreshFailed } = useOperationsData(onSessionLost);
  const toast = useToastManager();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 768px)", { defaultValue: true });
  const mapAreaRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [tab, setTab] = useState<QueueTab>("review");
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  /** Phones show one thing at a time: the queue, or the map with the detail sheet. */
  const [mobileView, setMobileView] = useState<"queue" | "map">("queue");
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [tilted, setTilted] = useState(false);

  const workspace = state.status === "ready" ? state.workspace : undefined;
  const categories = state.status === "ready" ? state.categories : NO_CATEGORIES;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const categoryIds = categories.map((category) => category.id);
  const queue = workspace ? buildQueue(workspace, query) : EMPTY_QUEUE;
  const selection = resolveSelection(workspace, selectedKey);

  useEffect(() => {
    const element = mapAreaRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setMapHeight(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Escape closes the detail panel.
  useEffect(() => {
    if (!selectedKey) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedKey(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedKey]);

  // Map content: open work and reports under review. Reports outside an incident are private: hollow markers.
  const selectedIncident = selection?.kind === "incident" ? selection.incident : undefined;
  const selectedReport = selection?.kind === "report" ? selection.report : undefined;
  const openIncidentIds = new Set(
    workspace?.incidents
      .filter((incident) => incident.responseStatus !== "closed" || incident.id === selectedIncident?.id)
      .map((incident) => incident.id) ?? [],
  );
  const urgentIds = new Set(workspace?.incidents.filter((incident) => incident.urgent).map((incident) => incident.id) ?? []);
  const points: MapPoint[] = (workspace?.reports ?? [])
    .filter((report) => (report.incidentId ? openIncidentIds.has(report.incidentId) : report.review !== null))
    .map((report) => ({
      id: report.id,
      categoryId: report.categoryId,
      location: report.location,
      weight: report.incidentId && urgentIds.has(report.incidentId) ? 1 : 0.6,
      muted: !report.incidentId,
    }));
  const selectedIds = selectedIncident
    ? (workspace?.reports.filter((report) => report.incidentId === selectedIncident.id).map((report) => report.id) ?? [])
    : selectedReport
      ? [selectedReport.id]
      : [];
  const areaOf = (incident: Incident): MapArea => ({
    id: incident.id,
    categoryId: incident.categoryId,
    center: incident.location,
    radiusMeters: incident.matchingRadiusM,
  });
  // A report under review shows the incidents it could join.
  const areas: MapArea[] = selectedIncident
    ? [areaOf(selectedIncident)]
    : (selectedReport?.review?.candidates ?? []).flatMap((candidate) => {
        const incident = workspace?.incidents.find((item) => item.id === candidate.incidentId);
        return incident ? [areaOf(incident)] : [];
      });

  function flyTo(location: { lat: number; lng: number }, zoom = 16) {
    setFocus((previous) => ({ key: (previous?.key ?? 0) + 1, lng: location.lng, lat: location.lat, zoom }));
  }

  function select(key: string, location: { lat: number; lng: number }) {
    setSelectedKey(key);
    setMobileView("map");
    flyTo(location);
  }

  function selectFromQueue(item: QueueItem) {
    if (item.kind === "incident") select(item.key, item.incident.location);
    else select(item.key, item.report.location);
  }

  /** Map click on a report: open its incident, or the report itself while it is under review. */
  function selectFromMap(id: string | null) {
    const report = id ? workspace?.reports.find((candidate) => candidate.id === id) : undefined;
    if (!report) {
      setSelectedKey(null);
      return;
    }
    const key = report.incidentId ? incidentKey(report.incidentId) : reportKey(report.id);
    setSelectedKey(key);
    // Show the row in the list too, so queue and map never disagree.
    const tabWithItem = (Object.keys(queue) as QueueTab[]).find((name) => queue[name].some((item) => item.key === key));
    if (tabWithItem) setTab(tabWithItem);
  }

  /** Runs a command; a conflict refreshes the view instead of retrying blindly. */
  async function run(action: () => Promise<Workspace>, success: string, description?: string): Promise<Workspace | null> {
    try {
      const next = await action();
      apply(next);
      toast.add({ title: success, description });
      return next;
    } catch (error) {
      if (error instanceof OperationsApiError && (error.status === 401 || error.status === 403)) {
        onSessionLost();
      } else if (error instanceof OperationsApiError && STALE_CODES.has(error.code)) {
        toast.add({ type: "warning", title: t("toast.staleTitle"), description: t("toast.staleBody", { message: error.message }) });
        void refresh();
      } else {
        toast.add({
          type: "error",
          title: t("toast.saveFail"),
          description: t("toast.saveFailBody", { message: error instanceof Error ? error.message : t("toast.unknownError") }),
        });
      }
      return null;
    }
  }

  async function handleDecide(incident: Incident, decision: ProposalDecision) {
    const proposal = incident.proposal;
    if (!workspace || !proposal) return false;
    const name = institutionName(workspace, proposal.institutionId);
    const result = await run(
      () => decideProposal(proposal.id, decision),
      decision.decision === "approved" ? t("toast.approved", { name }) : t("toast.rejected"),
      decision.decision === "approved" ? t("toast.approvedBody") : t("toast.rejectedBody"),
    );
    return result !== null;
  }

  async function handleReconcile(incident: Incident, reason: string) {
    const proposal = incident.proposal;
    if (!proposal) return false;
    const result = await run(
      () => reconcileProposal(proposal.id, { expected_proposal_version: proposal.version, reason }),
      t("toast.checked"),
      t("toast.checkedBody"),
    );
    return result !== null;
  }

  async function handleCommand(incident: Incident, command: IncidentCommand) {
    const messages: Record<IncidentCommand["type"], string> = {
      choose_institution: t("toast.choose_institution"),
      verify: t("toast.verify"),
      dispute: t("toast.dispute"),
      close: t("toast.close"),
      reopen: t("toast.reopen"),
    };
    const result = await run(() => runIncidentCommand(incident.id, command), messages[command.type]);
    return result !== null;
  }

  async function handleTriage(report: OperationsReport, triage: ReportTriage) {
    const messages: Record<ReportTriage["decision"], string> = {
      link: t("toast.link", { reference: report.reference }),
      new_incident: t("toast.new_incident"),
      private_issue: t("toast.private_issue", { reference: report.reference }),
      out_of_scope: t("toast.out_of_scope", { reference: report.reference }),
    };
    const result = await run(() => triageReport(report.id, triage), messages[triage.decision]);
    if (!result) return false;
    // Continue with the incident the report joined, if any.
    const incidentId = result.reports.find((candidate) => candidate.id === report.id)?.incidentId;
    setSelectedKey(incidentId ? incidentKey(incidentId) : null);
    return true;
  }

  const panelOpen = Boolean(selection);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <aside
        aria-label={t("queue.label")}
        className={`${mobileView === "queue" ? "flex" : "hidden"} w-full shrink-0 flex-col border-e border-border md:flex md:w-96`}
      >
        <OperationsSidebar
          queue={queue}
          tab={tab}
          onTabChange={setTab}
          query={query}
          onQueryChange={setQuery}
          selectedKey={selectedKey}
          onSelect={selectFromQueue}
          categoriesById={categoriesById}
          now={now}
          updatedAt={updatedAt}
          refreshFailed={refreshFailed}
          onRefresh={() => void refresh()}
          onSignOut={onSignOut}
          onShowMap={() => setMobileView("map")}
        />
      </aside>

      <div ref={mapAreaRef} className={`${mobileView === "map" ? "block" : "hidden"} relative min-w-0 flex-1 overflow-hidden md:block`}>
        <CityMapCanvas
          points={points}
          categoryIds={categoryIds}
          selectedIds={selectedIds}
          hoveredId={hoverId}
          focus={focus}
          insets={{ right: panelOpen && isDesktop ? PANEL_INSET : 0, bottom: panelOpen && !isDesktop ? mapHeight * 0.72 : 0 }}
          interactive
          onHover={(hover) => setHoverId(hover?.id ?? null)}
          onSelect={selectFromMap}
          attribution={workspace?.source === "demo" ? t("demo.incidents") : undefined}
          tilted={tilted}
          areas={areas}
          heatmap={false}
          initialView={INITIAL_VIEW}
        />

        <div className="absolute top-3 left-3 z-20 md:hidden">
          <Button variant="outline" className="border-border-strong/50 bg-background shadow-xs" onClick={() => setMobileView("queue")}>
            <ArrowLeft data-icon="start" />
            {t("common.queue")}
          </Button>
        </div>

        {state.status === "loading" && (
          <div role="status" className="absolute inset-x-3 top-3 z-20 flex justify-center">
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3.5 py-2 text-sm text-foreground shadow-sm">
              <Spinner className="size-4 text-foreground-muted" aria-hidden />
              {t("queue.loading")}
            </div>
          </div>
        )}
        {state.status === "error" && (
          <div className="absolute inset-x-3 top-3 z-20 flex justify-center">
            <Alert variant="error" className="max-w-sm shadow-sm">
              <AlertTitle>{t("queue.loadError")}</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                {state.message}
                <Button variant="outline" size="sm" onClick={retry}>{t("common.tryAgain")}</Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Stays reachable: moves beside the panel on desktop, above the sheet on phones. */}
        <div className={`absolute right-3 bottom-3 z-20 transition-[right,bottom] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${panelOpen ? "bottom-[calc(72dvh+0.75rem)] md:right-[26.25rem] md:bottom-3" : ""}`}>
          <MapSettings tilted={tilted} onTiltedChange={setTilted} />
        </div>

        {workspace && selection?.kind === "incident" && (
          <IncidentPanel
            incident={selection.incident}
            workspace={workspace}
            category={categoriesById.get(selection.incident.categoryId)}
            now={now}
            onClose={() => setSelectedKey(null)}
            onLocate={(location) => flyTo(location, 17)}
            onDecide={handleDecide}
            onReconcile={handleReconcile}
            onCommand={handleCommand}
          />
        )}
        {workspace && selection?.kind === "report" && (
          <ReportReviewPanel
            key={selection.report.id}
            report={selection.report}
            workspace={workspace}
            category={categoriesById.get(selection.report.categoryId)}
            now={now}
            onClose={() => setSelectedKey(null)}
            onLocate={(location) => flyTo(location, 17)}
            onTriage={handleTriage}
          />
        )}
      </div>
    </div>
  );
}

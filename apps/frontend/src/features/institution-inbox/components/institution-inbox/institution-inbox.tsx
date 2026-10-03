"use client";

import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Badge } from "@appica/ui-react/badge";
import { Button } from "@appica/ui-react/button";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Spinner } from "@appica/ui-react/spinner";
import { useToastManager } from "@appica/ui-react/toast";
import { useState } from "react";
import { InstitutionApiError, type InstitutionTicket, type TicketUpdate } from "@/api/institution/types";
import { updateTicket } from "@/api/institution/update-ticket";
import { AppBrand } from "@/shared/components/app-brand/app-brand";
import { FreshnessStatus } from "@/shared/components/freshness-status/freshness-status";
import { useNow } from "@/shared/hooks/use-now";
import { useInstitutionData } from "../../hooks/use-institution-data";
import { sortTickets } from "../../utils/labels";
import { TicketDetail } from "../ticket-detail/ticket-detail";
import { TicketRow } from "../ticket-row/ticket-row";

const STALE_CODES = new Set(["version_conflict", "invalid_state"]);
const SAVED: Record<TicketUpdate["status"], string> = {
  acknowledged: "Ticket acknowledged",
  in_progress: "Work marked as started",
  resolved: "Reported as resolved",
  rejected: "Ticket rejected",
};

type InstitutionInboxProps = { onSessionLost: () => void; onSignOut?: () => void };

/** The institution's assigned tickets and their progress. Which institution is decided by the account alone. */
export function InstitutionInbox({ onSessionLost, onSignOut }: InstitutionInboxProps) {
  const { state, retry, refresh, apply, updatedAt, refreshFailed } = useInstitutionData(onSessionLost);
  const toast = useToastManager();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Unsaved notes per ticket: polling and failed saves leave them alone. */
  const [notes, setNotes] = useState<Record<string, string>>({});

  const tickets = state.status === "ready" ? state.tickets : [];
  const { open, finished } = sortTickets(tickets);
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null;

  async function handleUpdate(ticket: InstitutionTicket, update: TicketUpdate): Promise<boolean> {
    try {
      apply(await updateTicket(ticket.id, update));
      setNotes((current) => ({ ...current, [ticket.id]: "" }));
      toast.add({ title: SAVED[update.status], description: "The city official and the public timeline are updated." });
      return true;
    } catch (error) {
      if (error instanceof InstitutionApiError && (error.status === 401 || error.status === 403)) {
        onSessionLost();
      } else if (error instanceof InstitutionApiError && STALE_CODES.has(error.code)) {
        toast.add({ type: "warning", title: "This ticket changed while you were looking at it", description: `${error.message} The view is now up to date; your note is kept.` });
        void refresh();
      } else {
        toast.add({ type: "error", title: "Your update was not saved", description: `${error instanceof InstitutionApiError ? error.message : "The inbox could not be reached."} Your note is kept; try again.` });
      }
      return false;
    }
  }

  const list = (title: string, items: InstitutionTicket[], empty: string) => (
    <section aria-label={title} className="flex flex-col gap-1">
      <h2 className="px-3 pt-3 text-xs font-medium text-foreground-muted">
        {title} <span className="tabular-nums">{items.length}</span>
      </h2>
      {items.length > 0 ? (
        <ul className="flex flex-col">
          {items.map((ticket) => (
            <li key={ticket.id}>
              <TicketRow ticket={ticket} selected={ticket.id === selectedId} now={now} onSelect={() => setSelectedId(ticket.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-3 py-2 text-sm text-pretty text-foreground-muted">{empty}</p>
      )}
    </section>
  );

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside aria-label="Assigned tickets" className={`${selected ? "hidden" : "flex"} w-full shrink-0 flex-col border-e border-border md:flex md:w-96`}>
        <header className="flex flex-col gap-3 border-b border-border-muted px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2">
            <AppBrand variant="plain" product="Institution" />
            {onSignOut && <Button variant="ghost" size="sm" onClick={onSignOut}>Sign out</Button>}
          </div>
          {state.status === "ready" && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
              {state.profile.name}
              {state.profile.isDemo && <Badge variant="outline" size="xs">Demo institution</Badge>}
            </p>
          )}
        </header>
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-2 p-2">
            {state.status === "loading" && (
              <div role="status" className="flex items-center gap-2 px-3 py-4 text-sm text-foreground">
                <Spinner className="size-4 text-foreground-muted" aria-hidden />
                Loading your tickets…
              </div>
            )}
            {state.status === "error" && (
              <Alert variant="error" className="m-2">
                <AlertTitle>Could not load your tickets</AlertTitle>
                <AlertDescription className="flex flex-col items-start gap-3">
                  {state.message}
                  <Button variant="outline" size="sm" onClick={retry}>Try again</Button>
                </AlertDescription>
              </Alert>
            )}
            {state.status === "ready" && (
              <>
                {list("Open", open, "No open tickets. New requests approved by the city appear here.")}
                {list("Finished", finished, "Resolved and rejected tickets appear here.")}
              </>
            )}
          </div>
        </ScrollArea>
        {/* Only when the list on screen may be out of date. */}
        {refreshFailed && (
          <footer className="border-t border-border-muted px-4 py-3">
            <FreshnessStatus updatedAt={updatedAt} onRetry={() => void refresh()} />
          </footer>
        )}
      </aside>

      <div className={`${selected ? "block" : "hidden"} min-w-0 flex-1 overflow-y-auto bg-background-subtle md:block`}>
        {selected ? (
          <TicketDetail
            ticket={selected}
            now={now}
            note={notes[selected.id] ?? ""}
            onNoteChange={(note) => setNotes((current) => ({ ...current, [selected.id]: note }))}
            onUpdate={(update) => handleUpdate(selected, update)}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <p className="hidden h-full items-center justify-center px-6 text-sm text-foreground-muted md:flex">
            Choose a ticket to see the request and update its progress.
          </p>
        )}
      </div>
    </div>
  );
}

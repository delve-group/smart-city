import { useEffect, useRef, useState } from "react";
import { createGuestSession } from "@/api/intake/create-guest-session";
import { createDraft } from "@/api/intake/create-draft";
import { getDraft } from "@/api/intake/get-draft";
import { updateDraft } from "@/api/intake/update-draft";
import { confirmDraft } from "@/api/intake/confirm-draft";
import { getReport } from "@/api/intake/get-report";
import { createReport } from "@/api/reports/create-report";
import { draftFieldsSchema, EMPTY_DRAFT_FIELDS, type DraftFields, type IntakeDraft, type Report } from "@/api/intake/types";
import type { LocationCandidate } from "@/api/locations/types";
import { USE_MOCKS } from "@/api/mocks/use-mocks";

const RECOVERY_KEY = USE_MOCKS ? "mradar-mock-resident-draft" : "mradar-resident-draft";

/** Owned server state survives picker/form remounts. Browser storage holds only its ID. */
export function useIntakeDraft() {
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [fields, setFields] = useState<DraftFields>(EMPTY_DRAFT_FIELDS);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const editRevision = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);

  function remember(id: string) {
    try { localStorage.setItem(RECOVERY_KEY, id); }
    catch { setStorageWarning(true); }
  }

  function accept(next: IntakeDraft, preserveInput = false) {
    setDraft(next);
    remember(next.id);
    if (!preserveInput) { setFields(next.fields); setDirty(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let id: string | null = null;
    try { id = localStorage.getItem(RECOVERY_KEY); } catch { /* Recovery is optional when browser storage is blocked. */ }
    if (!id) return;
    async function restore() {
      setBusy(true);
      try {
        await createGuestSession();
        const saved = await getDraft(id!);
        if (!cancelled) { setDraft(saved); setFields(saved.fields); }
        const committed = saved.submission ? await getReport(saved.submission.report_id) : null;
        if (!cancelled) {
          setDraft(saved); setFields(saved.fields); setReport(committed);
        }
      } catch (failure) {
        if (!cancelled) { setNeedsRecovery(true); setError(message(failure)); }
      } finally { if (!cancelled) setBusy(false); }
    }
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draft || draft.submission || !dirty || busy || saving || needsRecovery) return;
    const parsed = draftFieldsSchema.safeParse(fields);
    if (!parsed.success) return;
    const revision = editRevision.current;
    const timer = setTimeout(() => {
      setSaving(true);
      updateDraft(draft.id, draft.revision, parsed.data).then((next) => {
        setDraft(next);
        if (editRevision.current === revision) { setFields(next.fields); setDirty(false); }
      }).catch((failure) => { setError(message(failure)); setNeedsRecovery(true); })
        .finally(() => setSaving(false));
    }, 1200);
    return () => clearTimeout(timer);
  }, [draft, fields, dirty, busy, saving, needsRecovery]);

  async function start(newReport = false, channel: "form" | "voice" = "form"): Promise<IntakeDraft | null> {
    if (busy || saving) return null;
    setBusy(true); setError(null);
    try {
      await createGuestSession();
      if (draft && !newReport) {
        const next = channel === "form" ? await prepareFormDraft(draft) : await getDraft(draft.id);
        accept(next);
        return next;
      }
      let id: string | null = null;
      try { id = localStorage.getItem(RECOVERY_KEY); } catch { setStorageWarning(true); }
      const next = id && !newReport
        ? channel === "form" ? await prepareFormDraft(await getDraft(id)) : await getDraft(id)
        : await createDraft(channel === "form" ? formDefaults() : {});
      accept(next); setNeedsRecovery(false);
      setReport(next.submission ? await getReport(next.submission.report_id) : null);
      return next;
    } catch (failure) { setError(message(failure)); return null; }
    finally { setBusy(false); }
  }

  function edit(patch: Partial<DraftFields>) {
    editRevision.current += 1;
    setFields((current) => ({ ...current, ...patch }));
    setDirty(true); setError(null);
  }

  async function chooseLocation(candidate: LocationCandidate) {
    if (!draft || busy || saving) return false;
    const location = { ...candidate, unit: null };
    setBusy(true); setError(null);
    try {
      const next = await updateDraft(draft.id, draft.revision, { location });
      accept(next, true);
      setFields((current) => ({ ...current, location }));
      return true;
    } catch (failure) { setError(message(failure)); setNeedsRecovery(true); return false; }
    finally { setBusy(false); }
  }

  async function send() {
    if (!draft || busy || saving || needsRecovery) return;
    const parsed = draftFieldsSchema.safeParse(fields);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the report fields."); return; }
    setBusy(true); setError(null);
    try {
      const saved = await updateDraft(draft.id, draft.revision, parsed.data);
      const confirmed = await confirmDraft(saved.id, saved.revision);
      const committed = await createReport(confirmed.id, confirmed.revision);
      setReport(committed);
      setDirty(false);
      setNeedsRecovery(false);
      // The reference is already committed even if this recovery read fails.
      try { accept(await getDraft(confirmed.id)); } catch { setDraft(confirmed); }
    } catch (failure) {
      try {
        const saved = await getDraft(draft.id);
        accept(saved, true);
        if (saved.submission) {
          setReport(await getReport(saved.submission.report_id));
          setNeedsRecovery(false);
        } else {
          setError(message(failure));
        }
      } catch {
        setError("The save outcome is unknown. Check the report before retrying; your input is still here.");
        setNeedsRecovery(true);
      }
    } finally { setBusy(false); }
  }

  async function recover(preserveInput = true) {
    if (!draft || busy || saving) return;
    setBusy(true); setError(null);
    try {
      const saved = await getDraft(draft.id);
      accept(saved, preserveInput && !saved.submission);
      if (saved.submission) setReport(await getReport(saved.submission.report_id));
      else if (preserveInput) setDirty(JSON.stringify(fields) !== JSON.stringify(saved.fields));
      setNeedsRecovery(false);
      return saved;
    } catch (failure) { setError(message(failure)); setNeedsRecovery(true); return null; }
    finally { setBusy(false); }
  }

  /** Voice tools replace only this controller's owned draft; never merge a different report. */
  async function receiveVoiceDraft(next: IntakeDraft | null, committed?: Report) {
    if (next && next.id !== draft?.id) return false;
    if (committed) setReport(committed);
    if (!next) return Boolean(committed);
    editRevision.current += 1;
    accept(next);
    setError(null); setNeedsRecovery(false);
    if (!committed && next.submission) {
      try { setReport(await getReport(next.submission.report_id)); }
      catch { /* The committed reference still exists on the draft. */ }
    }
    return true;
  }

  return { draft, fields, report, busy, saving, error, storageWarning, dirty, needsRecovery,
    start, edit, chooseLocation, send, recover, receiveVoiceDraft };

  async function prepareFormDraft(current: IntakeDraft) {
    if (current.submission) return current;
    const patch: Partial<DraftFields> = {};
    if (!current.fields.issue_type) patch.issue_type = "other";
    if (current.fields.observed_time_state === "unknown") {
      patch.observed_at = new Date().toISOString();
      patch.observed_time_state = "known";
    }
    return Object.keys(patch).length > 0
      ? updateDraft(current.id, current.revision, patch)
      : current;
  }
}

function formDefaults(): Partial<DraftFields> {
  return {
    severity: "medium",
    issue_type: "other",
    observed_at: new Date().toISOString(),
    observed_time_state: "known",
  };
}

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "The report service is unavailable. Your input is still here.";
}

export type IntakeController = ReturnType<typeof useIntakeDraft>;

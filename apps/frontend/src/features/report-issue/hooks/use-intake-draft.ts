import { useEffect, useRef, useState } from "react";
import { createGuestSession } from "@/api/intake/create-guest-session";
import { createDraft } from "@/api/intake/create-draft";
import { getDraft } from "@/api/intake/get-draft";
import { updateDraft } from "@/api/intake/update-draft";
import { confirmDraft } from "@/api/intake/confirm-draft";
import { getIssueTypes } from "@/api/intake/get-issue-types";
import { getReport } from "@/api/intake/get-report";
import { createReport } from "@/api/reports/create-report";
import { draftFieldsSchema, EMPTY_DRAFT_FIELDS, type DraftFields, type IntakeDraft, type IssueType, type Report } from "@/api/intake/types";
import type { LocationCandidate } from "@/api/locations/types";

const RECOVERY_KEY = "mradar-resident-draft";

/** Owned server state survives picker/form remounts. Browser storage holds only its ID. */
export function useIntakeDraft() {
  const [draft, setDraft] = useState<IntakeDraft | null>(null);
  const [fields, setFields] = useState<DraftFields>(EMPTY_DRAFT_FIELDS);
  const [report, setReport] = useState<Report | null>(null);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
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
        const types = await getIssueTypes();
        const committed = saved.submission ? await getReport(saved.submission.report_id) : null;
        if (!cancelled) {
          setDraft(saved); setFields(saved.fields); setIssueTypes(types); setReport(committed);
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

  async function start(newReport = false): Promise<IntakeDraft | null> {
    if (busy || saving) return null;
    setBusy(true); setError(null);
    try {
      await createGuestSession();
      const types = await getIssueTypes();
      setIssueTypes(types);
      if (draft && !newReport) return draft;
      let id: string | null = null;
      try { id = localStorage.getItem(RECOVERY_KEY); } catch { setStorageWarning(true); }
      const next = id && !newReport ? await getDraft(id) : await createDraft({ severity: "medium" });
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

  async function review() {
    if (!draft || busy || saving) return;
    const parsed = draftFieldsSchema.safeParse(fields);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the report fields."); return; }
    setBusy(true); setError(null);
    try { accept(await updateDraft(draft.id, draft.revision, parsed.data)); setNeedsRecovery(false); }
    catch (failure) { setError(message(failure)); setNeedsRecovery(true); }
    finally { setBusy(false); }
  }

  async function confirm() {
    if (!draft || busy || saving || dirty || needsRecovery) return;
    setBusy(true); setError(null);
    try { accept(await confirmDraft(draft.id, draft.revision)); }
    catch (failure) { setError(message(failure)); setNeedsRecovery(true); }
    finally { setBusy(false); }
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
    } catch (failure) { setError(message(failure)); setNeedsRecovery(true); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!draft || busy || saving || dirty || needsRecovery || draft.confirmation?.revision !== draft.revision) return;
    setBusy(true); setError(null);
    try {
      const committed = await createReport(draft.id, draft.revision);
      setReport(committed);
      // The reference is already committed even if this recovery read fails.
      try { accept(await getDraft(draft.id)); } catch { /* Keep the committed result. */ }
    } catch (failure) {
      let committed = false;
      try {
        const saved = await getDraft(draft.id);
        accept(saved, true);
        committed = Boolean(saved.submission);
        if (saved.submission) setReport(await getReport(saved.submission.report_id));
        else setError(`${message(failure)} No committed report was found; review the current draft before retrying.`);
        setNeedsRecovery(false);
      } catch {
        setError(committed ? "Your report was saved, but its current status could not be read. Check the same draft again."
          : "The save outcome is unknown. Check the same draft before retrying; your input and submission identity are preserved.");
        setNeedsRecovery(true);
      }
    } finally { setBusy(false); }
  }

  return { draft, fields, report, issueTypes, busy, saving, error, storageWarning, dirty, needsRecovery,
    start, edit, chooseLocation, review, confirm, recover, submit };
}

function message(failure: unknown) {
  return failure instanceof Error ? failure.message : "The report service is unavailable. Your input is still here.";
}

export type IntakeController = ReturnType<typeof useIntakeDraft>;

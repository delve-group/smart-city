import { Button } from "@appica/ui-react/button";
import { Field, FieldDescription, FieldLabel } from "@appica/ui-react/field";
import { Input } from "@appica/ui-react/input";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { resolveLocation } from "@/api/locations/resolve-location";
import type { LocationCandidate, LocationResolution } from "@/api/locations/types";

type SearchState = { status: "idle" | "loading" } | { status: "done"; result: LocationResolution } | { status: "error" };

export function AddressSearch({ onSelect }: { onSelect: (candidate: LocationCandidate) => void }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState({ status: "loading" });
    try {
      const result = await resolveLocation({ city: "Kraków", address: query }, request.signal);
      if (!request.signal.aborted) setState({ status: "done", result });
    } catch {
      if (!request.signal.aborted) setState({ status: "error" });
    }
  }

  const result = state.status === "done" ? state.result : null;
  const unavailable = state.status === "error" || result?.status === "unavailable";
  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={search}>
        <Field>
          <FieldLabel>Street or building in Kraków</FieldLabel>
          <div className="flex items-center gap-2">
            <Input className="min-w-0 flex-1" value={query} maxLength={200} placeholder="e.g. Długa 12" inputSize="lg" onChange={(event) => {
              controller.current?.abort();
              setQuery(event.target.value);
              setState({ status: "idle" });
            }} />
            <Button type="submit" size="lg" variant="outline" disabled={query.trim().length < 3 || state.status === "loading"}>
              {state.status === "loading" ? "Searching…" : "Find"}
            </Button>
          </div>
          <FieldDescription>Choose an address, or keep the exact map pin.</FieldDescription>
        </Field>
      </form>
      <p aria-live="polite" className="text-sm text-foreground-muted">
        {unavailable ? "Address search is unavailable. Retry Find or use the map pin."
          : result?.status === "unresolved" ? "No matching address. Correct the street/building number or use the map pin."
          : result?.status === "ambiguous" ? "Several matches — choose the correct street or building."
          : result?.status === "candidates" ? "Check the address and show it on the map before confirming." : null}
      </p>
      {result && result.candidates.length > 0 && (
        <ul aria-label="Address candidates" className="flex max-h-40 flex-col gap-1 overflow-y-auto">
          {result.candidates.map((candidate) => (
            <li key={candidate.candidate_id}>
              <Button variant="ghost" className="h-auto min-h-11 w-full justify-start whitespace-normal py-2 text-left" onClick={() => onSelect(candidate)}>
                <span className="flex flex-col">
                  <span>{candidate.label}</span>
                  <span className="text-xs text-foreground-muted">{candidate.district ? `${candidate.district}, ` : ""}Kraków · {candidate.precision === "building" ? "Building address" : "Building number unknown"}</span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

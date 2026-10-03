import { Alert, AlertDescription, AlertTitle } from "@appica/ui-react/alert";
import { Button } from "@appica/ui-react/button";
import { Spinner } from "@appica/ui-react/spinner";

type EventsStatusProps =
  | { status: "loading" }
  | { status: "error"; message: string; onRetry: () => void };

/** Loading pill and load error, floating above the map. */
export function EventsStatus(props: EventsStatusProps) {
  if (props.status === "loading") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm text-foreground shadow-lg"
      >
        <Spinner className="size-4 text-foreground-muted" aria-hidden />
        Loading events…
      </div>
    );
  }

  return (
    <Alert variant="error" className="max-w-sm shadow-lg">
      <AlertTitle>Could not load events</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        {props.message}
        <Button variant="outline" size="sm" onClick={props.onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

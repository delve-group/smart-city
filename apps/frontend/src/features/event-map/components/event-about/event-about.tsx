import { Badge } from "@appica/ui-react/badge";
import type { CityEvent } from "@/api/events/types";
import { formatPrice } from "../../utils/format-price";
import { PanelSection } from "../panel-section/panel-section";

function accessibilityText(value: boolean | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value ? "Step-free access" : "Not confirmed — contact the organizer";
}

export function EventAbout({ event }: { event: CityEvent }) {
  const facts = [
    { label: "Organizer", value: event.organizer },
    { label: "Price", value: formatPrice(event.pricePln) },
    { label: "Accessibility", value: accessibilityText(event.wheelchairAccessible) },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));

  return (
    <PanelSection title="Details">
      <p className="text-sm leading-relaxed text-pretty text-foreground">{event.description}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        {facts.map((fact) => (
          <div key={fact.label} className="contents">
            <dt className="text-foreground-muted">{fact.label}</dt>
            <dd className="text-foreground-intense">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {event.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
          {event.tags.map((tag) => (
            <li key={tag}>
              <Badge variant="outline" size="sm">{tag}</Badge>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  );
}

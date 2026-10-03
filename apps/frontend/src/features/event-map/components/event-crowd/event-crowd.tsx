import { TrafficCone } from "@appica/icons-react";
import { Meter, MeterLabel, MeterProgress, MeterValue } from "@appica/ui-react/meter";
import type { CityEvent } from "@/api/events/types";
import { crowdLevel } from "../../utils/crowd-level";
import { PanelSection } from "../panel-section/panel-section";

const count = new Intl.NumberFormat("en-GB");

export function EventCrowd({ event }: { event: CityEvent }) {
  const crowd = event.attendance !== undefined ? crowdLevel(event.attendance) : undefined;

  return (
    <PanelSection title={crowd ? "Crowd & impact" : "Impact"}>
      {crowd && event.attendance !== undefined && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-2xl font-semibold tracking-tight text-foreground-intense tabular-nums">
              ~{count.format(event.attendance)}
            </span>
            <span className="text-sm font-medium text-foreground">{crowd.label}</span>
          </div>
          <Meter
            value={crowd.percent}
            low={40}
            high={75}
            optimum={0}
            getAriaValueText={() => `${crowd.label}, about ${count.format(event.attendance ?? 0)} people`}
          >
            <MeterLabel className="text-xs font-normal text-foreground-muted">Expected attendance</MeterLabel>
            <MeterValue className="sr-only" />
            <MeterProgress className="h-1.5" />
          </Meter>
        </div>
      )}
      <div className="flex gap-3 rounded-md bg-background-muted p-3 text-sm">
        <TrafficCone size={18} aria-hidden className="mt-0.5 shrink-0 text-foreground-muted" />
        <p className="text-foreground">{event.impact ?? "No traffic or public transport impact expected."}</p>
      </div>
    </PanelSection>
  );
}

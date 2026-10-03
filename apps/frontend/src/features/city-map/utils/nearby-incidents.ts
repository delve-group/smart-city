import type { PublicIncident } from "@/api/incidents/types";
import { distanceMeters, formatDistance } from "./distance";
export { formatDistance };

export function nearbyIncidents(origin: PublicIncident, incidents: readonly PublicIncident[]) {
  return incidents.filter((incident) => incident.id !== origin.id && incident.accepts_contributions)
    .map((incident) => ({ incident, meters: distanceMeters(origin.public_location, incident.public_location) }))
    .filter(({ meters }) => meters <= 600).sort((a, b) => a.meters - b.meters).slice(0, 5);
}

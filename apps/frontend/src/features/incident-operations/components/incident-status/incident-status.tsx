import { Badge } from "@appica/ui-react/badge";
import type { Incident } from "@/api/operations/types";
import { ASSESSMENT, RESPONSE } from "../../utils/labels";

/** Assessment and response progress are separate facts; support is evidence, not verification. */
export function IncidentStatus({ incident }: { incident: Incident }) {
  const assessment = ASSESSMENT[incident.assessment];
  const response = RESPONSE[incident.responseStatus];
  return (
    <dl className="flex flex-wrap gap-1.5">
      <div className="contents">
        <dt className="sr-only">Assessment</dt>
        <dd>
          <Badge variant={assessment.variant} size="sm" title={assessment.hint}>
            {assessment.label}
          </Badge>
        </dd>
      </div>
      <div className="contents">
        <dt className="sr-only">Response</dt>
        <dd>
          <Badge variant={response.variant} size="sm">
            {response.label}
          </Badge>
        </dd>
      </div>
      <div className="contents">
        <dt className="sr-only">Support</dt>
        <dd>
          <Badge variant="outline" size="sm" title="Distinct residents: reporters plus “affected too”. Demo identities, not verified.">
            {incident.supportCount} {incident.supportCount === 1 ? "resident" : "residents"} · unverified
          </Badge>
        </dd>
      </div>
    </dl>
  );
}

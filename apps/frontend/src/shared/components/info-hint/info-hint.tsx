import { InfoCircle } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Popover, PopoverContent, PopoverTrigger } from "@appica/ui-react/popover";
import type { ReactNode } from "react";

/** Small "i" next to a heading. Opens on hover, focus or tap, so it also works on touch screens. */
export function InfoHint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={<Button variant="ghost" size="icon-sm" aria-label={label} className="size-6 text-foreground-muted" />}
      >
        <InfoCircle size={16} />
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={6} className="max-w-72 text-sm text-pretty text-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

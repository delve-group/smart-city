import { InfoCircle } from "@appica/icons-react";
import { Button } from "@appica/ui-react/button";
import { Popover, PopoverContent, PopoverTrigger } from "@appica/ui-react/popover";
import type { IconComponent } from "@appica/icons-react";
import type { ReactNode } from "react";

/** Small "i" next to a heading. Opens on hover, focus or tap, so it also works on touch screens. */
type InfoHintProps = {
  label: string;
  /** Defaults to an "i"; e.g. a lock for "private" explains what private means. */
  icon?: IconComponent;
  children: ReactNode;
};

export function InfoHint({ label, icon: Icon = InfoCircle, children }: InfoHintProps) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        render={<Button variant="ghost" size="icon-sm" aria-label={label} className="size-6 text-foreground-muted" />}
      >
        <Icon size={16} />
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={6} className="max-w-72 text-sm text-pretty text-foreground">
        {children}
      </PopoverContent>
    </Popover>
  );
}

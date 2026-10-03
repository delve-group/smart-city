type AppBrandProps = {
  /** "map" floats over map tiles in its own container, like the other map controls; "plain" sits on a surface. */
  variant?: "map" | "plain";
  /** Second word of the lockup for a staff product, e.g. "Operator". */
  product?: string;
};

export function AppBrand({ variant = "map", product }: AppBrandProps) {
  const map = variant === "map";
  return (
    <div
      className={`flex items-center gap-2 text-foreground-intense ${
        map ? "h-12 rounded-md border border-border-strong/50 bg-background px-4 shadow-xs" : ""
      }`}
    >
      <svg viewBox="-2 -2 68 68" className="size-7 shrink-0" aria-hidden>
        <path d="M13 53C1 41 3 20 18 9C32-1 53 5 62 21L52 27C47 16 33 12 23 19C13 26 12 39 22 47Z" fill="currentColor" />
        <path d="M29 28 47 18 52 26 34 36Z" fill="currentColor" />
        <rect x="35" y="41" width="10" height="10" rx="5" fill="var(--heat-mid)" />
      </svg>
      <span className="text-lg font-semibold tracking-[-0.04em]">
        mRadar{product && ` ${product}`}
      </span>
    </div>
  );
}

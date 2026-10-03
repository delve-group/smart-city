type AppBrandProps = {
  /** "map" floats over map tiles and needs a shadow to stay legible; "plain" sits on a surface. */
  variant?: "map" | "plain";
};

export function AppBrand({ variant = "map" }: AppBrandProps) {
  const map = variant === "map";
  return (
    <div
      className={`flex items-center gap-2.5 text-foreground-intense ${
        map ? "[filter:drop-shadow(0_1px_1px_rgb(0_0_0/0.55))_drop-shadow(0_3px_8px_rgb(0_0_0/0.28))]" : ""
      }`}
    >
      <svg viewBox="-2 -2 68 68" className={`${map ? "size-10" : "size-7"} shrink-0`} aria-hidden>
        <path d="M13 53C1 41 3 20 18 9C32-1 53 5 62 21L52 27C47 16 33 12 23 19C13 26 12 39 22 47Z" fill="currentColor" />
        <path d="M29 28 47 18 52 26 34 36Z" fill="currentColor" />
        <rect x="35" y="41" width="10" height="10" rx="5" fill="var(--heat-mid)" />
      </svg>
      <span className={`${map ? "text-2xl" : "text-lg"} font-semibold tracking-[-0.04em]`}>mRadar</span>
    </div>
  );
}

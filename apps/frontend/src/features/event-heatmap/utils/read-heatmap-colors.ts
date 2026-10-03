/** Map layers need literal colors, so read them from the active theme tokens. */
export function readHeatmapColors() {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(name).trim();
  return { low: token("--info"), mid: token("--warning"), high: token("--error") };
}

const pln = new Intl.NumberFormat("en-GB", { style: "currency", currency: "PLN", maximumFractionDigits: 0 });

export function formatPrice(pricePln: number | undefined): string | undefined {
  if (pricePln === undefined) return undefined;
  return pricePln === 0 ? "Free" : pln.format(pricePln);
}

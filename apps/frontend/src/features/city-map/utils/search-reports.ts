import type { Category } from "@/api/categories/types";
import type { CityReport } from "@/api/reports/types";

/** Lowercase and strip diacritics, so "grzegorzecka" finds "Grzegórzecka". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l").toLowerCase();
}

/** Every word must appear in the title, address, district, category or reference. Title matches first. */
export function searchReports(
  reports: readonly CityReport[],
  categoriesById: ReadonlyMap<string, Category>,
  query: string,
  limit = 6,
): CityReport[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  return reports
    .map((report) => {
      const title = normalize(report.title);
      const haystack = normalize(
        [report.title, report.address, report.district, categoriesById.get(report.categoryId)?.label, report.reference].join(" "),
      );
      if (!words.every((word) => haystack.includes(word))) return null;
      const titleRank = words.every((word) => title.includes(word)) ? 0 : 1;
      return { report, titleRank };
    })
    .filter((match): match is { report: CityReport; titleRank: number } => match !== null)
    .sort((a, b) => a.titleRank - b.titleRank || b.report.confirmations - a.report.confirmations)
    .slice(0, limit)
    .map(({ report }) => report);
}

/** Open reports most residents are affected by — shown before the user types. */
export function topReports(reports: readonly CityReport[], limit = 5): CityReport[] {
  return reports
    .filter((report) => report.status !== "resolved")
    .toSorted((a, b) => b.confirmations - a.confirmations)
    .slice(0, limit);
}

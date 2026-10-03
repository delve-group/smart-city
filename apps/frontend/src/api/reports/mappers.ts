import { reportDtoSchema, type CityReport, type ReportDto, type ReportsResult } from "./types";

export function mapReportDto(dto: ReportDto): CityReport {
  return {
    id: dto.id,
    reference: dto.reference,
    categoryId: dto.category_id,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    severity: dto.severity,
    source: dto.source,
    reportedAt: dto.reported_at,
    updatedAt: dto.updated_at,
    location: { lat: dto.lat, lng: dto.lng },
    address: dto.address,
    district: dto.district,
    confirmations: dto.confirmations,
    responsible: dto.responsible,
    expectedFixAt: dto.expected_fix_at,
    affected: dto.affected,
  };
}

/**
 * Keeps valid records that belong to a known category and counts the rest.
 * Every report must belong to exactly one API-defined category.
 */
export function mapReportsResponse(
  source: string,
  items: readonly unknown[],
  categoryIds: ReadonlySet<string>,
): ReportsResult {
  const reports: CityReport[] = [];
  let invalidCount = 0;
  for (const item of items) {
    const result = reportDtoSchema.safeParse(item);
    if (result.success && categoryIds.has(result.data.category_id)) reports.push(mapReportDto(result.data));
    else invalidCount++;
  }
  return { source, reports, invalidCount };
}

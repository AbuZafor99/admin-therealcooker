import { AnalyticsView } from "@/components/analytics-view";
import { searchFilters, type SearchParameters } from "@/lib/search-filters";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const filters = searchFilters(await searchParams);
  return <AnalyticsView autoExport={filters.export === "1"} />;
}

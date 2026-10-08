import { OperationsList } from "@/components/operations-list";
import { searchFilters, type SearchParameters } from "@/lib/search-filters";

export default async function Page({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const filters = searchFilters(await searchParams);
  return <OperationsList key={JSON.stringify(filters)} section="events" initialFilters={filters} />;
}

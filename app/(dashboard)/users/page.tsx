import { UsersList } from "@/components/users-list";
import { searchFilters, type SearchParameters } from "@/lib/search-filters";

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const filters = searchFilters(await searchParams);
  return <UsersList key={JSON.stringify(filters)} initialFilters={filters} />;
}

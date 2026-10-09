export type SearchParameters = Record<string, string | string[] | undefined>;

export function searchFilters(params: SearchParameters): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).flatMap(([key, value]) => {
      const first = Array.isArray(value) ? value[0] : value;
      return first === undefined ? [] : [[key, first]];
    })
  );
}

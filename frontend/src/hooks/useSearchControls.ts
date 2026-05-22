import { useCallback, useState } from "react";
import { useDebounce } from "./useDebounce";

type UseSearchControlsOptions = {
  debounceMs?: number;
  initialSearchInput?: string;
};

export function useSearchControls(options?: UseSearchControlsOptions) {
  const debounceMs = options?.debounceMs ?? 300;
  const [searchInput, setSearchInput] = useState(options?.initialSearchInput ?? "");
  const debouncedSearch = useDebounce(searchInput, debounceMs);
  const [instantSearch, setInstantSearch] = useState((options?.initialSearchInput ?? "").trim());

  const search = instantSearch || debouncedSearch;
  const setSearchFromExternal = useCallback((next: string) => {
    setSearchInput(next);
    setInstantSearch(next.trim());
  }, []);
  const clearInstantSearch = useCallback(() => setInstantSearch(""), []);
  const applyInstantSearch = useCallback(() => setInstantSearch(searchInput.trim()), [searchInput]);
  const clearAllSearch = useCallback(() => {
    setSearchInput("");
    setInstantSearch("");
  }, []);

  return {
    searchInput,
    setSearchInput,
    setSearchFromExternal,
    search,
    clearInstantSearch,
    applyInstantSearch,
    clearAllSearch,
  };
}

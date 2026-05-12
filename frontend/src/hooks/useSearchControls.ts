import { useState } from "react";
import { useDebounce } from "./useDebounce";

type UseSearchControlsOptions = {
  debounceMs?: number;
};

export function useSearchControls(options?: UseSearchControlsOptions) {
  const debounceMs = options?.debounceMs ?? 300;
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, debounceMs);
  const [instantSearch, setInstantSearch] = useState("");

  const search = instantSearch || debouncedSearch;

  return {
    searchInput,
    setSearchInput,
    search,
    clearInstantSearch: () => setInstantSearch(""),
    applyInstantSearch: () => setInstantSearch(searchInput.trim()),
    clearAllSearch: () => {
      setSearchInput("");
      setInstantSearch("");
    },
  };
}

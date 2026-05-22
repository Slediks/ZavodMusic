import { useEffect, useRef } from "react";

type SortDirection = "asc" | "desc";

type UseUrlListFiltersOptions = {
  page: number;
  setPage: (next: number) => void;
  limit: number;
  setLimit: (next: number) => void;
  searchInput: string;
  setSearchInput: (next: string) => void;
  defaultPage?: number;
  defaultLimit?: number;
  searchParamName?: string;
  sortBy?: string;
  setSortBy?: (next: string) => void;
  allowedSortBy?: string[];
  defaultSortBy?: string;
  sortDirection?: SortDirection;
  setSortDirection?: (next: SortDirection) => void;
  defaultSortDirection?: SortDirection;
};

const toPositiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.trunc(parsed);
  return rounded > 0 ? rounded : fallback;
};

export function useUrlListFilters(options: UseUrlListFiltersOptions) {
  const {
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput,
    defaultPage = 1,
    defaultLimit,
    searchParamName = "search",
    sortBy,
    setSortBy,
    allowedSortBy,
    defaultSortBy,
    sortDirection,
    setSortDirection,
    defaultSortDirection,
  } = options;

  const stateRef = useRef({ page, limit, searchInput, sortBy, sortDirection });
  const settersRef = useRef({ setPage, setLimit, setSearchInput, setSortBy, setSortDirection });
  const configRef = useRef({ defaultPage, defaultLimit, searchParamName, allowedSortBy, defaultSortBy, defaultSortDirection });
  const isApplyingUrlRef = useRef(false);

  useEffect(() => {
    stateRef.current = { page, limit, searchInput, sortBy, sortDirection };
  }, [page, limit, searchInput, sortBy, sortDirection]);

  useEffect(() => {
    settersRef.current = { setPage, setLimit, setSearchInput, setSortBy, setSortDirection };
  }, [setPage, setLimit, setSearchInput, setSortBy, setSortDirection]);

  useEffect(() => {
    configRef.current = { defaultPage, defaultLimit, searchParamName, allowedSortBy, defaultSortBy, defaultSortDirection };
  }, [defaultPage, defaultLimit, searchParamName, allowedSortBy, defaultSortBy, defaultSortDirection]);

  useEffect(() => {
    const applyFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const current = stateRef.current;
      const cfg = configRef.current;
      const setters = settersRef.current;

      isApplyingUrlRef.current = true;

      if (params.has("page")) {
        const nextPage = toPositiveInt(params.get("page"), cfg.defaultPage);
        if (nextPage !== current.page) setters.setPage(nextPage);
      } else if (current.page !== cfg.defaultPage) {
        setters.setPage(cfg.defaultPage);
      }

      if (params.has("limit")) {
        const fallbackLimit = cfg.defaultLimit ?? current.limit;
        const nextLimit = toPositiveInt(params.get("limit"), fallbackLimit);
        if (nextLimit !== current.limit) setters.setLimit(nextLimit);
      }

      const nextSearchInput = params.get(cfg.searchParamName) ?? "";
      if (nextSearchInput !== current.searchInput) setters.setSearchInput(nextSearchInput);

      if (setters.setSortBy && current.sortBy !== undefined) {
        const nextSortByRaw = params.get("sortBy");
        const nextSortBy = nextSortByRaw && (!cfg.allowedSortBy || cfg.allowedSortBy.includes(nextSortByRaw))
          ? nextSortByRaw
          : cfg.defaultSortBy;
        if (nextSortBy && nextSortBy !== current.sortBy) setters.setSortBy(nextSortBy);
      }

      if (setters.setSortDirection && current.sortDirection !== undefined) {
        const nextSortDirectionRaw = params.get("sortDirection");
        const nextSortDirection: SortDirection | undefined =
          nextSortDirectionRaw === "asc" || nextSortDirectionRaw === "desc"
            ? nextSortDirectionRaw
            : cfg.defaultSortDirection;
        if (nextSortDirection && nextSortDirection !== current.sortDirection) setters.setSortDirection(nextSortDirection);
      }

      queueMicrotask(() => {
        isApplyingUrlRef.current = false;
      });
    };

    applyFromUrl();
    window.addEventListener("popstate", applyFromUrl);
    return () => window.removeEventListener("popstate", applyFromUrl);
  }, []);

  useEffect(() => {
    if (isApplyingUrlRef.current) return;

    const cfg = configRef.current;
    const params = new URLSearchParams(window.location.search);

    const normalizedPage = Math.max(cfg.defaultPage, Math.trunc(page) || cfg.defaultPage);
    if (normalizedPage === cfg.defaultPage) params.delete("page");
    else params.set("page", String(normalizedPage));

    const normalizedLimit = Math.max(1, Math.trunc(limit) || 1);
    if (cfg.defaultLimit !== undefined && normalizedLimit === cfg.defaultLimit) params.delete("limit");
    else params.set("limit", String(normalizedLimit));

    if (searchInput) params.set(cfg.searchParamName, searchInput);
    else params.delete(cfg.searchParamName);

    if (sortBy !== undefined) {
      if (cfg.defaultSortBy && sortBy === cfg.defaultSortBy) params.delete("sortBy");
      else params.set("sortBy", sortBy);
    }

    if (sortDirection !== undefined) {
      if (cfg.defaultSortDirection && sortDirection === cfg.defaultSortDirection) params.delete("sortDirection");
      else params.set("sortDirection", sortDirection);
    }

    const nextSearch = params.toString();
    const currentSearch = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;

    if (nextSearch !== currentSearch) {
      const nextUrl = nextSearch ? `${window.location.pathname}?${nextSearch}` : window.location.pathname;
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [page, limit, searchInput, sortBy, sortDirection]);
}

import { useMemo } from "react";

type UsePaginationParams = {
  total: number;
  page: number;
  limit: number;
};

export function usePagination({ total, page, limit }: UsePaginationParams) {
  return useMemo(() => {
    const pages = total <= 0 ? 0 : Math.ceil(total / limit);
    return {
      pages,
      hasPrev: page > 1,
      hasNext: pages > 0 && page < pages,
    };
  }, [total, page, limit]);
}



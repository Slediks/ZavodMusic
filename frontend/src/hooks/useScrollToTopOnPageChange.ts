import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export function useScrollToTopOnPageChange(page: number, targetRef: RefObject<HTMLElement | null>) {
  const isFirstRenderRef = useRef(true);
  const prevPageRef = useRef(page);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPageRef.current = page;
      return;
    }

    if (prevPageRef.current !== page) {
      requestAnimationFrame(() => {
        if (targetRef.current) targetRef.current.scrollTop = 0;
      });
      prevPageRef.current = page;
    }
  }, [page, targetRef]);
}

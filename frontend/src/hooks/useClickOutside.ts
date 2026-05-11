import { useEffect } from "react";
import type { RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutside: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const onMouseDown = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      if (!node.contains(event.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [enabled, onOutside, ref]);
}



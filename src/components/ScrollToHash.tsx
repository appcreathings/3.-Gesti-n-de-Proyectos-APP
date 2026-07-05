import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to the element identified by `location.hash` whenever the hash
 * changes. Use inside pages that need hash-based navigation (e.g. landing
 * sections reachable from other routes).
 */
export function ScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return null;
}

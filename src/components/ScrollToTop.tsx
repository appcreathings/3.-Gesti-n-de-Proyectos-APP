import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router (createBrowserRouter) doesn't reset scroll position on
 * navigation between routes. Without this, a page opened while scrolled
 * down (e.g. clicking a card near the bottom of an index) renders at the
 * previous scroll offset instead of the top.
 *
 * Skips when a hash is present so it doesn't fight with ScrollToHash's
 * scrollIntoView on the same navigation.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}

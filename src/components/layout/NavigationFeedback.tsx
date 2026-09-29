"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (!anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return false;
  if (anchor.origin !== window.location.origin) return false;
  if (anchor.pathname === window.location.pathname && anchor.search === window.location.search) return false;
  return !anchor.href.startsWith("javascript:");
}

export function NavigationFeedback() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(false);
  }, [pathname]);

  useEffect(() => {
    let timeout: number | undefined;

    const start = () => {
      if (timeout) window.clearTimeout(timeout);
      setLoading(true);
      timeout = window.setTimeout(() => setLoading(false), 12000);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (target instanceof HTMLAnchorElement && isInternalNavigation(target)) start();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", start);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="navigation-feedback" role="status" aria-live="polite" aria-label="در حال بارگذاری">
      <span className="navigation-feedback-bar" />
      <span className="navigation-feedback-spinner" />
    </div>
  );
}

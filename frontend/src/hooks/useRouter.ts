import { useCallback, useEffect, useMemo, useState } from "react";
import { matchRoute } from "../utils/routes";

const getPathname = () => window.location.pathname || "/";

export const useRouter = (isAuthorized: boolean) => {
  const [pathname, setPathname] = useState(getPathname);

  useEffect(() => {
    const onPopState = () => setPathname(getPathname());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    if (to === pathname) return;
    if (replace) {
      window.history.replaceState({}, "", to);
    } else {
      window.history.pushState({}, "", to);
    }
    setPathname(getPathname());
  }, [pathname]);

  const route = useMemo(() => matchRoute(pathname), [pathname]);
  const isProtectedPath = Boolean(route?.protected);

  useEffect(() => {
    if (isProtectedPath && !isAuthorized) {
      navigate("/", true);
    }
  }, [isAuthorized, isProtectedPath, navigate]);

  return { pathname, route, navigate };
};





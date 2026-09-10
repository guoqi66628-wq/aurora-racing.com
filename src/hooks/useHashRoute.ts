/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";

export type Route = "home" | "specs" | "story" | "team";

function parseHash(): Route {
  const path = window.location.hash.replace(/^#\/?/, "").split("/")[0].toLowerCase();
  switch (path) {
    case "specs":
      return "specs";
    case "story":
      return "story";
    case "team":
      return "team";
    default:
      return "home";
  }
}

/** 轻量 hash 路由：跟随 URL 的 #/specs、#/story、#/team，默认首页。 */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

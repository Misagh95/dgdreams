"use client";

import { useEffect, useState } from "react";

/**
 * True when the active theme is the light one.
 *
 * Components that pick their own colours (rather than using the CSS variables)
 * need to know: the mission deck's palette is pastel, which reads as coloured on
 * the dark theme but turns into near-white on white in the light theme. The
 * attribute is watched rather than read once, so switching themes updates the UI
 * without a reload.
 */
export function useIsLightTheme(): boolean {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const read = () =>
      setIsLight(
        document.documentElement.getAttribute("data-theme") === "web3-light"
      );

    // The html tag ships with data-theme already set, so read before observing.
    read();

    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => obs.disconnect();
  }, []);

  return isLight;
}

export default useIsLightTheme;
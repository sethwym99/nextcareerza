import { useEffect, useState, type ReactNode } from "react";
import { isNativeApp } from "@/lib/platform";

/**
 * Renders children only on the web (marketing site / browser). Returns null
 * inside the installed native app — useful for "Get the app" / "Download"
 * CTAs that don't make sense once the user is already in the app.
 */
export function WebOnly({ children }: { children: ReactNode }) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeApp());
  }, []);
  if (native) return null;
  return <>{children}</>;
}

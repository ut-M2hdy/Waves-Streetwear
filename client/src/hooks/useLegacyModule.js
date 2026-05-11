import { useEffect } from "react";

export default function useLegacyModule(loader) {
  useEffect(() => {
    if (typeof loader !== "function") return undefined;
    loader().catch(() => {
      // ignore legacy load errors
    });
    return undefined;
  }, [loader]);
}

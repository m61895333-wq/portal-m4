"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPageView } from "@/lib/portal-cms";

export function HitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Registramos o hit toda vez que o caminho da URL mudar
    if (typeof window !== "undefined") {
      recordPageView(pathname).catch(console.error);
    }
  }, [pathname]);

  return null;
}

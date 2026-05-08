"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordHitAction } from "./admin/actions";

export function HitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Registramos o hit toda vez que o caminho da URL mudar via Server Action
    recordHitAction(pathname);
  }, [pathname]);

  return null;
}

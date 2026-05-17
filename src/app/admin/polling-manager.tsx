"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PollingManager({ isGenerating }: { isGenerating: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!isGenerating) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 10000); // 10 segundos

    return () => clearInterval(interval);
  }, [isGenerating, router]);

  return null;
}

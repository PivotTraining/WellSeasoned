"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SampleDataButton({ hasData }: { hasData: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function run(method: "POST" | "DELETE") {
    setPending(true);
    try {
      await fetch("/api/seed", { method });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="ghost"
      onClick={() => run(hasData ? "DELETE" : "POST")}
      disabled={pending}
    >
      {pending
        ? "Working…"
        : hasData
          ? "Clear demo data"
          : "Load sample data"}
    </Button>
  );
}

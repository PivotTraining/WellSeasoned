"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/campaigns/new", label: "New Campaign" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-forge-line bg-forge-panel p-6">
      <Link href="/dashboard" className="mb-8 text-xl font-bold">
        Outbound<span className="text-forge-accent">Forge</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-forge-bg font-medium text-white"
                  : "text-zinc-400 hover:bg-forge-bg hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto text-xs text-zinc-500">AI SDR · v0.1</div>
    </aside>
  );
}

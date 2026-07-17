"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Home", icon: "M3 10.5 12 3l9 7.5M5 9v11h14V9" },
  {
    href: "/dashboard/campaigns",
    label: "Campaigns",
    icon: "M4 5h16M4 12h16M4 19h10",
  },
  {
    href: "/dashboard/campaigns/new",
    label: "New Campaign",
    icon: "M12 5v14M5 12h14",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-forge-line bg-white px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold text-ink"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-xs font-bold text-white">
          O
        </span>
        Outbound<span className="-ml-1 text-brand">Forge</span>
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-brand-soft font-medium text-brand"
                  : "text-body hover:bg-forge-bg hover:text-ink"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-2 text-xs text-muted">AI SDR · v0.1</div>
    </aside>
  );
}

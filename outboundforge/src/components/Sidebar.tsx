import Link from "next/link";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/campaigns/new", label: "New Campaign" },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-forge-line bg-forge-panel p-6">
      <div className="mb-8 text-xl font-bold">
        Outbound<span className="text-forge-accent">Forge</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-forge-bg hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto text-xs text-zinc-500">AI SDR · v0.1</div>
    </aside>
  );
}

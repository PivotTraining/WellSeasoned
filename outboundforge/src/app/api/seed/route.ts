import { NextResponse } from "next/server";
import { seedSampleData, clearSampleData, usingDb } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Populate the in-memory demo store with sample campaigns so the dashboard
 * charts have data to show. Refused when Supabase is connected — we never
 * write sample rows into a real database.
 */
export async function POST() {
  if (usingDb()) {
    return NextResponse.json(
      { error: "Sample data is only for the in-memory demo store." },
      { status: 400 },
    );
  }
  const n = await seedSampleData();
  return NextResponse.json({ seeded: n });
}

export async function DELETE() {
  if (usingDb()) {
    return NextResponse.json({ error: "Not a demo store." }, { status: 400 });
  }
  await clearSampleData();
  return NextResponse.json({ cleared: true });
}

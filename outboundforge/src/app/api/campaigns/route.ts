import { NextResponse } from "next/server";
import { ICPSchema, parseLeads } from "@/lib/types";
import { addLeads, createCampaign, listCampaigns, usingDb } from "@/lib/store";
import { runCampaign } from "@/lib/runCampaign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const campaigns = await listCampaigns();
  return NextResponse.json({ campaigns, persisted: usingDb() });
}

export async function POST(req: Request) {
  let body: { name?: string; icp?: string; leads?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const icpText = (body.icp ?? "").trim();
  if (!name || !icpText) {
    return NextResponse.json(
      { error: "name and icp are required" },
      { status: 400 },
    );
  }

  const icp = ICPSchema.parse({ description: icpText });
  const campaign = await createCampaign({ name, icp });

  const leads = parseLeads(body.leads ?? "");
  await addLeads(campaign.id, leads);

  const summary = await runCampaign(campaign.id);

  return NextResponse.json({
    campaign: { id: campaign.id, name, status: "done" },
    summary,
    persisted: usingDb(),
  });
}

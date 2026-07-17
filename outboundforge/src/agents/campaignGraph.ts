import { Annotation, StateGraph, START, END } from "@langchain/langgraph";
import { llmComplete } from "@/lib/llm";
import type { Draft, Enrichment, Lead } from "@/lib/types";
import { researchLead } from "./tools/research";
import { scoreLead } from "./scoring";
import { logStep, sendOutreach } from "@/lib/runtime";

/**
 * Multi-agent campaign pipeline: research → personalize → outreach, with a
 * supervisor that decides whether to retry or finish. State is defined with
 * LangGraph annotations so each node returns a partial update.
 */
export const CampaignState = Annotation.Root({
  campaignId: Annotation<string>,
  lead: Annotation<Lead>,
  enriched: Annotation<Enrichment | undefined>,
  score: Annotation<number | undefined>,
  draft: Annotation<Draft | undefined>,
  outcome: Annotation<"success" | "retry" | "skipped" | undefined>,
  attempts: Annotation<number>({
    reducer: (prev, next) => next ?? prev,
    default: () => 0,
  }),
});

export type CampaignStateT = typeof CampaignState.State;

async function researchNode(state: CampaignStateT) {
  const enriched = await researchLead(state.lead);
  const score = await scoreLead(enriched);
  await logStep(state.campaignId, "research", state.lead, { enriched, score });
  return { enriched, score, attempts: state.attempts + 1 };
}

async function personalizeNode(state: CampaignStateT) {
  const voice = "warm, concise, no fluff";
  const raw = await llmComplete(
    `Write a cold outreach email to ${state.lead.contact} at ` +
      `${state.lead.company}. Brand voice: ${voice}. ` +
      `Context: ${state.enriched?.summary ?? "n/a"}. ` +
      `Signals: ${JSON.stringify(state.enriched?.signals ?? [])}. ` +
      `Return "Subject: ...\\n\\n<body>".`,
  );
  const [subjectLine, ...rest] = raw.split("\n");
  const draft: Draft = {
    subject: subjectLine.replace(/^subject:\s*/i, "").trim() || "Quick idea",
    body: rest.join("\n").trim() || raw,
    channel: "email",
  };
  await logStep(state.campaignId, "personalize", state.enriched, draft);
  return { draft };
}

async function outreachNode(state: CampaignStateT) {
  const result = await sendOutreach(state.lead, state.draft);
  await logStep(state.campaignId, "outreach", state.draft, result);
  return { outcome: result.sent ? "success" : "retry" };
}

function supervisorRoute(state: CampaignStateT): "research" | typeof END {
  // Retry once on a failed send; otherwise finish.
  if (state.outcome === "retry" && state.attempts < 2) return "research";
  return END;
}

export function buildCampaignGraph() {
  return new StateGraph(CampaignState)
    .addNode("research", researchNode)
    .addNode("personalize", personalizeNode)
    .addNode("outreach", outreachNode)
    .addEdge(START, "research")
    .addEdge("research", "personalize")
    .addEdge("personalize", "outreach")
    .addConditionalEdges("outreach", supervisorRoute, ["research", END])
    .compile();
}

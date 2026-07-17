import { configured, env } from "./env";

/**
 * Thin LLM wrapper. Lazily imports @langchain/openai only when a key is
 * present, so `next build` and unconfigured runs never touch the SDK.
 */
export async function llmComplete(prompt: string): Promise<string> {
  if (!configured.llm) {
    return `[llm not configured] ${prompt.slice(0, 120)}`;
  }
  const { ChatOpenAI } = await import("@langchain/openai");
  const model = new ChatOpenAI({
    model: env.openaiModel,
    temperature: 0.3,
    apiKey: env.openaiApiKey,
  });
  const res = await model.invoke(prompt);
  return typeof res.content === "string"
    ? res.content
    : JSON.stringify(res.content);
}

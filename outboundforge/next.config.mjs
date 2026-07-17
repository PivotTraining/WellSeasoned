/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // LangChain packages ship ESM + optional native deps; keep them server-side.
  serverExternalPackages: ["@langchain/langgraph", "@langchain/core", "@langchain/openai"],
};

export default nextConfig;

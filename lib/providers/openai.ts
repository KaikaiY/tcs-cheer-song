import "server-only";
import OpenAI from "openai";
import { creativeBriefInstructions, creativeBriefSchema } from "../prompts/creative-brief";
import { parseCreativeBrief } from "../validation";
import type { Submission } from "../types";
export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export async function openaiCreativeBrief(input: Submission, signal: AbortSignal) {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45_000,
    maxRetries: 0,
  });
  const response = await client.responses.create(
    {
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      store: false,
      instructions: creativeBriefInstructions,
      input: JSON.stringify(input),
      max_output_tokens: 1800,
      text: {
        format: {
          type: "json_schema",
          name: "creative_brief",
          strict: true,
          schema: creativeBriefSchema,
        },
      },
    },
    { signal },
  );
  if (response.status !== "completed") throw new Error("Incomplete response");
  const brief = parseCreativeBrief(JSON.parse(response.output_text));
  if (brief.style !== input.style) throw new Error("Style mismatch");
  return brief;
}

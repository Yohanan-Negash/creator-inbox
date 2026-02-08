import {
  buildRequestTypeSystemPrompt,
  buildRequestTypeUserPrompt,
} from "@/lib/inference/prompt";
import {
  type GenerateRequestTypesInput,
  type GenerateRequestTypesOutput,
  generateRequestTypesResponseFormat,
} from "@/lib/inference/schemas";
import { getInferenceModel, inferenceClient } from "@/lib/inference/client";

export async function generateRequestTypes(
  input: GenerateRequestTypesInput,
): Promise<GenerateRequestTypesOutput> {
  const systemPrompt = buildRequestTypeSystemPrompt();
  const userPrompt = buildRequestTypeUserPrompt(input);

  const completion = await inferenceClient.chat.completions.parse({
    model: getInferenceModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: generateRequestTypesResponseFormat,
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Inference output was empty.");
  }

  return parsed;
}

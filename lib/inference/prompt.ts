import type { GenerateRequestTypesInput } from "@/lib/inference/schemas";
import { REQUEST_TYPE_DESCRIPTION_MAX_LENGTH } from "@/lib/request-types/constants";

export function buildRequestTypeSystemPrompt() {
  return [
    "You are an expert creator monetization strategist.",
    "Generate high-converting paid request type ideas for creator inbox products.",
    "Return valid structured output that follows the response schema exactly.",
    "Only generate ideas relevant to creator request types.",
    "Each request type must include:",
    "- a short clear title",
    `- a simple practical description with a concrete TEXT response deliverable (max ${REQUEST_TYPE_DESCRIPTION_MAX_LENGTH} characters)`,
    "- realistic USD price",
    "- realistic responseWindowHours as a positive integer",
    "Request types in this app are text-message response products only.",
    "Do not generate deliverables involving videos, calls, voice notes, files, or screen recordings.",
    "Do not explicitly write phrases like 'text response' or mention the medium in the description.",
    "Avoid vague, generic, or repetitive ideas.",
    "If the user input is unsafe, unrelated, or too weak to produce good request types, set rejected=true, add a short rejectionReason, and return an empty requestTypes array.",
  ].join("\n");
}

export function buildRequestTypeUserPrompt(input: GenerateRequestTypesInput) {
  const existing =
    input.existingRequestTypes && input.existingRequestTypes.length > 0
      ? input.existingRequestTypes
          .map((item, index) => {
            const price = item.price ? `$${item.price.toFixed(2)}` : "N/A";
            const window = item.responseWindowHours
              ? `${item.responseWindowHours}h`
              : "N/A";

            return `${index + 1}. ${item.title} | price=${price} | window=${window}`;
          })
          .join("\n")
      : "None";

  return [
    `Generate ${input.count} request type ideas.`,
    "Goal:",
    input.prompt,
    "",
    "Creator context:",
    input.creatorContext,
    "",
    "Target audience:",
    input.targetAudience,
    "",
    "Existing request types (avoid duplicates):",
    existing,
    "",
    "Pricing and deliverables should be realistic and easy to understand.",
    "Descriptions should explain exactly what the buyer gets, without explicitly naming the response medium.",
    `Keep each description at or below ${REQUEST_TYPE_DESCRIPTION_MAX_LENGTH} characters.`,
  ].join("\n");
}

import OpenAI from "openai";

const INFERENCE_BASE_URL = "https://api.inference.net/v1";

function getInferenceApiKey() {
  const apiKey = process.env.INFERENCE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing INFERENCE_API_KEY.");
  }

  return apiKey;
}

export const inferenceClient = new OpenAI({
  baseURL: INFERENCE_BASE_URL,
  apiKey: getInferenceApiKey(),
});

export function getInferenceModel() {
  return process.env.INFERENCE_MODEL ?? "google/gemma-3-27b-instruct/bf-16";
}

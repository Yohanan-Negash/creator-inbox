import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { REQUEST_TYPE_DESCRIPTION_MAX_LENGTH } from "@/lib/request-types/constants";

export const GeneratedRequestTypeSchema = z.object({
  title: z.string().trim().min(1).max(80),
  description: z
    .string()
    .trim()
    .min(1)
    .max(REQUEST_TYPE_DESCRIPTION_MAX_LENGTH),
  price: z.number().positive(),
  responseWindowHours: z.number().int().positive(),
});

export const GenerateRequestTypesOutputSchema = z.object({
  rejected: z.boolean(),
  rejectionReason: z.string(),
  requestTypes: z.array(GeneratedRequestTypeSchema).max(3),
});

export const generateRequestTypesResponseFormat = zodResponseFormat(
  GenerateRequestTypesOutputSchema,
  "generate_request_types_output",
);

export type GenerateRequestTypesOutput = z.infer<
  typeof GenerateRequestTypesOutputSchema
>;

export const GenerateRequestTypesInputSchema = z.object({
  experienceId: z.string().trim().min(1, "experienceId is required."),
  prompt: z
    .string()
    .trim()
    .min(24, "prompt must be at least 24 characters.")
    .max(1200, "prompt must be at most 1200 characters.")
    .refine(
      (value) => value.split(/\s+/).filter(Boolean).length >= 5,
      "prompt must include at least 5 words.",
    ),
  creatorContext: z
    .string()
    .trim()
    .min(12, "creatorContext must be at least 12 characters.")
    .max(600, "creatorContext must be at most 600 characters."),
  targetAudience: z
    .string()
    .trim()
    .min(5, "targetAudience must be at least 5 characters.")
    .max(160, "targetAudience must be at most 160 characters."),
  count: z.coerce
    .number()
    .int("count must be a whole number.")
    .min(1, "count must be at least 1.")
    .max(3, "count must be at most 3.")
    .default(3),
  existingRequestTypes: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        price: z.number().positive().optional(),
        responseWindowHours: z.number().int().positive().optional(),
      }),
    )
    .max(10)
    .optional(),
  whopDevUserToken: z.string().optional(),
});

export type GenerateRequestTypesInput = z.infer<
  typeof GenerateRequestTypesInputSchema
>;

export const GenerateRequestTypesRouteInputSchema = z.object({
  experienceId: z.string().trim().min(1, "experienceId is required."),
  intent: z
    .string()
    .trim()
    .min(8, "intent must be at least 8 characters.")
    .max(160, "intent must be at most 160 characters."),
  existingRequestTypes: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        price: z.number().positive().optional(),
        responseWindowHours: z.number().int().positive().optional(),
      }),
    )
    .max(10)
    .optional(),
  whopDevUserToken: z.string().optional(),
});

export type GenerateRequestTypesRouteInput = z.infer<
  typeof GenerateRequestTypesRouteInputSchema
>;

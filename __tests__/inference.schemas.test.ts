import { describe, expect, it } from "vitest";
import {
  GenerateRequestTypesOutputSchema,
  GenerateRequestTypesRouteInputSchema,
} from "../lib/inference/schemas";

describe("inference schemas", () => {
  it("accepts existing request types with free pricing", () => {
    const parsed = GenerateRequestTypesRouteInputSchema.safeParse({
      experienceId: "exp_123",
      intent: "Generate a good request type",
      existingRequestTypes: [
        {
          title: "Quick question",
          price: 0,
          responseWindowHours: 24,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts generated request types with free pricing", () => {
    const parsed = GenerateRequestTypesOutputSchema.safeParse({
      rejected: false,
      rejectionReason: "",
      requestTypes: [
        {
          title: "Quick question",
          description: "Ask anything and get a short reply.",
          price: 0,
          responseWindowHours: 24,
        },
      ],
    });

    expect(parsed.success).toBe(true);
  });
});

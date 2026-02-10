import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("requestTypes integer validation", () => {
  it("rejects decimal price on create", async () => {
    const t = createConvexTest();

    await expect(
      t.mutation(api.requestTypes.createRequestType, {
        experienceId: "exp-int-create",
        viewerUserId: "creator-int-create",
        title: "Review",
        description: "Review request",
        price: 19.99,
        responseWindowHours: 24,
      }),
    ).rejects.toThrowError("Price must be a positive whole number.");
  });

  it("rejects decimal response window on update", async () => {
    const t = createConvexTest();
    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId: "exp-int-update",
      viewerUserId: "creator-int-update",
      title: "Audit",
      description: "Audit request",
      price: 25,
      responseWindowHours: 24,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type missing.");
    }

    await expect(
      t.mutation(api.requestTypes.updateRequestType, {
        requestTypeId: requestType._id,
        viewerUserId: "creator-int-update",
        title: "Audit",
        description: "Audit request",
        price: 25,
        responseWindowHours: 12.5,
      }),
    ).rejects.toThrowError("Response window must be a positive whole number.");
  });
});

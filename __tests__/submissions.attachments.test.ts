import { describe, expect, it } from "vitest";
import { api } from "../convex/_generated/api";
import { createConvexTest } from "./convex.setup";

describe("submissions attachments", () => {
  it("rejects registration when attachments are disabled", async () => {
    const t = createConvexTest();
    const experienceId = "exp-attachments-disabled";
    const creatorId = "creator-attachments-disabled";
    const memberId = "member-attachments-disabled";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "File review",
      description: "Upload one file for review",
      price: 0,
      responseWindowHours: 24,
      allowAttachments: false,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type missing.");
    }

    let storageId = "";
    await t.run(async (ctx) => {
      storageId = await ctx.storage.store(new Blob(["%PDF-1.7 sample"], { type: "application/pdf" }));
    });

    await expect(
      t.mutation((api as any).submissions.registerPendingSubmissionAttachment, {
        viewerUserId: memberId,
        experienceId,
        requestTypeId: requestType._id,
        storageId: storageId as never,
        fileName: "brief.pdf",
      }),
    ).rejects.toThrowError("Attachments are not enabled for this request.");
  });

  it("rejects unsupported attachment MIME types", async () => {
    const t = createConvexTest();
    const experienceId = "exp-attachments-invalid-type";
    const creatorId = "creator-attachments-invalid-type";
    const memberId = "member-attachments-invalid-type";

    const requestType = await t.mutation(api.requestTypes.createRequestType, {
      experienceId,
      viewerUserId: creatorId,
      title: "Doc review",
      description: "Upload doc",
      price: 0,
      responseWindowHours: 24,
      allowAttachments: true,
    });

    expect(requestType).not.toBeNull();
    if (!requestType) {
      throw new Error("Request type missing.");
    }

    let storageId = "";
    await t.run(async (ctx) => {
      storageId = await ctx.storage.store(new Blob(["plain text"], { type: "text/plain" }));
    });

    await expect(
      t.mutation((api as any).submissions.registerPendingSubmissionAttachment, {
        viewerUserId: memberId,
        experienceId,
        requestTypeId: requestType._id,
        storageId: storageId as never,
        fileName: "notes.txt",
      }),
    ).rejects.toThrowError("Attachment file type is not supported.");
  });
});

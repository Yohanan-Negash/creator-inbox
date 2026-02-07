import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listActiveByExperience = query({
  args: {
    experienceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requestTypes")
      .withIndex("by_experience_active", (q) =>
        q.eq("experienceId", args.experienceId).eq("isActive", true),
      )
      .collect();
  },
});

export const listByExperienceCreator = query({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("requestTypes")
      .withIndex("by_experience_creator", (q) =>
        q.eq("experienceId", args.experienceId).eq("creatorId", args.viewerUserId),
      )
      .collect();
  },
});

export const createRequestType = mutation({
  args: {
    experienceId: v.string(),
    viewerUserId: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    responseWindowHours: v.number(),
  },
  handler: async (ctx, args) => {
    const requestTypeId = await ctx.db.insert("requestTypes", {
      experienceId: args.experienceId,
      creatorId: args.viewerUserId,
      title: args.title,
      description: args.description,
      price: args.price,
      responseWindowHours: args.responseWindowHours,
      isActive: true,
    });

    return await ctx.db.get(requestTypeId);
  },
});

export const archiveRequestType = mutation({
  args: {
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request type not found.");
    }

    if (requestType.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.requestTypeId, {
      isActive: false,
    });

    return await ctx.db.get(args.requestTypeId);
  },
});

export const unarchiveRequestType = mutation({
  args: {
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request type not found.");
    }

    if (requestType.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.requestTypeId, {
      isActive: true,
    });

    return await ctx.db.get(args.requestTypeId);
  },
});

export const updateRequestType = mutation({
  args: {
    requestTypeId: v.id("requestTypes"),
    viewerUserId: v.string(),
    title: v.string(),
    description: v.string(),
    price: v.number(),
    responseWindowHours: v.number(),
  },
  handler: async (ctx, args) => {
    const requestType = await ctx.db.get(args.requestTypeId);
    if (!requestType) {
      throw new Error("Request type not found.");
    }

    if (requestType.creatorId !== args.viewerUserId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.requestTypeId, {
      title: args.title,
      description: args.description,
      price: args.price,
      responseWindowHours: args.responseWindowHours,
    });

    return await ctx.db.get(args.requestTypeId);
  },
});

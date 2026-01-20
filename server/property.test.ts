import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("property.search", () => {
  it("returns properties with pagination info", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.property.search({
      limit: 10,
      offset: 0,
    });

    expect(result).toHaveProperty("properties");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.properties)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("filters by status", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const rentResult = await caller.property.search({
      status: "rent",
      limit: 10,
      offset: 0,
    });

    expect(rentResult).toHaveProperty("properties");
    // All returned properties should be for rent
    rentResult.properties.forEach((p) => {
      expect(p.status).toBe("rent");
    });
  });

  it("filters by property type", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const houseResult = await caller.property.search({
      propertyType: "house",
      limit: 10,
      offset: 0,
    });

    expect(houseResult).toHaveProperty("properties");
    // All returned properties should be houses
    houseResult.properties.forEach((p) => {
      expect(p.propertyType).toBe("house");
    });
  });
});

describe("property.featured", () => {
  it("returns featured properties with limit", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.property.featured({ limit: 6 });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(6);
  });
});

describe("property.forMap", () => {
  it("returns properties with coordinates", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.property.forMap();

    expect(Array.isArray(result)).toBe(true);
    // Each property should have location data
    result.forEach((p) => {
      expect(p).toHaveProperty("id");
      expect(p).toHaveProperty("title");
      expect(p).toHaveProperty("price");
      expect(p).toHaveProperty("status");
      expect(p).toHaveProperty("location");
    });
  });
});

describe("favorite.toggle", () => {
  it("requires authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.favorite.toggle({ propertyId: 1 })
    ).rejects.toThrow();
  });
});

describe("inquiry.create", () => {
  it("validates required fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // Should throw validation error for missing fields
    await expect(
      caller.inquiry.create({
        propertyId: 1,
        senderName: "",
        senderEmail: "invalid-email",
        message: "",
      })
    ).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@example.com");
    expect(result?.name).toBe("Test User");
  });
});

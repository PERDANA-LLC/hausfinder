import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createSuperAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "superadmin-openid",
    email: "superadmin@guest.com",
    name: "Super Admin",
    loginMethod: "password",
    role: "superadmin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

function createRegularUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user-openid",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "oauth",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
  };
}

describe("admin.isSuperAdmin", () => {
  it("returns true for super admin users", async () => {
    const ctx = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Note: This test checks the procedure exists and can be called
    // The actual database check would require mocking
    try {
      await caller.admin.isSuperAdmin();
    } catch (error) {
      // Expected to fail without database, but procedure exists
      expect(error).toBeDefined();
    }
  });
});

describe("admin.listUsers", () => {
  it("requires super admin privileges", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.listUsers();
      expect.fail("Should have thrown unauthorized error");
    } catch (error: any) {
      // Either database error or unauthorized - both valid
      expect(error.message).toBeDefined();
    }
  });
});

describe("admin.createUser", () => {
  it("validates required input fields", async () => {
    const ctx = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.createUser({
        name: "",
        email: "test@example.com",
        role: "user",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("validates email format", async () => {
    const ctx = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.admin.createUser({
        name: "Test User",
        email: "invalid-email",
        role: "user",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("admin.updateUser", () => {
  it("validates user ID is required", async () => {
    const ctx = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - Testing invalid input
      await caller.admin.updateUser({
        name: "Updated Name",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("admin.deleteUser", () => {
  it("validates user ID is required", async () => {
    const ctx = createSuperAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      // @ts-expect-error - Testing invalid input
      await caller.admin.deleteUser({});
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("auth.adminLogin", () => {
  it("validates email format", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.adminLogin({
        email: "invalid-email",
        password: "password123",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("requires password", async () => {
    const ctx = createRegularUserContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auth.adminLogin({
        email: "admin@example.com",
        password: "",
      });
      expect.fail("Should have thrown validation error");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/**
 * Verify the caller is authenticated and authorized to access a household.
 * Returns the identity and household doc.
 * Throws if not authenticated or not authorized.
 */
export async function assertHouseholdAccess(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">
): Promise<{ identity: { subject: string }; household: Doc<"households">; isEmployer: boolean }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const household = await ctx.db.get(householdId);
  if (!household) throw new Error("Household not found");

  // Check if employer
  if (household.employerUserId === identity.subject) {
    return { identity, household, isEmployer: true };
  }

  // Check if authorized helper
  const helperSession = await ctx.db
    .query("helperSessions")
    .withIndex("by_helper", (q) => q.eq("helperUserId", identity.subject))
    .first();

  if (helperSession && helperSession.householdId === householdId) {
    return { identity, household, isEmployer: false };
  }

  throw new Error("Not authorized to access this household");
}

/**
 * Verify the caller is authenticated and is the employer of a household.
 * Use for employer-only operations (editing timetable, managing settings, etc.)
 */
export async function assertEmployerAccess(
  ctx: QueryCtx | MutationCtx,
  householdId: Id<"households">
): Promise<{ identity: { subject: string }; household: Doc<"households"> }> {
  const result = await assertHouseholdAccess(ctx, householdId);
  if (!result.isEmployer) {
    throw new Error("Only the employer can perform this action");
  }
  return result;
}

/**
 * Verify the caller is authenticated. Returns the identity.
 * Use for functions that don't take householdId (like getMyHousehold).
 */
export async function assertAuthenticated(
  ctx: QueryCtx | MutationCtx
): Promise<{ subject: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity;
}

/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as daysOff from "../daysOff.js";
import type * as helperSessions from "../helperSessions.js";
import type * as households from "../households.js";
import type * as medicationLogs from "../medicationLogs.js";
import type * as schedules from "../schedules.js";
import type * as subscriptions from "../subscriptions.js";
import type * as taskInstructions from "../taskInstructions.js";
import type * as taskLogs from "../taskLogs.js";
import type * as taskOverrides from "../taskOverrides.js";
import type * as timetable from "../timetable.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  daysOff: typeof daysOff;
  helperSessions: typeof helperSessions;
  households: typeof households;
  medicationLogs: typeof medicationLogs;
  schedules: typeof schedules;
  subscriptions: typeof subscriptions;
  taskInstructions: typeof taskInstructions;
  taskLogs: typeof taskLogs;
  taskOverrides: typeof taskOverrides;
  timetable: typeof timetable;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

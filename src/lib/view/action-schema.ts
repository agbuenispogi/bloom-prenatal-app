// What runDayActions accepts. Shared so tests can check that every action the screen sends (Undo included) passes.
import { z } from "zod";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const uuid = z.string().uuid();
const occurrence = z.number().int().min(1).max(10);
const meal = z.enum(["breakfast", "lunch", "dinner"]);
const iso = z.string().datetime({ offset: true });

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("take"), ruleId: uuid, occurrence, time: hhmm.optional() }),
  z.object({ type: z.literal("snooze"), ruleId: uuid, occurrence, minutes: z.union([z.literal(10), z.literal(20), z.literal(30)]) }),
  z.object({ type: z.literal("skip"), ruleId: uuid, occurrence, reason: z.string().trim().max(200).optional() }),
  z.object({ type: z.literal("resetDose"), ruleId: uuid, occurrence }),
  z.object({ type: z.literal("intend"), meal, minutes: z.number().int().min(0).max(180).optional() }),
  z.object({ type: z.literal("eat"), meal, time: hhmm.optional() }),
  z.object({ type: z.literal("resetMeal"), meal }),
  z.object({ type: z.literal("snack"), time: hhmm.optional() }),
  z.object({ type: z.literal("removeSnack"), eatenAt: iso }),
  z.object({ type: z.literal("skipBreakfast") }),
  z.object({ type: z.literal("bed") }),
  z.object({ type: z.literal("serving"), ruleId: uuid, time: hhmm.optional() }),
  z.object({
    type: z.literal("putDose"),
    ruleId: uuid,
    occurrence,
    status: z.enum(["taken", "skipped", "snoozed", "pending", "missed"]),
    takenAt: iso.nullable(),
    snoozedUntil: iso.nullable(),
    reason: z.string().max(200).nullable(),
  }),
  z.object({ type: z.literal("putMeal"), meal, plannedAt: iso.nullable(), eatenAt: iso.nullable() }),
  z.object({ type: z.literal("putCareDay"), breakfastSkipped: z.boolean(), bedtimeAt: iso.nullable() }),
]);

export const dayActionsSchema = z.array(actionSchema).min(1).max(5);

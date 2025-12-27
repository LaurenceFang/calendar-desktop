import { z } from "zod";

export const APP_NAME = "Calendar Desktop";

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  time: z.string()
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const EventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  timezone: z.string(),
  location: z.string().nullable(),
  notes: z.string().nullable(),
  color: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string()
});

export type Event = z.infer<typeof EventSchema>;

export const EventCreateInputSchema = z.object({
  title: z.string().min(1),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  timezone: z.string().default("Asia/Taipei"),
  location: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().optional()
});

export type EventCreateInput = z.infer<typeof EventCreateInputSchema>;

export const EventUpdateInputSchema = z.object({
  title: z.string().min(1),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  timezone: z.string(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  color: z.string().nullable().optional()
});

export type EventUpdateInput = z.infer<typeof EventUpdateInputSchema>;

export const OccurrenceSchema = z.object({
  id: z.string(),
  event_id: z.string(),
  title: z.string(),
  start_at: z.string(),
  end_at: z.string(),
  timezone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  color: z.string().nullable().optional()
});

export type Occurrence = z.infer<typeof OccurrenceSchema>;

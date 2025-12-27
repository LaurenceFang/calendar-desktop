import { z } from "zod";

export const APP_NAME = "Calendar Desktop";

export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  time: z.string()
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { EventCreateInputSchema, EventSchema } from "@calendar/shared";
import { getDatabase, resolveDatabasePath } from "./db/database.js";

const app = express();
const port = 3101;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const db = getDatabase();
const listEventsStatement = db.prepare(
  "SELECT id, title, start_at, end_at, timezone, location, notes, color, created_at, updated_at FROM events ORDER BY start_at ASC"
);
const insertEventStatement = db.prepare(
  `INSERT INTO events (id, title, start_at, end_at, timezone, location, notes, color, created_at, updated_at)
   VALUES (@id, @title, @start_at, @end_at, @timezone, @location, @notes, @color, @created_at, @updated_at)`
);
const deleteEventStatement = db.prepare("DELETE FROM events WHERE id = ?");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/events", (_req, res) => {
  const rows = listEventsStatement.all();
  const events = z.array(EventSchema).parse(rows);
  res.json(events);
});

app.post("/api/events", (req, res) => {
  try {
    const payload = EventCreateInputSchema.parse(req.body);
    const now = new Date().toISOString();
    const event = {
      id: randomUUID(),
      title: payload.title,
      start_at: payload.start_at,
      end_at: payload.end_at,
      timezone: payload.timezone,
      location: payload.location ?? null,
      notes: payload.notes ?? null,
      color: payload.color ?? null,
      created_at: now,
      updated_at: now
    };

    insertEventStatement.run(event);

    res.status(201).json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid event payload", details: error.errors });
      return;
    }

    res.status(500).json({ error: "Failed to create event" });
  }
});

app.delete("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const result = deleteEventStatement.run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.status(204).send();
});

app.listen(port, () => {
  const dbPath = resolveDatabasePath();
  console.log(`[api] using db at ${dbPath}`);
  console.log(`[api] listening on http://localhost:${port}`);
});

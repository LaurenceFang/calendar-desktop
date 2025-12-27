import cors from "cors";
import express from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  EventCreateInputSchema,
  EventSchema,
  EventUpdateInputSchema,
  OccurrenceSchema
} from "@calendar/shared";
import { getDatabase, resolveDatabasePath } from "./db/database.js";

const app = express();
const port = 3101;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const db = getDatabase();
const listEventsStatement = db.prepare(
  "SELECT id, title, start_at, end_at, timezone, location, notes, color, created_at, updated_at FROM events ORDER BY start_at ASC"
);
const listOccurrencesStatement = db.prepare(
  `SELECT id, title, start_at, end_at, timezone, location, notes, color
   FROM events
   WHERE start_at < @to AND end_at > @from
   ORDER BY start_at ASC`
);
const getEventStatement = db.prepare(
  "SELECT id, title, start_at, end_at, timezone, location, notes, color, created_at, updated_at FROM events WHERE id = ?"
);
const insertEventStatement = db.prepare(
  `INSERT INTO events (id, title, start_at, end_at, timezone, location, notes, color, created_at, updated_at)
   VALUES (@id, @title, @start_at, @end_at, @timezone, @location, @notes, @color, @created_at, @updated_at)`
);
const updateEventStatement = db.prepare(
  `UPDATE events
   SET title = @title,
       start_at = @start_at,
       end_at = @end_at,
       timezone = @timezone,
       location = @location,
       notes = @notes,
       color = @color,
       updated_at = @updated_at
   WHERE id = @id`
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

app.get("/api/occurrences", (req, res) => {
  const querySchema = z.object({
    from: z.string().datetime(),
    to: z.string().datetime()
  });

  try {
    const query = querySchema.parse({ from: req.query.from, to: req.query.to });
    const rows = listOccurrencesStatement.all({ from: query.from, to: query.to });
    const occurrences = rows.map((row) => ({
      id: row.id,
      event_id: row.id,
      title: row.title,
      start_at: row.start_at,
      end_at: row.end_at,
      timezone: row.timezone,
      location: row.location,
      notes: row.notes,
      color: row.color
    }));
    res.json(OccurrenceSchema.array().parse(occurrences));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid query range", details: error.errors });
      return;
    }
    res.status(500).json({ error: "Failed to load occurrences" });
  }
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

app.put("/api/events/:id", (req, res) => {
  const { id } = req.params;

  try {
    const payload = EventUpdateInputSchema.parse(req.body);
    const now = new Date().toISOString();

    const result = updateEventStatement.run({
      id,
      title: payload.title,
      start_at: payload.start_at,
      end_at: payload.end_at,
      timezone: payload.timezone,
      location: payload.location ?? null,
      notes: payload.notes ?? null,
      color: payload.color ?? null,
      updated_at: now
    });

    if (result.changes === 0) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const updated = getEventStatement.get(id);
    res.json(EventSchema.parse(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid event payload", details: error.errors });
      return;
    }
    res.status(500).json({ error: "Failed to update event" });
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

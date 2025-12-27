import {
  EventSchema,
  EventUpdateInputSchema,
  OccurrenceSchema,
  type Event,
  type EventCreateInput,
  type EventUpdateInput,
  type Occurrence
} from "@calendar/shared";

const fallbackApiBaseUrl = "http://localhost:3101";

const getApiBaseUrl = () => {
  if (window.electronAPI) {
    return window.electronAPI.getApiBaseUrl();
  }
  return fallbackApiBaseUrl;
};

export const apiBaseUrl = getApiBaseUrl();

export async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function getOccurrences(from: string, to: string): Promise<Occurrence[]> {
  const data = await fetchJSON<unknown>(
    `${apiBaseUrl}/api/occurrences?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
  return OccurrenceSchema.array().parse(data);
}

export async function createEvent(payload: EventCreateInput): Promise<Event> {
  const data = await fetchJSON<unknown>(`${apiBaseUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return EventSchema.parse(data);
}

export async function updateEvent(id: string, payload: EventUpdateInput): Promise<Event> {
  const validated = EventUpdateInputSchema.parse(payload);
  const data = await fetchJSON<unknown>(`${apiBaseUrl}/api/events/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validated)
  });
  return EventSchema.parse(data);
}

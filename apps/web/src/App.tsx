import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  APP_NAME,
  Event,
  EventCreateInputSchema,
  EventSchema,
  HealthResponseSchema
} from "@calendar/shared";

const fallbackApiBaseUrl = "http://localhost:3101";

const getApiClient = () => {
  if (window.electronAPI) {
    return {
      baseUrl: window.electronAPI.getApiBaseUrl(),
      ping: window.electronAPI.pingApi
    };
  }

  return {
    baseUrl: fallbackApiBaseUrl,
    ping: async () => {
      const response = await fetch(`${fallbackApiBaseUrl}/api/health`);
      const data = await response.json();
      return HealthResponseSchema.parse(data);
    }
  };
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const App = () => {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [healthMessage, setHealthMessage] = useState<string>("");
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsStatus, setEventsStatus] = useState<
    "idle" | "loading" | "ready" | "saving" | "error"
  >("idle");
  const [eventsMessage, setEventsMessage] = useState<string>("");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const apiBaseUrl = useMemo(() => getApiClient().baseUrl, []);

  const loadEvents = async () => {
    setEventsStatus("loading");
    setEventsMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/events`);
      if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
      }
      const data = await response.json();
      const parsed = EventSchema.array().parse(data);
      setEvents(parsed);
      setEventsStatus("ready");
    } catch (error) {
      setEventsMessage((error as Error).message);
      setEventsStatus("error");
    }
  };

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      try {
        const api = getApiClient();
        const health = await api.ping();
        setHealthMessage(`ok=${health.ok} time=${health.time}`);
        setStatus("ready");
      } catch (error) {
        setHealthMessage(`failed: ${(error as Error).message}`);
        setStatus("error");
      }
    };

    load();
    void loadEvents();
  }, [apiBaseUrl]);

  const handleAddEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEventsStatus("saving");
    setEventsMessage("");

    try {
      if (!startAt || !endAt) {
        throw new Error("Start and end times are required.");
      }
      const payload = EventCreateInputSchema.parse({
        title,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString()
      });

      const response = await fetch(`${apiBaseUrl}/api/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Failed to create event");
      }

      const created = EventSchema.parse(await response.json());
      setEvents((prev) =>
        [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at))
      );
      setTitle("");
      setStartAt("");
      setEndAt("");
      setEventsStatus("ready");
    } catch (error) {
      setEventsMessage((error as Error).message);
      setEventsStatus("error");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    setEventsStatus("saving");
    setEventsMessage("");
    try {
      const response = await fetch(`${apiBaseUrl}/api/events/${id}`, {
        method: "DELETE"
      });

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete event (${response.status})`);
      }

      setEvents((prev) => prev.filter((eventItem) => eventItem.id !== id));
      setEventsStatus("ready");
    } catch (error) {
      setEventsMessage((error as Error).message);
      setEventsStatus("error");
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Calendar Desktop (Bootstrap)</h1>
        <p>Web is running.</p>
      </header>
      <section className="panel">
        <h2>Status</h2>
        <dl>
          <div>
            <dt>API Base URL</dt>
            <dd>{getApiClient().baseUrl}</dd>
          </div>
          <div>
            <dt>API Health</dt>
            <dd>
              {status === "loading" ? "Checking..." : healthMessage || "Not checked"}
            </dd>
          </div>
          <div>
            <dt>Shared Package</dt>
            <dd>{APP_NAME}</dd>
          </div>
        </dl>
      </section>
      <section className="panel">
        <h2>Events</h2>
        <form onSubmit={handleAddEvent}>
          <div>
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(eventItem) => setTitle(eventItem.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              Start
              <input
                type="datetime-local"
                value={startAt}
                onChange={(eventItem) => setStartAt(eventItem.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              End
              <input
                type="datetime-local"
                value={endAt}
                onChange={(eventItem) => setEndAt(eventItem.target.value)}
                required
              />
            </label>
          </div>
          <button type="submit" disabled={eventsStatus === "saving"}>
            {eventsStatus === "saving" ? "Saving..." : "Add Event"}
          </button>
        </form>
        {eventsMessage ? <p role="alert">{eventsMessage}</p> : null}
        <p>
          Persistence check: restart the app and verify the events list stays the same.
        </p>
        {eventsStatus === "loading" ? (
          <p>Loading events...</p>
        ) : events.length === 0 ? (
          <p>No events yet.</p>
        ) : (
          <ul>
            {events.map((eventItem) => (
              <li key={eventItem.id}>
                <strong>{eventItem.title}</strong> — {formatDateTime(eventItem.start_at)} to{" "}
                {formatDateTime(eventItem.end_at)}
                <button type="button" onClick={() => handleDeleteEvent(eventItem.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default App;

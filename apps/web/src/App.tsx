import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { DateSelectArg, DatesSetArg, EventApi, EventClickArg, EventInput } from "@fullcalendar/core";
import { format, formatISO } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { toast, Toaster } from "sonner";

import {
  EventCreateInputSchema,
  type EventCreateInput,
  type Occurrence
} from "@calendar/shared";
import { apiBaseUrl, createEvent, getOccurrences, updateEvent } from "./lib/api";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "./components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { ScrollArea } from "./components/ui/scroll-area";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./components/ui/tooltip";

import "@fullcalendar/core/index.css";
import "@fullcalendar/daygrid/index.css";
import "@fullcalendar/timegrid/index.css";

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const pastelPalette = [
  "#dbeafe",
  "#fae8ff",
  "#fde68a",
  "#dcfce7",
  "#fee2e2",
  "#e0f2fe"
];

const getFallbackColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return pastelPalette[Math.abs(hash) % pastelPalette.length];
};

const toInputValue = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const fromInputValue = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }
  return date.toISOString();
};

const formatRangeLabel = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${format(start, "MMMM yyyy")}`;
  }
  return `${format(start, "MMM yyyy")} — ${format(end, "MMM yyyy")}`;
};

const defaultFormState = {
  title: "",
  startAt: "",
  endAt: "",
  location: "",
  notes: "",
  color: "#93c5fd"
};

type FormState = typeof defaultFormState & {
  id?: string;
  mode: "create" | "edit";
};

const App = () => {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [currentRange, setCurrentRange] = useState<{ start: string; end: string } | null>(null);
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [calendarView, setCalendarView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay">(
    "timeGridWeek"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    ...defaultFormState,
    mode: "create"
  });
  const [isSaving, setIsSaving] = useState(false);

  const filteredOccurrences = useMemo(() => {
    if (!searchQuery) {
      return occurrences;
    }
    const normalized = searchQuery.toLowerCase();
    return occurrences.filter((occurrence) =>
      [occurrence.title, occurrence.location ?? "", occurrence.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [occurrences, searchQuery]);

  const calendarEvents = useMemo<EventInput[]>(
    () =>
      filteredOccurrences.map((occurrence) => {
        const color = occurrence.color ?? getFallbackColor(occurrence.event_id);
        return {
          id: occurrence.id,
          title: occurrence.title,
          start: occurrence.start_at,
          end: occurrence.end_at,
          backgroundColor: color,
          borderColor: color,
          textColor: "#0f172a",
          extendedProps: {
            event_id: occurrence.event_id,
            location: occurrence.location,
            notes: occurrence.notes,
            color,
            timezone: occurrence.timezone
          }
        };
      }),
    [filteredOccurrences]
  );

  const loadOccurrences = async (range: { start: string; end: string }) => {
    try {
      const data = await getOccurrences(range.start, range.end);
      setOccurrences(data);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  useEffect(() => {
    if (!currentRange) {
      return;
    }
    void loadOccurrences(currentRange);
  }, [currentRange]);

  const handleDatesSet = (info: DatesSetArg) => {
    setCurrentRange({
      start: formatISO(info.start),
      end: formatISO(info.end)
    });
    setCurrentTitle(info.view.title);
  };

  const handleSelect = (selection: DateSelectArg) => {
    const start = selection.start;
    const end = selection.end;
    setFormState({
      mode: "create",
      title: "",
      startAt: toInputValue(start.toISOString()),
      endAt: toInputValue(end.toISOString()),
      location: "",
      notes: "",
      color: "#93c5fd"
    });
    setIsDialogOpen(true);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const { event } = clickInfo;
    const startAt = event.start ? toInputValue(event.start.toISOString()) : "";
    const endAt = event.end ? toInputValue(event.end.toISOString()) : startAt;
    const color = (event.extendedProps.color as string | undefined) ?? "#93c5fd";

    setFormState({
      mode: "edit",
      id: event.extendedProps.event_id as string,
      title: event.title,
      startAt,
      endAt,
      location: (event.extendedProps.location as string | undefined) ?? "",
      notes: (event.extendedProps.notes as string | undefined) ?? "",
      color
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    setFormState({
      mode: "create",
      title: "",
      startAt: toInputValue(now.toISOString()),
      endAt: toInputValue(nextHour.toISOString()),
      location: "",
      notes: "",
      color: "#93c5fd"
    });
    setIsDialogOpen(true);
  };

  const persistEventChange = async (event: EventApi, revert?: () => void) => {
    try {
      const start = event.start ? new Date(event.start) : new Date();
      const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);

      await updateEvent(event.extendedProps?.event_id as string, {
        title: event.title as string,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        timezone: timeZone,
        location: (event.extendedProps?.location as string | null | undefined) ?? null,
        notes: (event.extendedProps?.notes as string | null | undefined) ?? null,
        color: (event.extendedProps?.color as string | null | undefined) ?? null
      });
      toast.success("Saved");
      if (currentRange) {
        await loadOccurrences(currentRange);
      }
    } catch (error) {
      toast.error((error as Error).message);
      revert?.();
    }
  };

  const upcoming = useMemo(() => {
    const now = new Date();
    return occurrences
      .filter((occurrence) => new Date(occurrence.end_at) >= now)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .slice(0, 5);
  }, [occurrences]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (!formState.startAt || !formState.endAt) {
        throw new Error("Start and end are required.");
      }
      const payloadBase: EventCreateInput = {
        title: formState.title,
        start_at: fromInputValue(formState.startAt),
        end_at: fromInputValue(formState.endAt),
        timezone: timeZone,
        location: formState.location || undefined,
        notes: formState.notes || undefined,
        color: formState.color || undefined
      };

      if (formState.mode === "create") {
        const payload = EventCreateInputSchema.parse(payloadBase);
        await createEvent(payload);
        toast.success("Event created");
      } else if (formState.id) {
        await updateEvent(formState.id, {
          ...payloadBase,
          location: formState.location || null,
          notes: formState.notes || null,
          color: formState.color || null
        });
        toast.success("Saved");
      }

      setIsDialogOpen(false);
      if (currentRange) {
        await loadOccurrences(currentRange);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const changeView = (view: "dayGridMonth" | "timeGridWeek" | "timeGridDay") => {
    setCalendarView(view);
    const api = calendarRef.current?.getApi();
    api?.changeView(view);
  };

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };

  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };

  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };

  const handleMiniDateClick = (date: Date) => {
    calendarRef.current?.getApi().gotoDate(date);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-panel text-slate-900">
        <Toaster richColors position="top-right" />
        <div className="flex min-h-screen">
          <aside className="w-80 border-r border-border bg-white/80 px-6 py-6 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-slate-900 p-2 text-white">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Calendar</p>
                  <p className="text-lg font-semibold">My Schedule</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-slate-500">
                Local
              </Badge>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-3 shadow-soft">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{ left: "", center: "title", right: "" }}
                height="auto"
                fixedWeekCount={false}
                selectable
                showNonCurrentDates={false}
                dateClick={(info) => handleMiniDateClick(info.date)}
              />
            </div>
            <Separator className="my-6" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Calendars
                </h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Manage
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Calendar Lists</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>New Calendar</DropdownMenuItem>
                    <DropdownMenuItem>Import...</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="space-y-3">
                {["Personal", "Work", "Study"].map((label) => (
                  <label
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <Separator className="my-6" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Upcoming
                </h3>
                <Badge variant="outline" className="text-slate-500">
                  {upcoming.length}
                </Badge>
              </div>
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {upcoming.length === 0 ? (
                    <p className="text-sm text-slate-500">No upcoming events.</p>
                  ) : (
                    upcoming.map((occurrence) => (
                      <div
                        key={occurrence.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-800">
                            {occurrence.title}
                          </p>
                          <span className="text-xs text-slate-400">
                            {format(new Date(occurrence.start_at), "MMM d")}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {format(new Date(occurrence.start_at), "p")} —{" "}
                          {format(new Date(occurrence.end_at), "p")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <div className="mt-6 text-xs text-slate-400">
              API: {apiBaseUrl}
            </div>
          </aside>

          <main className="flex flex-1 flex-col gap-6 px-8 py-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Schedule</p>
                <h1 className="text-2xl font-semibold text-slate-900">{currentTitle}</h1>
                {currentRange ? (
                  <p className="text-sm text-slate-500">
                    {formatRangeLabel(new Date(currentRange.start), new Date(currentRange.end))}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handlePrev}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next</TooltipContent>
                </Tooltip>
                <Button variant="secondary" onClick={handleToday}>
                  Today
                </Button>
                <div className="flex rounded-full border border-slate-200 bg-white shadow-sm">
                  {[
                    { label: "Day", view: "timeGridDay" },
                    { label: "Week", view: "timeGridWeek" },
                    { label: "Month", view: "dayGridMonth" }
                  ].map((option) => (
                    <button
                      key={option.view}
                      type="button"
                      onClick={() => changeView(option.view as typeof calendarView)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        calendarView === option.view
                          ? "rounded-full bg-slate-900 text-white"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4" />
                  New Event
                </Button>
              </div>
            </header>

            <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView={calendarView}
                headerToolbar={false}
                height="auto"
                selectable
                editable
                eventResizableFromStart
                selectMirror
                nowIndicator
                events={calendarEvents}
                datesSet={handleDatesSet}
                select={handleSelect}
                eventClick={handleEventClick}
                eventDrop={(info) => persistEventChange(info.event, info.revert)}
                eventResize={(info) => persistEventChange(info.event, info.revert)}
                dayMaxEvents
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
              />
            </section>
          </main>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{formState.mode === "create" ? "New Event" : "Edit Event"}</DialogTitle>
              <DialogDescription>
                {formState.mode === "create"
                  ? "Add an event to your calendar."
                  : "Update event details and timing."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Title</label>
                <Input
                  value={formState.title}
                  onChange={(event) => setFormState({ ...formState, title: event.target.value })}
                  placeholder="Standup, focus time, lunch..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Start</label>
                  <Input
                    type="datetime-local"
                    value={formState.startAt}
                    onChange={(event) => setFormState({ ...formState, startAt: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">End</label>
                  <Input
                    type="datetime-local"
                    value={formState.endAt}
                    onChange={(event) => setFormState({ ...formState, endAt: event.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Location</label>
                <Input
                  value={formState.location}
                  onChange={(event) => setFormState({ ...formState, location: event.target.value })}
                  placeholder="Office, cafe, virtual"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Notes</label>
                <Textarea
                  value={formState.notes}
                  onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                  placeholder="Add any agenda or reminders"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Color</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={formState.color}
                    onChange={(event) => setFormState({ ...formState, color: event.target.value })}
                    className="h-10 w-16 p-1"
                  />
                  <span className="text-sm text-slate-500">Pick a soft accent color.</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default App;

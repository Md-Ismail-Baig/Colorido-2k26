import { requireRole } from "@/lib/auth/session";
import { ConsoleShell } from "@/components/dash/console-shell";
import { EventForm } from "@/components/dash/event-form";
import { createEvent } from "../actions";

export const metadata = { title: "New Event · Admin" };

export default async function NewEventPage() {
  const { profile } = await requireRole("admin");

  return (
    <ConsoleShell
      profile={profile}
      title="New Event"
      subtitle="Draft events stay hidden from the public until published."
    >
      <EventForm
        action={createEvent}
        submitLabel="Create Event"
        cancelHref="/admin/events"
      />
    </ConsoleShell>
  );
}

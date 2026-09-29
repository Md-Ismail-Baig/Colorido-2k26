import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { EventForm } from "@/components/dash/event-form";
import { updateEvent } from "../actions";
import type { Event } from "@/types/database";

export const metadata = { title: "Edit Event · Admin" };

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { profile } = await requireRole("admin");
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const event = data as Event;

  return (
    <ConsoleShell
      profile={profile}
      title={`Edit · ${event.name}`}
      subtitle={`Public page: /events/${event.slug}`}
    >
      <EventForm
        action={updateEvent}
        event={event}
        submitLabel="Save Changes"
        cancelHref="/admin/events"
      />
    </ConsoleShell>
  );
}

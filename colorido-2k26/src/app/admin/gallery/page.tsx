import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/dash/console-shell";
import { ConfirmButton } from "@/components/dash/confirm-button";
import { StatusPill } from "@/components/dash/data-table";
import { EmptyState } from "@/components/ui/states";
import { GalleryUploadForm } from "@/components/dash/gallery-upload-form";
import { deleteGalleryPhoto, setGalleryPublish, uploadGalleryPhoto } from "./actions";
import type { GalleryItem } from "@/types/database";

export const metadata = { title: "Gallery · Admin" };

export default async function AdminGalleryPage() {
  const { profile } = await requireRole("admin");

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();

  const [{ data: photos }, { data: events }] = await Promise.all([
    admin
      .from("gallery")
      .select("*")
      .order("created_at", { ascending: false }),
    admin.from("events").select("id, name").order("name"),
  ]);
  const eMap = new Map((events ?? []).map((e) => [e.id, e.name] as const));

  // Signed URLs (1 hour) for private-bucket browsing in the console.
  const items = ((photos ?? []) as GalleryItem[]).slice(0, 60);
  const urls = await Promise.all(
    items.map(async (p) => {
      const { data } = await admin.storage
        .from("gallery")
        .createSignedUrl(p.storage_path, 3600);
      return data?.signedUrl ?? null;
    }),
  );

  return (
    <ConsoleShell
      profile={profile}
      title="Gallery"
      subtitle={`${photos?.length ?? 0} photo(s) in Supabase Storage.`}
    >
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {items.length === 0 ? (
            <EmptyState
              title="No photos yet"
              description="Upload the first fest photo on the right."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((p, i) => (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {urls[i] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urls[i]!}
                      alt={p.title ?? "Fest photo"}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-slate-100 text-xs text-slate-400">
                      Preview unavailable
                    </div>
                  )}
                  <div className="space-y-2 p-3">
                    <div className="flex items-center gap-2">
                      <StatusPill status={p.is_published ? "published" : "draft"} />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {p.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="truncate text-sm font-medium text-slate-700">
                      {p.title || "Untitled"}
                      {p.event_id
                        ? ` · ${eMap.get(p.event_id) ?? ""}`
                        : ""}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <form action={setGalleryPublish}>
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="publish"
                          value={p.is_published ? "0" : "1"}
                        />
                        <button
                          type="submit"
                          className="rounded-full border border-slate-300 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                        >
                          {p.is_published ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                      <form action={deleteGalleryPhoto}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton label="Delete" />
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-heading text-lg font-bold text-brand-deep-purple">
            Upload Photo
          </h2>
          <GalleryUploadForm action={uploadGalleryPhoto} events={events ?? []} />
        </div>
      </div>
    </ConsoleShell>
  );
}

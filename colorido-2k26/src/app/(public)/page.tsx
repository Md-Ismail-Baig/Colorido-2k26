import Link from "next/link";
import { supabaseUrl } from "@/lib/supabase/env";
import { Countdown } from "@/components/layout/countdown";
import { SectionHeading } from "@/components/ui/section-heading";
import { EventCard } from "@/components/events/event-card";
import { Badge } from "@/components/ui/badge";
import {
  getPublishedEvents,
  getPublishedAnnouncements,
  getPublishedGallery,
  getActiveSponsors,
} from "@/lib/queries/public";
import type { Event } from "@/types/database";

const tba = <span className="italic">To be announced</span>;

export default async function HomePage() {
  const [eventsRes, annRes, galRes, spRes] = await Promise.all([
    getPublishedEvents(),
    getPublishedAnnouncements(3),
    getPublishedGallery(8),
    getActiveSponsors(),
  ]);

  const events = eventsRes.data ?? [];
  const cultural = events.filter((e) => e.category === "cultural");
  const sports = events.filter((e) => e.category === "sports");
  const featured = events.filter((e) => e.is_featured).slice(0, 3);
  const announcements = annRes.data ?? [];
  const gallery = galRes.data ?? [];
  const sponsors = spRes.data ?? [];

  return (
    <>
      {/* 1 · HERO */}
      <section
        id="hero"
        className="relative overflow-hidden bg-gradient-to-b from-brand-deep-purple via-brand-purple to-brand-royal pb-20 pt-14 text-white"
      >
        <div className="relative mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex justify-center">
            <div className="inline-flex flex-col items-center gap-1 rounded-full border border-brand-gold/30 bg-brand-deep-purple/70 px-4 py-1.5 backdrop-blur-sm">
              <span className="text-sm font-bold uppercase tracking-widest text-white">
                R.V.R. &amp; J.C. College of Engineering
              </span>
              <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-brand-light-gold">
                <span className="h-2 w-2 animate-ping rounded-full bg-brand-gold" aria-hidden />
                Inter-Collegiate Cultural &amp; Sports
                <span className="h-2 w-2 animate-ping rounded-full bg-brand-gold" aria-hidden />
              </span>
            </div>
          </div>

          <div className="mx-auto mb-10 max-w-4xl text-center">
            <h1 className="mb-3 font-heading text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              COLORIDO <span className="gold-gradient-text">2K26</span>
            </h1>
            <p className="mb-4 font-heading text-base font-semibold uppercase tracking-[0.25em] text-slate-200 sm:text-lg">
              Cultural &amp; Sports Fest
            </p>
            <p className="inline-flex items-center gap-3 rounded-lg border border-brand-gold/20 bg-white/5 px-6 py-2 text-sm font-medium tracking-wider text-brand-light-gold sm:text-base">
              28 DECEMBER 2026
            </p>
          </div>

          <div className="mb-14 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/events"
              className="rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-gold/20"
            >
              Explore Events
            </Link>
            <Link
              href="/registration"
              className="rounded-full border border-white/30 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-all hover:border-brand-gold hover:bg-white/5"
            >
              Register Now
            </Link>
          </div>

          {/* 2 · COUNTDOWN */}
          <div className="mx-auto max-w-3xl rounded-2xl border border-brand-gold/30 bg-black/40 p-6 text-center backdrop-blur-md">
            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-brand-light-gold">
              Countdown to Fest Day
            </div>
            <Countdown />
          </div>
        </div>
      </section>

      {/* 3 · ABOUT COLORIDO */}
      <section className="border-t border-brand-gold/20 bg-brand-cream py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="02 / About COLORIDO"
            title="Where Heritage Meets Athletic Excellence"
          />
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="space-y-6 text-base leading-relaxed text-slate-700 lg:col-span-6 sm:text-lg">
              <p className="text-xl font-medium leading-snug text-brand-royal">
                COLORIDO 2K26 is a premier inter-collegiate Cultural &amp;
                Sports Fest — a confluence of artistic tradition and
                athletic tenacity on one unified stage.
              </p>
              <p>
                From classical dance and battle-of-the-bands energy to
                basketball and volleyball championships, every participant
                competes with honor, mutual respect, and unbound enthusiasm.
              </p>
              <div className="grid grid-cols-3 gap-4 border-t border-brand-cream-dark pt-4">
                {[
                  [String(cultural.length), "Cultural Events"],
                  [String(sports.length), "Sports Events"],
                  [String(events.length), "Total Events"],
                ].map(([v, l]) => (
                  <div
                    key={l}
                    className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm"
                  >
                    <span className="block font-heading text-2xl font-bold text-brand-burgundy">
                      {v}
                    </span>
                    <span className="text-xs font-medium uppercase text-slate-500">
                      {l}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:col-span-6">
              {[
                ["Cultural Stages", "/images/colorido/CulturalStages.png"],
                ["Sports Arenas", "/images/colorido/Sports%20arenas.png"],
                ["Music & Theatre", "/images/colorido/Music%20&%20Theatre.png"],
                ["Team Championships", "/images/colorido/Team%20Championships.png"],
              ].map(([title, src]) => (
                <div
                  key={title}
                  className="relative flex aspect-[4/3] items-end justify-center overflow-hidden rounded-2xl border border-brand-gold/20 bg-gradient-to-br from-brand-royal to-brand-burgundy p-6 text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="relative rounded-lg bg-black/45 px-3 py-1.5 font-heading text-sm font-bold text-white backdrop-blur-sm">
                    {title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4 · CULTURAL EVENTS */}
      <section className="mandala-pattern bg-brand-deep-purple py-24 text-white">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="03 / Cultural Events"
            title="Artistic Traditions & Creative Stages"
            tone="light"
            description="Fine arts, music, dance, drama and more — the full spectrum of campus creativity."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cultural.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/events/cultural"
              className="inline-flex rounded-full border border-brand-gold/40 px-8 py-3 text-sm font-semibold uppercase tracking-wider text-brand-gold transition hover:bg-white/5"
            >
              View All Cultural Events
            </Link>
          </div>
        </div>
      </section>

      {/* 5 · SPORTS EVENTS */}
      <section className="border-y border-brand-gold/20 bg-brand-cream py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="04 / Sports Events"
            title="The Athletic Championships"
            description="Boys and Girls divisions — grit, swiftness, and strategic brilliance."
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sports.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/events/sports"
              className="inline-flex rounded-full border border-brand-cyan px-8 py-3 text-sm font-semibold uppercase tracking-wider text-sky-700 transition hover:bg-sky-50"
            >
              View All Sports Events
            </Link>
          </div>
        </div>
      </section>

      {/* 6 · FEATURED EVENTS */}
      {featured.length > 0 && (
        <section className="bg-white py-24">
          <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="05 / Featured"
              title="Spotlight Events"
              description="Handpicked highlights of COLORIDO 2K26."
            />
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7 · LATEST ANNOUNCEMENTS */}
      <section className="bg-brand-cream py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="06 / Announcements"
            title="Latest from the Organizers"
          />
          {announcements.length === 0 ? (
            <p className="text-center text-sm italic text-slate-500">
              No announcements available.
            </p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {announcements.map((a) => (
                <article
                  key={a.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      tone={
                        a.priority === "critical" || a.priority === "high"
                          ? "danger"
                          : "gold"
                      }
                    >
                      {a.priority}
                    </Badge>
                    <time className="text-xs text-slate-400">
                      {a.published_at
                        ? new Date(a.published_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : ""}
                    </time>
                  </div>
                  <h3 className="mt-3 font-heading text-lg font-bold text-brand-deep-purple">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {a.description}
                  </p>
                </article>
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link
              href="/announcements"
              className="text-sm font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
            >
              All Announcements →
            </Link>
          </div>
        </div>
      </section>

      {/* 8+9 · HIGHLIGHTS + GALLERY PREVIEW */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="07 / Gallery"
            title="Fest Highlights"
            description="Glimpses from the COLORIDO stage and arena."
          />
          {gallery.length === 0 ? (
            <EmptyGalleryNote />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {gallery.slice(0, 8).map((g) => (
                <GalleryTile key={g.id} path={g.storage_path} title={g.title} />
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link
              href="/gallery"
              className="text-sm font-semibold uppercase tracking-wider text-brand-burgundy hover:text-brand-gold"
            >
              Open the Full Gallery →
            </Link>
          </div>
        </div>
      </section>

      {/* 10 · SPONSORS */}
      <section className="border-t border-brand-gold/20 bg-brand-cream py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="08 / Sponsors"
            title="Our Partners"
            description="Organizations powering COLORIDO 2K26."
          />
          {sponsors.length === 0 ? (
            <p className="text-center text-sm italic text-slate-500">
              Sponsors — To be announced
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-6">
              {sponsors.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm"
                >
                  <p className="font-heading font-bold text-brand-deep-purple">
                    {s.name}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400">
                    {s.tier}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 11 · CONTACT CTA */}
      <section className="bg-brand-deep-purple py-20 text-white">
        <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">
            Questions about the fest?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300">
            Reach the organizing committee through the contact page — we&apos;ll
            get back to you.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-gold/20"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}

function EmptyGalleryNote() {
  return (
    <p className="text-center text-sm italic text-slate-500">
      Gallery — photos coming soon
    </p>
  );
}

/** Storage-backed gallery tile (public bucket URL). */
function GalleryTile({ path, title }: { path: string; title: string | null }) {
  return (
    <div className="aspect-square overflow-hidden rounded-xl border border-brand-gold/20 bg-brand-cream-dark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${supabaseUrl}/storage/v1/object/public/gallery/${path}`}
        alt={title ?? "Gallery image"}
        className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
        loading="lazy"
      />
    </div>
  );
}

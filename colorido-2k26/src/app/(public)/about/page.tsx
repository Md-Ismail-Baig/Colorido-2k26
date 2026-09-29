import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-deep-purple via-brand-purple to-brand-royal py-20 text-white">
        <div className="mx-auto max-w-[1440px] px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-light-gold">
            About the Festival
          </p>
          <h1 className="mt-3 font-heading text-4xl font-black sm:text-6xl">
            What is <span className="gold-gradient-text">COLORIDO</span>?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-200">
            COLORIDO 2K26 is a college-level Cultural &amp; Sports Festival —
            one day, one campus, sixteen arenas of creativity and competition.
          </p>
        </div>
      </section>

      {/* At a glance */}
      <section className="border-b border-brand-cream-dark bg-white py-16">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            ["16", "Events", "10 cultural + 6 sports divisions"],
            ["1", "Festival Day", "28 December 2026"],
            ["2", "Disciplines", "Performing arts & athletics"],
          ].map(([v, t, d]) => (
            <div
              key={t}
              className="rounded-2xl border border-slate-200 bg-brand-cream p-8 text-center shadow-sm"
            >
              <p className="font-heading text-5xl font-black text-brand-burgundy">
                {v}
              </p>
              <p className="mt-2 font-heading text-lg font-bold text-brand-deep-purple">
                {t}
              </p>
              <p className="mt-1 text-sm text-slate-500">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cultural + Sporting spirit */}
      <section className="bg-brand-cream py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-3xl border border-brand-gold/25 bg-gradient-to-br from-brand-royal to-brand-burgundy p-10 text-white">
              <h2 className="font-heading text-2xl font-bold">
                The Cultural Spirit
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                Fine arts canvases, solo voices, group choreography, narrative
                theatre, runway couture, literary wit — COLORIDO&apos;s cultural
                stages celebrate the artistic soul of collegiate life. Ten
                categories give every kind of creator a stage.
              </p>
            </div>
            <div className="rounded-3xl border border-sky-500/25 bg-gradient-to-br from-brand-deep-purple to-sky-900 p-10 text-white">
              <h2 className="font-heading text-2xl font-bold">
                The Sporting Spirit
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-200">
                Basketball, volleyball and table tennis for the Boys division;
                throwball, TenniKoit and table tennis for the Girls division.
                Six championships built on stamina, strategy and sportsmanship.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Date + venue + institution */}
      <section className="bg-brand-deep-purple py-16 text-white">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 text-center sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            ["Event Date", "28 December 2026", false],
            ["Venue", "To be announced", true],
            ["Organizing Institution", "To be announced", true],
          ].map(([label, value, tba]) => (
            <div key={label as string}>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-gold">
                {label}
              </p>
              <p
                className={`mt-2 font-heading text-xl font-bold ${
                  tba ? "italic text-white/60" : ""
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-brand-cream py-20 text-center">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Be Part of COLORIDO 2K26"
            description="Explore the events and register for your arena."
          />
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/events"
              className="rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-gold/20"
            >
              Explore Events
            </Link>
            <Link
              href="/registration"
              className="rounded-full border border-brand-burgundy/30 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-brand-burgundy transition hover:bg-white"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

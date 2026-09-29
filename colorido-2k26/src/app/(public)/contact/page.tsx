import { ContactForm } from "@/components/contact/contact-form";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Get in Touch
          </p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-brand-deep-purple sm:text-5xl">
            Contact
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Questions about events, registration, or the festival? Send us a
            message.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Info cards */}
          <div className="space-y-4">
            {[
              ["Address", "To be announced"],
              ["Phone", "To be announced"],
              ["Email", "To be announced"],
              ["Location / Map", "To be announced"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </h2>
                <p className="mt-1 text-sm italic text-slate-500">{value}</p>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
            <h2 className="mb-6 font-heading text-xl font-bold text-brand-deep-purple">
              Send a Message
            </h2>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

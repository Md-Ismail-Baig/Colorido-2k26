import { ContactForm } from "@/components/contact/contact-form";

export const metadata = { title: "Contact" };

const ADDRESS = "R.V.R. & J.C. College of Engineering, Guntur, Andhra Pradesh 522019, India";
const PHONE = "+91 90000 12345";
const PHONE_HREF = "+919000012345";
const EMAIL = "info@rvrjc.ac.in";
const MAP_URL = "https://maps.app.goo.gl/eTuS9gpu3PTThYdN6";
const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3830.325394006064!2d80.32405399999999!3d16.255085100000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a4a76e740000001%3A0xc41c8498715c6da0!2sR.V.R.%20%26%20J.C.College%20of%20Engineering!5e0!3m2!1sen!2sin!4v1790703984615!5m2!1sen!2sin";

export default function ContactPage() {
  return (
    <section className="bg-brand-cream py-14">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-burgundy">
            Get in Touch
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-brand-deep-purple sm:text-4xl">
            Contact
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
            Questions about events, registration, or the fest? Send us a
            message or reach us directly.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Info cards + map */}
          <div className="space-y-4">
            {[
              ["Address", <p key="a" className="mt-1 text-sm text-slate-600">{ADDRESS}</p>],
              [
                "Phone",
                <a
                  key="p"
                  href={`tel:${PHONE_HREF}`}
                  className="mt-1 block text-sm font-medium text-brand-burgundy hover:underline"
                >
                  {PHONE}
                </a>,
              ],
              [
                "Email",
                <a
                  key="e"
                  href={`mailto:${EMAIL}`}
                  className="mt-1 block text-sm font-medium text-brand-burgundy hover:underline"
                >
                  {EMAIL}
                </a>,
              ],
              [
                "Location",
                <a
                  key="l"
                  href={MAP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-burgundy hover:underline"
                >
                  Open in Google Maps ↗
                </a>,
              ],
            ].map(([label, value]) => (
              <div
                key={label as string}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </h2>
                {value}
              </div>
            ))}

            {/* Embedded map */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <iframe
                src={MAP_EMBED}
                width="100%"
                height="260"
                style={{ border: 0, display: "block" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="R.V.R. & J.C. College of Engineering — map"
              />
            </div>
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

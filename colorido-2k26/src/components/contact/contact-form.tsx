"use client";

import { useActionState } from "react";
import {
  submitContactMessage,
  type ContactFormState,
} from "@/app/(public)/contact/actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactMessage,
    initialState,
  );

  if (state.success) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center"
      >
        <h3 className="font-heading text-lg font-bold text-emerald-700">
          Message sent!
        </h3>
        <p className="mt-1 text-sm text-emerald-600">
          Thank you for reaching out — the organizing committee will respond
          soon.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your Name" name="name" type="text" placeholder="Full name" />
        <Field label="Email" name="email" type="email" placeholder="you@example.com" />
      </div>
      <Field label="Subject" name="subject" type="text" placeholder="What is this about?" />
      <div>
        <label
          htmlFor="message"
          className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          placeholder="Write your message…"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-gold focus:outline-none"
        />
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-lg hover:shadow-brand-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-brand-gold focus:outline-none"
      />
    </div>
  );
}

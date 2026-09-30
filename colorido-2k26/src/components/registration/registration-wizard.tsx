"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  confirmRegistration,
  type RegistrationResultState,
} from "@/app/(public)/registration/actions";
import {
  participantSchema,
  teamMemberSchema,
} from "@/lib/validations/registration";
import type { Event } from "@/types/database";

type ParticipantData = {
  full_name: string;
  roll_number: string;
  email: string;
  mobile: string;
  college: string;
  department: string;
  year_of_study: string;
  gender: "" | "male" | "female" | "other";
};

type MemberData = {
  name: string;
  roll_number: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year: string;
  gender: "" | "male" | "female" | "other";
};

const STEPS = ["Participant Details", "Event Details", "Review", "Confirmation"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-8 py-3 text-sm font-semibold uppercase tracking-wider text-brand-deep-purple transition hover:shadow-lg hover:shadow-brand-gold/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Confirm Registration"}
    </button>
  );
}

export function RegistrationWizard({
  event,
}: {
  event: Event;
}) {
  const [state, formAction] = useActionState<
    RegistrationResultState,
    FormData
  >(confirmRegistration, {});

  const isTeamEvent = event.registration_mode === "team";
  const min = event.team_size_min ?? 1;
  const max = event.team_size_max ?? 20;

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [participant, setParticipant] = useState<ParticipantData>({
    full_name: "",
    roll_number: "",
    email: "",
    mobile: "",
    college: "",
    department: "",
    year_of_study: "",
    gender: "",
  });

  // First member is the registering participant (captain for team events).
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<MemberData[]>([]);

  const addMember = () => {
    if (members.length + 1 >= max) return;
    setMembers((m) => [
      ...m,
      {
        name: "",
        roll_number: "",
        email: "",
        phone: "",
        college: participant.college,
        department: "",
        year: "",
        gender: "",
      },
    ]);
  };

  const updateMember = (i: number, patch: Partial<MemberData>) =>
    setMembers((m) => m.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const removeMember = (i: number) =>
    setMembers((m) => m.filter((_, idx) => idx !== i));

  // ---------- step validation ----------
  const validateStep1 = () => {
    const e: Record<string, string> = {};
    const parsed = participantSchema.safeParse(participant);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!e[key]) e[key] = issue.message;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (isTeamEvent) {
      if (teamName.trim().length < 2) e.team_name = "Enter a team name (min 2 characters)";
      const total = members.length + 1; // + captain (you)
      if (total < min || total > max) {
        e.team_size = `Team must have ${min}–${max} members including you (currently ${total}).`;
      }
      members.forEach((m, i) => {
        const parsed = teamMemberSchema.safeParse(m);
        if (!parsed.success) {
          const first = parsed.error.issues[0];
          e[`member_${i}`] = `Member ${i + 2}: ${first?.message ?? "Invalid details"}`;
        }
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  // ---------- success ----------
  if (state.step === "success" && state.registrationNumber) {
    return (
      <SuccessPanel
        registrationId={state.registrationId!}
        registrationNumber={state.registrationNumber}
        eventName={event.name}
        awaitingVerification={state.awaitingVerification ?? false}
        verificationEmailSent={state.verificationEmailSent ?? false}
      />
    );
  }

  // Captain row (locked from step 1)
  const captain: MemberData = {
    name: participant.full_name,
    roll_number: participant.roll_number,
    email: participant.email,
    phone: participant.mobile,
    college: participant.college,
    department: participant.department,
    year: participant.year_of_study,
    gender: participant.gender,
  };

  const payload = JSON.stringify({
    event_id: event.id,
    participant,
    team: isTeamEvent
      ? {
          team_name: teamName,
          members: [captain, ...members],
        }
      : undefined,
  });

  const dateLabel = new Date(`${event.event_date}T00:00:00`).toLocaleDateString(
    "en-IN",
    { day: "numeric", month: "long", year: "numeric" },
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Stepper */}
      <ol className="mb-10 flex items-center justify-between gap-2" aria-label="Registration steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n || (state.step === "success");
          return (
            <li key={label} className="flex flex-1 flex-col items-center text-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-brand-gold text-brand-deep-purple"
                      : "border border-slate-300 bg-white text-slate-400"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : n}
              </span>
              <span
                className={`mt-1.5 hidden text-[11px] font-semibold uppercase tracking-wider sm:block ${
                  active ? "text-brand-deep-purple" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <form action={formAction}>
        <input type="hidden" name="payload" value={payload} />

        {/* STEP 1 — Participant Details */}
        {step === 1 && (
          <fieldset className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <legend className="sr-only">Participant details</legend>
            <h2 className="font-heading text-xl font-bold text-brand-deep-purple">
              Participant Details
            </h2>
            <p className="-mt-3 text-xs text-slate-500">
              Student roll number is <strong>mandatory</strong> for every
              registration.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <RField label="Full Name *" error={errors.full_name}>
                <input id="full_name" className={inputCls} value={participant.full_name}
                  onChange={(e) => setParticipant({ ...participant, full_name: e.target.value })} />
              </RField>
              <RField label="Student Roll Number *" error={errors.roll_number}>
                <input id="roll_number" className={inputCls} value={participant.roll_number}
                  onChange={(e) => setParticipant({ ...participant, roll_number: e.target.value })} />
              </RField>
              <RField label="Email *" error={errors.email}>
                <input id="email" type="email" className={inputCls} value={participant.email}
                  onChange={(e) => setParticipant({ ...participant, email: e.target.value })} />
              </RField>
              <RField label="Mobile Number *" error={errors.mobile}>
                <input id="mobile" inputMode="tel" placeholder="10-digit mobile" className={inputCls} value={participant.mobile}
                  onChange={(e) => setParticipant({ ...participant, mobile: e.target.value })} />
              </RField>
              <RField label="College / Institution *" error={errors.college} full>
                <input id="college" className={inputCls} value={participant.college}
                  onChange={(e) => setParticipant({ ...participant, college: e.target.value })} />
              </RField>
              <RField label="Department">
                <input id="department" className={inputCls} value={participant.department}
                  onChange={(e) => setParticipant({ ...participant, department: e.target.value })} />
              </RField>
              <RField label="Year of Study">
                <input id="year_of_study" placeholder="e.g. 2nd Year" className={inputCls} value={participant.year_of_study}
                  onChange={(e) => setParticipant({ ...participant, year_of_study: e.target.value })} />
              </RField>
              <RField label="Gender *" error={errors.gender}>
                <select id="gender" className={inputCls} value={participant.gender}
                  onChange={(e) => setParticipant({ ...participant, gender: e.target.value as ParticipantData["gender"] })}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </RField>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={next} className={nextBtnCls}>
                Continue →
              </button>
            </div>
          </fieldset>
        )}

        {/* STEP 2 — Event / Team Details */}
        {step === 2 && (
          <fieldset className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <legend className="sr-only">Event details</legend>
            <h2 className="font-heading text-xl font-bold text-brand-deep-purple">
              Event Details
            </h2>

            <div className="rounded-xl border border-brand-gold/30 bg-brand-cream p-4 text-sm">
              <p className="font-heading text-lg font-bold text-brand-deep-purple">
                {event.name}
              </p>
              <p className="mt-1 text-slate-600">
                {isTeamEvent
                  ? `Team event · ${min}–${max} members (including you)`
                  : "Individual event"}{" "}
                · {dateLabel} · {event.venue ?? "Venue: To be announced"}
              </p>
            </div>

            {isTeamEvent && (
              <div className="space-y-4">
                <RField label="Team Name *" error={errors.team_name} full>
                  <input
                    id="team_name"
                    className={inputCls}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                  />
                </RField>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Captain (you) — from step 1
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {participant.full_name} · Roll {participant.roll_number}
                  </p>
                </div>

                {errors.team_size && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                    {errors.team_size}
                  </p>
                )}

                {members.map((m, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Team Member {i + 2}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {errors[`member_${i}`] && (
                      <p role="alert" className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        {errors[`member_${i}`]}
                      </p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <RField label="Full Name *">
                        <input className={inputCls} value={m.name}
                          onChange={(e) => updateMember(i, { name: e.target.value })} />
                      </RField>
                      <RField label="Roll Number *">
                        <input className={inputCls} value={m.roll_number}
                          onChange={(e) => updateMember(i, { roll_number: e.target.value })} />
                      </RField>
                      <RField label="Email">
                        <input type="email" className={inputCls} value={m.email}
                          onChange={(e) => updateMember(i, { email: e.target.value })} />
                      </RField>
                      <RField label="Phone">
                        <input inputMode="tel" className={inputCls} value={m.phone}
                          onChange={(e) => updateMember(i, { phone: e.target.value })} />
                      </RField>
                      <RField label="College *">
                        <input className={inputCls} value={m.college}
                          onChange={(e) => updateMember(i, { college: e.target.value })} />
                      </RField>
                      <RField label="Gender">
                        <select className={inputCls} value={m.gender}
                          onChange={(e) => updateMember(i, { gender: e.target.value as MemberData["gender"] })}>
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </RField>
                    </div>
                  </div>
                ))}

                {members.length + 1 < max && (
                  <button
                    type="button"
                    onClick={addMember}
                    className="w-full rounded-xl border-2 border-dashed border-slate-300 py-3 text-sm font-semibold text-brand-burgundy hover:border-brand-gold hover:text-brand-gold"
                  >
                    + Add Team Member
                  </button>
                )}
              </div>
            )}

            {state.error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setStep(1)} className={backBtnCls}>
                ← Back
              </button>
              <button type="button" onClick={next} className={nextBtnCls}>
                Continue →
              </button>
            </div>
          </fieldset>
        )}

        {/* STEP 3 — Review */}
        {step === 3 && (
          <fieldset className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <legend className="sr-only">Review</legend>
            <h2 className="font-heading text-xl font-bold text-brand-deep-purple">
              Review Your Registration
            </h2>

            <ReviewSection title="Participant">
              <ReviewRow k="Name" v={participant.full_name} />
              <ReviewRow k="Roll Number" v={participant.roll_number} />
              <ReviewRow k="Email" v={participant.email} />
              <ReviewRow k="Mobile" v={participant.mobile} />
              <ReviewRow k="College" v={participant.college} />
              {participant.department && <ReviewRow k="Department" v={participant.department} />}
              {participant.year_of_study && <ReviewRow k="Year" v={participant.year_of_study} />}
              <ReviewRow k="Gender" v={participant.gender} />
            </ReviewSection>

            <ReviewSection title="Event">
              <ReviewRow k="Event" v={event.name} />
              <ReviewRow k="Date" v={dateLabel} />
              <ReviewRow k="Mode" v={isTeamEvent ? `Team (${members.length + 1} members)` : "Individual"} />
              {isTeamEvent && <ReviewRow k="Team Name" v={teamName} />}
            </ReviewSection>

            {isTeamEvent && members.length > 0 && (
              <ReviewSection title="Team Members">
                <ReviewRow k="Captain" v={`${participant.full_name} (${participant.roll_number})`} />
                {members.map((m, i) => (
                  <ReviewRow key={i} k={`Member ${i + 2}`} v={`${m.name} (${m.roll_number})`} />
                ))}
              </ReviewSection>
            )}

            {state.error && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {state.error}
              </p>
            )}

            <div className="flex flex-wrap justify-between gap-3">
              <button type="button" onClick={() => setStep(2)} className={backBtnCls}>
                ← Edit Details
              </button>
              <SubmitButton />
            </div>
          </fieldset>
        )}
      </form>
    </div>
  );
}

// ---------- success panel ----------
function SuccessPanel({
  registrationId,
  registrationNumber,
  eventName,
  awaitingVerification,
  verificationEmailSent,
}: {
  registrationId: string;
  registrationNumber: string;
  eventName: string;
  awaitingVerification: boolean;
  verificationEmailSent: boolean;
}) {
  const download = () => {
    const content = [
      "COLORIDO 2K26 — Registration Confirmation",
      "==========================================",
      "",
      `Registration ID: ${registrationNumber}`,
      `Event:           ${eventName}`,
      `Status:          ${awaitingVerification ? "Pending — verify your email" : "Confirmed"}`,
      `Fest Date:       28 December 2026`,
      "",
      "Keep this ID safe. You may be asked to show it at the venue.",
      "",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${registrationNumber}-confirmation.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
          awaitingVerification ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
        }`}
      >
        {awaitingVerification ? "✉" : "✓"}
      </div>
      <h2
        className={`font-heading text-2xl font-bold ${
          awaitingVerification ? "text-brand-deep-purple" : "text-emerald-700"
        }`}
      >
        {awaitingVerification ? "Almost done — check your inbox" : "Registration Successful!"}
      </h2>

      {awaitingVerification ? (
        <div className="mt-2 space-y-2 text-sm text-slate-600">
          <p>
            Your registration for <strong>{eventName}</strong> is <strong>saved
            but not yet confirmed</strong>.
          </p>
          <p
            role={verificationEmailSent ? "status" : "alert"}
            className={`rounded-lg border px-3.5 py-2.5 ${
              verificationEmailSent
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {verificationEmailSent
              ? "We've sent a verification link to your email. Open it within 48 hours to confirm your registration — then your confirmation email and entry pass follow automatically."
              : "We saved your registration, but the verification email couldn't be sent right now. Open your registration page below to request a fresh link, or contact the fest desk."}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">
          You are registered for <strong>{eventName}</strong>.
        </p>
      )}

      <div className="mx-auto mt-6 max-w-xs rounded-xl border-2 border-dashed border-brand-gold bg-brand-cream px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Unique Registration ID
        </p>
        <p className="font-heading text-2xl font-black tracking-wide text-brand-deep-purple">
          {registrationNumber}
        </p>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={download}
          className="rounded-full bg-gradient-to-r from-brand-gold via-brand-light-gold to-brand-gold px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-deep-purple"
        >
          Download Confirmation
        </button>
        <a
          href={`/registration/${registrationId}`}
          className="rounded-full border border-brand-burgundy/30 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-burgundy hover:bg-brand-cream"
        >
          View Registration
        </a>
        <a
          href="/events"
          className="rounded-full border border-slate-200 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50"
        >
          Back to Events
        </a>
      </div>
    </div>
  );
}

// ---------- small UI helpers ----------
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-brand-gold focus:outline-none";
const nextBtnCls =
  "rounded-full bg-brand-deep-purple px-7 py-2.5 text-xs font-semibold uppercase tracking-wider text-brand-gold transition hover:shadow-md";
const backBtnCls =
  "rounded-full border border-slate-200 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 hover:bg-slate-50";

function RField({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200">
      <p className="border-b border-slate-100 bg-brand-cream-dark/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <dl className="divide-y divide-slate-50 px-4">{children}</dl>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-700">{v || "—"}</dd>
    </div>
  );
}

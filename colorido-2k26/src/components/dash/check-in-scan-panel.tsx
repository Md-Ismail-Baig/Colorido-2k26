"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  checkInRegistration,
  type CheckInState,
} from "@/lib/check-in/actions";

/** Accepts a bare registration UUID or a pasted/scanned /check-in/<uuid> URL. */
function extractToken(raw: string): string {
  const value = raw.trim();
  const fromUrl = value.match(/check-in\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (fromUrl) return fromUrl[1].toLowerCase();
  const bare = value.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return bare ? bare[1].toLowerCase() : value;
}

interface HistoryEntry {
  token: string;
  ok: boolean;
  text: string;
}

export function CheckInScanPanel() {
  const [state, formAction, pending] = useActionState<CheckInState, FormData>(
    async (prev, formData) =>
      checkInRegistration(
        prev,
        extractToken(String(formData.get("token") ?? "")),
      ),
    {},
  );
  const [manual, setManual] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const tickRef = useRef<(() => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const lastTokenRef = useRef("");

  // Keep the history list in sync with action results, then resume the
  // camera loop (scanning pauses while a check-in action is in flight).
  useEffect(() => {
    if (!state.ok && !state.error) return;
    const text = state.message ?? state.error ?? "";
    setHistory((h) =>
      [
        { token: lastTokenRef.current.slice(0, 8), ok: Boolean(state.ok), text },
        ...h,
      ].slice(0, 8),
    );
    if (state.ok) {
      setManual("");
      beep();
    }
    if (streamRef.current) {
      scanningRef.current = true;
      requestAnimationFrame(() => void tickRef.current?.());
    }
  }, [state]);

  function beep() {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio is a nicety, never a requirement.
    }
  }

  async function stopCamera() {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  async function startCamera() {
    setCameraError(null);
    if (!("BarcodeDetector" in window)) {
      setCameraError(
        "This browser has no built-in barcode scanner. Use Chrome on Android, or type/paste the code below — every pass also shows its number in plain text.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOn(true);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();

      const detector = new (window as unknown as {
        BarcodeDetector: new (opts: {
          formats: string[];
        }) => {
          detect(src: CanvasImageSource): Promise<{ rawValue: string }[]>;
        };
      }).BarcodeDetector({ formats: ["qr_code"] });
      const canvas = document.createElement("canvas");
      scanningRef.current = true;

      const tick = async (): Promise<void> => {
        tickRef.current = tick;
        if (!scanningRef.current || !video.videoWidth) {
          if (scanningRef.current) requestAnimationFrame(() => void tick());
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        const codes = await detector.detect(canvas);
        const token = codes.length ? extractToken(codes[0].rawValue) : "";
        if (token && inputRef.current && formRef.current) {
          inputRef.current.value = token;
          lastTokenRef.current = token;
          formRef.current.requestSubmit();
          scanningRef.current = false; // paused; resumed by the state effect
          return;
        }
        if (scanningRef.current) requestAnimationFrame(() => void tick());
      };
      requestAnimationFrame(() => void tick());
    } catch {
      setCameraError("Camera unavailable — check permissions, or use manual entry below.");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setCameraOn(false);
    }
  }

  useEffect(() => () => void stopCamera(), []);

  return (
    <div className="space-y-6">
      {/* ---- Camera ---- */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-heading text-base font-bold text-brand-deep-purple">
          Scan a pass
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Point the camera at the QR code on a participant&apos;s pass.
        </p>
        <div className="mt-4">
          <video
            ref={videoRef}
            className={`mx-auto aspect-square w-full max-w-xs rounded-lg bg-slate-900 object-cover ${cameraOn ? "" : "hidden"}`}
            muted
            playsInline
          />
          {!cameraOn && (
            <button
              type="button"
              onClick={() => void startCamera()}
              className="mx-auto block rounded-full bg-brand-deep-purple px-6 py-3 text-xs font-semibold uppercase tracking-wider text-brand-gold"
            >
              Start camera
            </button>
          )}
          {cameraOn && (
            <button
              type="button"
              onClick={() => void stopCamera()}
              className="mx-auto mt-3 block rounded-full border border-slate-300 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600"
            >
              Stop camera
            </button>
          )}
        </div>
        {cameraError && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {cameraError}
          </p>
        )}
      </div>

      {/* ---- Manual entry (also the camera submit path) ---- */}
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => {
          lastTokenRef.current = inputRef.current?.value ?? "";
        }}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="font-heading text-base font-bold text-brand-deep-purple">
          Or enter the code
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Type the pass code (or paste a pass URL — Bluetooth/USB scanners act
          as keyboards and work here).
        </p>
        <input
          ref={inputRef}
          type="text"
          name="token"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="e.g. 3f2b8c1e-7a4d-4e9f-b2c6-8d1e0f2a3b4c"
          autoComplete="off"
          spellCheck={false}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm focus:border-brand-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || manual.trim().length === 0}
          className="mt-3 w-full rounded-full bg-brand-burgundy px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Checking in…" : "Check in"}
        </button>

        {state.ok && (
          <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            ✓ {state.message ?? "Checked in"}
          </p>
        )}
        {state.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </p>
        )}
      </form>

      {/* ---- Session history ---- */}
      {history.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-heading text-base font-bold text-brand-deep-purple">
            This device&apos;s recent check-ins
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={h.ok ? "text-emerald-600" : "text-red-500"}>
                  {h.ok ? "✓" : "✗"}
                </span>
                <span className="min-w-0 flex-1 text-slate-600">
                  <span className="font-mono text-xs text-slate-400">
                    {h.token}…
                  </span>{" "}
                  {h.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

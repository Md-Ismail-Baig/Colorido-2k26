"use client";

/**
 * GLOBAL ERROR BOUNDARY — last-resort catch when even the root layout throws.
 * Renders its own <html>/<body> by requirement. Never shows stack traces or
 * provider details to the user (dependency guide §27).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2d1b4e",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "24px",
            color: "white",
            maxWidth: 420,
          }}
        >
          <div style={{ fontSize: 40 }}>🎪</div>
          <h1 style={{ fontSize: 22, margin: "12px 0 8px", color: "#e6c36a" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.6 }}>
            We hit an unexpected problem. Please try again — the fest will be
            right here.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "10px 24px",
              borderRadius: 999,
              border: "none",
              background: "#e6c36a",
              color: "#2d1b4e",
              fontWeight: "bold",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

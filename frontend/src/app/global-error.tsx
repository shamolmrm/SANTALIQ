"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

/** Last-resort error page when the root layout itself fails (no app styles available). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", textAlign: "center", padding: "6rem 1rem", background: "#f7f9fc", color: "#071b2b" }}>
        <h1>Something went wrong.</h1>
        <p>SANTALIQ has been notified. Please try again.</p>
        <button onClick={reset} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 999, border: 0, background: "#071b2b", color: "#fff" }}>
          Try again
        </button>
      </body>
    </html>
  );
}

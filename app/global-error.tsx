"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>h.ai Setup Command Center hit an unexpected error</h1>
        <p style={{ color: "#666", marginTop: "0.5rem" }}>Your local data is untouched. Try reloading the app.</p>
        <button
          onClick={reset}
          style={{ marginTop: "1rem", padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}

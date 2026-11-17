"use client";

import { useState } from "react";

/** Copies the full URL for a site path (e.g. /apply/my-school) to the clipboard. */
export default function CopyButton({ path, label = "Copy link" }: { path: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

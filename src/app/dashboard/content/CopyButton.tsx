"use client";

import { useState } from "react";

export default function CopyButton({
  content,
}: {
  content: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
      title="Copy this content"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
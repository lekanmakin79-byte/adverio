"use client";

import { useState } from "react";

export default function CopyEnquiryLink({
  url,
}: {
  url: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy enquiry link error:", error);
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex items-center justify-center rounded-xl border border-emerald-300 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
    >
      {copied ? "✓ Link Copied" : "Copy Enquiry Link"}
    </button>
  );
}
"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 500);
    }

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (!visible) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Return to top"
      className="fixed bottom-5 right-5 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-lg font-semibold text-white shadow-md transition hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      ↑
    </button>
  );
}
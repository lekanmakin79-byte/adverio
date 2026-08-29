"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
const [visible, setVisible] = useState(false);

useEffect(() => {
function handleScroll() {
setVisible(window.scrollY > 400);
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

return ( <button
   type="button"
   onClick={scrollToTop}
   aria-label="Back to top"
   title="Back to top"
   className="fixed bottom-6 right-6 z-50 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg transition hover:-translate-y-1 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
 > <svg
     viewBox="0 0 24 24"
     className="h-5 w-5"
     fill="none"
     stroke="currentColor"
     strokeWidth="2"
     aria-hidden="true"
   > <path
       strokeLinecap="round"
       strokeLinejoin="round"
       d="M5 15l7-7 7 7"
     /> </svg> </button>
);
}

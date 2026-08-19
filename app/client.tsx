"use client";

import dynamic from "next/dynamic";

const LumberApp = dynamic(() => import("@/components/LumberApp"), {
  ssr: false,
  loading: () => (
    <main className="boot-screen" aria-live="polite">
      <div className="brand-mark">LI</div>
      <p>Opening Lumber Intelligence…</p>
    </main>
  ),
});

export default function ClientApp() {
  return <LumberApp />;
}

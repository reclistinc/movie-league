import { Suspense } from "react";
import { App } from "@/components/App";

export default function Page() {
  return (
    <Suspense fallback={<main className="p-6 text-zinc-500">Loading…</main>}>
      <App />
    </Suspense>
  );
}

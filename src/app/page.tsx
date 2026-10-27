import { Suspense } from "react";
import { connection } from "next/server";
import { getSnapshot } from "@/app/lib/data";
import { Dashboard } from "@/components/layout/Dashboard";

async function DashboardLoader() {
  await connection();
  const snapshot = getSnapshot();
  return <Dashboard snapshot={snapshot} />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="app-container" style={{ padding: "24px", fontSize: "14px" }}>
          Loading tank telemetry (GMT+7)…
        </div>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { DashboardOverview } from "@/features/dashboard/overview";

export default function DashboardPage() {
  useEffect(() => {
    document.title = "Dashboard | ClaimFlow";
  }, []);

  return <DashboardOverview />;
}

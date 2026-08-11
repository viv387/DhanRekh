"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Dashboard Error"
      description="We couldn't load your dashboard data. Your wallet and transactions are safe — please try again."
    />
  );
}

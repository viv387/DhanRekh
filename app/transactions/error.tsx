"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function TransactionsError({
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
      title="Transactions Error"
      description="We couldn't load your transaction history. No transactions were affected — please try again."
    />
  );
}

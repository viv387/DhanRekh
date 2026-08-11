"use client";

import ErrorFallback from "@/components/ErrorFallback";

export default function WalletError({
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
      title="Wallet Error"
      description="We couldn't load your wallet information. Your balance is safe — please try again."
    />
  );
}

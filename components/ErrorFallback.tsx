"use client";

/**
 * Reusable error boundary UI component matching DhanRekh theme.
 * Used by all page-level error.tsx files.
 */
export default function ErrorFallback({
  error,
  reset,
  title = "Something went wrong",
  description = "An unexpected error occurred. Your data is safe — please try again or contact support if the issue persists.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-rose-glow)]">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-rose)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-[var(--accent-rose)] mb-3">
          {title}
        </h2>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
          {description}
        </p>

        {/* Error digest for support */}
        {error.digest && (
          <p className="text-xs text-[var(--text-muted)] mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            type="button"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-emerald))",
              color: "var(--bg-primary)",
            }}
          >
            Try Again
          </button>
          <a
            href="/dashboard"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200"
            style={{
              borderColor: "var(--border-medium)",
              color: "var(--text-secondary)",
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

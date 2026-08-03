"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastContextType = {
  toast: (typeOrOpts: ToastType | { type?: ToastType; message?: string; title?: string; description?: string }, message?: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION = 4000;

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const colorMap: Record<ToastType, { bg: string; border: string; text: string; bar: string }> = {
  success: {
    bg: "rgba(52, 211, 153, 0.1)",
    border: "rgba(52, 211, 153, 0.25)",
    text: "#6ee7b7",
    bar: "#34d399",
  },
  error: {
    bg: "rgba(251, 113, 133, 0.1)",
    border: "rgba(251, 113, 133, 0.25)",
    text: "#fda4af",
    bar: "#fb7185",
  },
  info: {
    bg: "rgba(34, 211, 238, 0.1)",
    border: "rgba(34, 211, 238, 0.25)",
    text: "#67e8f9",
    bar: "#22d3ee",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((typeOrOpts: ToastType | { type?: ToastType; message?: string; title?: string; description?: string }, msg?: string) => {
    let type: ToastType;
    let message: string;

    if (typeof typeOrOpts === "object") {
      type = typeOrOpts.type ?? "info";
      message = typeOrOpts.message ?? typeOrOpts.description ?? typeOrOpts.title ?? "";
    } else {
      type = typeOrOpts;
      message = msg ?? "";
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast Container */}
      <div
        style={{
          position: "fixed",
          top: "1.25rem",
          right: "1.25rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          maxWidth: "400px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          const c = colorMap[t.type];
          return (
            <div
              key={t.id}
              className="animate-slide-in-right"
              style={{
                pointerEvents: "auto",
                background: c.bg,
                border: `1px solid ${c.border}`,
                borderRadius: "1rem",
                padding: "0.875rem 1rem",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: c.text,
                    lineHeight: 1,
                    flexShrink: 0,
                    marginTop: "2px",
                  }}
                >
                  {icons[t.type]}
                </span>
                <p style={{ fontSize: "0.8125rem", color: c.text, lineHeight: 1.4, flex: 1 }}>
                  {t.message}
                </p>
                <button
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: c.text,
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    opacity: 0.6,
                    flexShrink: 0,
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
              {/* Progress bar */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  height: "2px",
                  background: c.bar,
                  animation: `progressShrink ${TOAST_DURATION}ms linear forwards`,
                }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

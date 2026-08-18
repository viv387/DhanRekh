"use client";

import { useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/ui/Sidebar";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useNotificationStream } from "@/hooks/useNotificationStream";
import type { StreamNotification } from "@/hooks/useNotificationStream";

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleNotification = useCallback(
    (n: StreamNotification) => {
      toast("info", `${n.title}: ${n.message}`);
    },
    [toast],
  );

  const { unreadCount, clearUnread } = useNotificationStream({
    enabled: !!user,
    onNotification: handleNotification,
  });

  return (
    <div className="min-h-screen bg-[#050816]">
      <div className="bg-mesh" />
      <Sidebar unreadCount={unreadCount} onBellClick={clearUnread} />
      {/* Main content area offset for sidebar */}
      <main className="lg:pl-[240px] min-h-screen">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShellInner>{children}</AppShellInner>
    </ProtectedRoute>
  );
}

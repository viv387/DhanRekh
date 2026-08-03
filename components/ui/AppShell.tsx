"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/ui/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#050816]">
        <div className="bg-mesh" />
        <Sidebar />
        {/* Main content area offset for sidebar */}
        <main className="lg:pl-[240px] min-h-screen">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

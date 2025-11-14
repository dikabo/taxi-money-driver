import BottomNav from '@/components/layout/BottomNav';

/**
 * File: /app/(dashboard)/layout.tsx
 * Purpose: The layout for the protected driver dashboard.
 *
 * FIX: Removed 'h-screen' and 'overflow-hidden'.
 * Added 'max-w-md mx-auto' to center the main content.
 * Added padding 'pb-24' (for the nav) and 'pt-4 px-4'.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Main content area, now centered and scrollable */}
      <main className="max-w-md mx-auto pb-24 pt-4 px-4">
        {children}
      </main>

      {/* Fixed bottom navigation */}
      <BottomNav />
    </div>
  );
}
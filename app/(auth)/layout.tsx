import React from 'react';

/**
 * File: /app/(auth)/layout.tsx
 * Purpose: Layout for auth pages (signup, login).
 * Renders children in a centered container.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      {children}
    </div>
  );
}

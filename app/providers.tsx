"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // We can set default query options here
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Disable refetch on window focus
    },
  },
});

/**
 * This component wraps our entire application with all the
 * client-side providers it needs, like React Query.
 * We'll add Zustand providers here if needed later.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

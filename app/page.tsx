import { redirect } from 'next/navigation';

/**
 * File: /app/page.tsx
 * Purpose: The root page of the application.
 * This page simply redirects the user to the main dashboard.
 */
export default function RootPage() {
  redirect('/home');
}


'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Upload, User, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * File: /components/layout/BottomNav.tsx
 * Purpose: The fixed bottom navigation bar.
 *
 * FIX: Added 'max-w-md mx-auto left-0 right-0' to the
 * main div to center it on large screens, matching the layout.
 */
const navItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/receive', label: 'Receive', icon: CircleDollarSign },
  { href: '/withdraw', label: 'Withdraw', icon: Upload },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    // THIS IS THE FIX
    <div className="fixed bottom-0 z-50 w-full max-w-md mx-auto left-0 right-0 bg-slate-800 border-t border-slate-700">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1',
                isActive ? 'text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
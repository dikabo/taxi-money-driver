import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * File: /lib/utils/cn.ts
 * Purpose: A utility function to safely merge Tailwind classes.
 * This is a standard file required by shadcn/ui.
 */

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


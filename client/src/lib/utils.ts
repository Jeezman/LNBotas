import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: number | string, maxDecimals: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '0';
  
  // Use toFixed to limit decimal places, then parseFloat to remove trailing zeros, then add commas
  return parseFloat(num.toFixed(maxDecimals)).toLocaleString();
}

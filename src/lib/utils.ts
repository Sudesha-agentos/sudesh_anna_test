import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Truncate a string for UI display.
 *
 * - If maxLength <= 0, returns an empty string.
 * - If text length is less than or equal to maxLength, returns text unchanged.
 * - Otherwise, returns the first maxLength characters followed by an ellipsis ("...").
 *
 * Note: maxLength applies to the base text only; the ellipsis is appended in addition
 * and is not counted toward maxLength. This function operates on JavaScript string
 * code units and is not grapheme-cluster aware.
 */
export function truncateText(text: string, maxLength: number): string {
  if (maxLength <= 0) return ""
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

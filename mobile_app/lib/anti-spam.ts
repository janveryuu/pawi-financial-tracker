/**
 * Anti-spam and input validation utilities for Pawi Financial Tracker.
 *
 * Enforces:
 *  1. Anti-spam repetition rule: prevents >= 4 consecutive identical characters (e.g. 'aaaa', '1111', '----').
 *  2. Positive numerical bounds: enforces > 0 for financial inputs (allowances, goals, transfers) and disallows negatives.
 *  3. Standardized maximum lengths per field type.
 */

export const MAX_LENGTH = {
  NAME: 30,
  EMAIL: 60,
  PASSWORD: 64,
  GOAL_TITLE: 35,
  AMOUNT_DIGITS: 10,
  DESCRIPTION: 100,
  NOTE: 100,
} as const

/**
 * Checks if a string contains 4 or more consecutive identical characters.
 * Example: 'aaaa' -> true, '1111' -> true, '----' -> true, 'aaa' -> false.
 */
export function hasConsecutiveSpam(text: string | null | undefined): boolean {
  if (!text) return false
  return /(.)\1{3,}/.test(text)
}

/**
 * Sanitizes input by collapsing any >= 4 consecutive identical characters to at most 3,
 * and optionally truncates to maxLength.
 */
export function sanitizeSpam(text: string | null | undefined, maxLength?: number): string {
  if (!text) return ""
  let sanitized = text.replace(/(.)\1{3,}/g, "$1$1$1")
  if (maxLength && maxLength > 0 && sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }
  return sanitized
}

/**
 * Sanitizes a numeric/monetary text input:
 * - Strips any negative signs or invalid characters (allowing only digits and a single decimal point).
 * - Collapses consecutive repeating digits >= 4 to 3.
 * - Caps maximum digits before decimal point to maxDigits (default: 10).
 */
export function sanitizeNumericInput(text: string | null | undefined, maxDigits: number = MAX_LENGTH.AMOUNT_DIGITS): string {
  if (!text) return ""
  // Remove negative sign and invalid characters
  let cleaned = text.replace(/[^0-9.]/g, "")
  // Allow only the first decimal point
  const parts = cleaned.split(".")
  if (parts.length > 2) {
    cleaned = parts[0] + "." + parts.slice(1).join("")
  }
  // Collapse repeating digits >= 4
  cleaned = cleaned.replace(/(.)\1{3,}/g, "$1$1$1")

  // Limit integer digits
  const [intPart, decPart] = cleaned.split(".")
  const limitedInt = intPart ? intPart.slice(0, maxDigits) : ""
  if (decPart !== undefined) {
    return `${limitedInt}.${decPart.slice(0, 2)}`
  }
  return limitedInt
}

/**
 * Validates whether a financial amount is strictly positive (> 0) and not exceeding the limit.
 */
export function isValidPositiveAmount(
  value: string | number | null | undefined,
  maxAmount: number = 99999999.99
): boolean {
  if (value === null || value === undefined || value === "") return false
  if (typeof value === "string") {
    if (hasConsecutiveSpam(value)) return false
    const num = parseFloat(value.replace(/,/g, ""))
    return !isNaN(num) && num > 0 && num <= maxAmount
  }
  return !isNaN(value) && value > 0 && value <= maxAmount
}

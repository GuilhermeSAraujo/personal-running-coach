function digitsOnly(raw: string, maxLen: number): string {
  return raw.replace(/\D/g, "").slice(0, maxLen)
}

/**
 * Right-aligned duration mask.
 * 1–2 digits as-is; 3–4 → m:ss / mm:ss; 5 → h:mm:ss.
 * No left-padding — avoids caret jumps on controlled inputs.
 */
export function maskDurationRightAligned(
  raw: string,
  maxDigits: number = 5,
): string {
  const digits = digitsOnly(raw, maxDigits)
  if (!digits) return ""
  if (digits.length <= 2) return digits
  if (digits.length <= 4) {
    const seconds = digits.slice(-2)
    const minutes = digits.slice(0, -2)
    return `${minutes}:${seconds}`
  }
  const seconds = digits.slice(-2)
  const minutes = digits.slice(-4, -2)
  const hours = digits.slice(0, -4)
  return `${hours}:${minutes}:${seconds}`
}

/** 5K time: same progressive mm:ss mask, capped at 4 digits (under 1 hour). */
export function maskMmSs(raw: string): string {
  return maskDurationRightAligned(raw, 4)
}

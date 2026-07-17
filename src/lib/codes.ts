import { customAlphabet } from 'nanoid'

/**
 * Label codes: short, unguessable, unambiguous when read aloud or typed.
 * Excludes 0/o, 1/l/i to survive bad print quality and human retyping.
 * 31^10 ≈ 8×10^14 possibilities — collision-safe at household scale.
 */
const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
export const generateCode = customAlphabet(alphabet, 10)

/** Invite links are bearer credentials — use a longer code than labels. */
export const generateInviteCode = customAlphabet(alphabet, 16)

export const CODE_PATTERN = new RegExp(`^[${alphabet}]{6,14}$`)

/** The URL printed inside a label's QR/DataMatrix. */
export function codeUrl(code: string, origin?: string) {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/c/${code}`
}

/**
 * Extract a Hoard code from scanned content. Accepts a bare code or any URL
 * ending in /c/<code> (so labels printed against one host still scan on
 * another).
 */
export function parseScannedCode(raw: string): string | null {
  const text = raw.trim()
  if (CODE_PATTERN.test(text)) return text
  const match = text.match(/\/c\/([a-z0-9]+)(?:[/?#]|$)/i)
  if (match && CODE_PATTERN.test(match[1].toLowerCase())) return match[1].toLowerCase()
  return null
}

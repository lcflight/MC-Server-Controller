// Basic IPv4 validation (quad-dot format)
export const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/**
 * @param {string} s
 * @returns {boolean}
 */
export function isValidIPv4(s) {
  if (typeof s !== 'string') return false
  if (!IPV4_RE.test(s)) return false
  return s.split('.').every((n) => {
    const v = parseInt(n, 10)
    return v >= 0 && v <= 255
  })
}

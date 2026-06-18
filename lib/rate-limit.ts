const ipMap = new Map<string, { count: number; resetAt: number }>()

const LIMIT = 5
const WINDOW_MS = 60_000

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = ipMap.get(ip)

  if (!entry || now > entry.resetAt) {
    ipMap.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: LIMIT - 1 }
  }

  if (entry.count >= LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: LIMIT - entry.count }
}

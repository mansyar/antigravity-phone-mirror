import { env } from '../env'

export async function findAntigravityPort(): Promise<number | null> {
  const ports = env.CDP_PORTS.split(',').map(Number)

  for (const port of ports) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1000),
      })
      if (response.ok) {
        console.log(`[CDP] Found Antigravity on port ${port}`)
        return port
      }
    } catch {
      // Port not available, try next
    }
  }

  console.warn('[CDP] No Antigravity instance found on ports:', ports)
  return null
}

import CDP from 'chrome-remote-interface'
import { findAntigravityPort } from './port-scanner'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

class ConnectionManager {
  private client: CDP.Client | null = null
  private retryDelay = 1000
  private maxDelay = 30000
  private isConnecting = false
  private currentPort: number | null = null
  private lastSyncTime = 0

  async getClient(): Promise<CDP.Client> {
    if (this.client) return this.client
    return this.connect()
  }

  isConnected(): boolean {
    return this.client !== null
  }

  getCurrentPort(): number | null {
    return this.currentPort
  }

  getLastSyncTime(): number {
    return this.lastSyncTime
  }

  private async connect(): Promise<CDP.Client> {
    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise<CDP.Client>((resolve) => {
        const interval = setInterval(() => {
          if (this.client) {
            clearInterval(interval)
            resolve(this.client)
          }
        }, 100)

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(interval)
        }, 30000)
      })
    }

    this.isConnecting = true

    while (!this.client) {
      try {
        const port = await findAntigravityPort()
        if (!port) throw new Error('No Antigravity instance found')

        this.client = await CDP({ port })
        this.currentPort = port
        this.retryDelay = 1000 // Reset on success
        this.lastSyncTime = Date.now()

        console.log(`[CDP] Connected to Antigravity on port ${port}`)

        this.client.on('disconnect', () => {
          console.log('[CDP] Disconnected from Antigravity')
          this.client = null
          this.currentPort = null
          this.scheduleReconnect()
        })
      } catch (error) {
        console.error('[CDP] Connection failed:', error)
        await this.backoff()
      }
    }

    this.isConnecting = false
    return this.client
  }

  private scheduleReconnect(): void {
    setTimeout(() => {
      this.connect().catch(console.error)
    }, this.retryDelay)
  }

  private async backoff(): Promise<void> {
    console.log(`[CDP] Retrying in ${this.retryDelay}ms...`)
    await sleep(this.retryDelay)
    this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay)
  }
}

export const cdpManager = new ConnectionManager()

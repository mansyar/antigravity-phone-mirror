import { createFileRoute } from '@tanstack/react-router'
import { cdpManager } from '../../server/cdp/connection-manager'

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: () => {
        return Response.json({
          status: 'ok',
          timestamp: Date.now(),
          cdp: {
            connected: cdpManager.isConnected(),
            lastSync: cdpManager.getLastSyncTime(),
            port: cdpManager.getCurrentPort(),
          },
          uptime: process.uptime(),
        })
      },
    },
  },
})

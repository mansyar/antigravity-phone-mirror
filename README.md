# Antigravity Phone Mirror 📱

A Progressive Web App (PWA) companion for the **Antigravity** AI coding assistant. View your AI pair-programming sessions from your phone, receive push notifications, and interact on the go.

## Features

- **Real-time Chat Mirroring** — View your Antigravity conversation on any device
- **Push Notifications** — Get alerts when AI tasks complete or require attention
- **Quick Actions** — Approve, reject, or provide input from your phone
- **Offline Support** — PWA works without constant connectivity
- **Secure Local Network** — Runs on localhost, accessible via Tailscale

## Tech Stack

- **Frontend**: TanStack Start (React 19 + SSR), TypeScript, Tailwind CSS
- **Backend**: Vite, Nitro, SQLite (better-sqlite3)
- **CDP Integration**: chrome-remote-interface for Electron automation
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Antigravity desktop app running with `--remote-debugging-port=9000`

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required: AUTH_PIN (6 digits), JWT_SECRET (32+ chars)
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Commands

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm dev`        | Start development server |
| `pnpm build`      | Build for production     |
| `pnpm test`       | Run unit tests           |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint`       | Run ESLint               |
| `pnpm format`     | Format with Prettier     |

## Project Structure

```
src/
├── routes/           # TanStack Router file-based routes
│   ├── __root.tsx    # Root layout
│   ├── index.tsx     # Home page
│   └── api/          # API routes
│       └── health.ts # Health check endpoint
├── server/           # Server-side code
│   ├── env.ts        # Environment validation (Zod)
│   ├── cdp/          # CDP integration
│   │   ├── port-scanner.ts
│   │   └── connection-manager.ts
│   └── db/           # SQLite database
│       └── sqlite.ts
└── styles.css        # Tailwind + Antigravity theme
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3000/api/health
```

Returns:

```json
{
  "status": "ok",
  "timestamp": 1737158000000,
  "cdp": {
    "connected": false,
    "port": null,
    "lastSync": 0
  },
  "uptime": 123.456
}
```

## Environment Variables

| Variable     | Required | Description                                   |
| ------------ | -------- | --------------------------------------------- |
| `AUTH_PIN`   | Yes      | 6-digit PIN for authentication                |
| `JWT_SECRET` | Yes      | 32+ character secret for JWT tokens           |
| `PORT`       | No       | Server port (default: 3333)                   |
| `WS_PORT`    | No       | WebSocket port (default: 3334)                |
| `CDP_PORTS`  | No       | CDP scan ports (default: 9000,9001,9002,9003) |

## Documentation

- [Product Requirements (PRD)](./docs/PRD.md)
- [Technical Design (TDD)](./docs/TDD.md)
- [Development Roadmap](./docs/ROADMAP.md)

## Development Roadmap

- [x] **Phase 1**: Foundation — Project setup, CDP infrastructure, theming
- [ ] **Phase 2**: Core Loop — WebSocket, chat mirroring, syntax highlighting
- [ ] **Phase 3**: Interactions — Quick actions, PIN authentication
- [ ] **Phase 4**: Security & Polish — Tailscale, push notifications
- [ ] **Phase 5**: Testing & Launch — E2E tests, documentation

## License

MIT

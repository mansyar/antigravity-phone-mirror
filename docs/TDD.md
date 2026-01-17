# Technical Design Document (TDD)

**Project:** Antigravity Phone Mirror  
**Version:** 1.0  
**Date:** 2026-01-18

> **Related Documentation:**
>
> - [Product Requirements Document (PRD)](./PRD.md) - Product requirements, functional specifications, UX guidelines
> - [Development Roadmap](./ROADMAP.md) - Phases, task tracking, acceptance criteria

---

## 1. System Architecture

### 1.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TAILSCALE NETWORK                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐         HTTPS          ┌────────────────────────────────┐ │
│  │    Mobile    │◄──────────────────────►│         Desktop Machine        │ │
│  │     PWA      │                        │  ┌──────────────────────────┐  │ │
│  │              │         WSS            │  │   TanStack Start Server  │  │ │
│  │  - React 19  │◄──────────────────────►│  │   (localhost:3333)       │  │ │
│  │  - TanStack  │                        │  │                          │  │ │
│  │    Query     │                        │  │  ┌────────────────────┐  │  │ │
│  │  - Web Push  │                        │  │  │   WebSocket Server │  │  │ │
│  │              │                        │  │  │   (localhost:3334) │  │  │ │
│  └──────────────┘                        │  │  └─────────┬──────────┘  │  │ │
│                                          │  │            │             │  │ │
│                                          │  │  ┌─────────▼──────────┐  │  │ │
│                                          │  │  │   CDP Bridge       │  │  │ │
│                                          │  │  │   (Connection Mgr) │  │  │ │
│                                          │  │  └─────────┬──────────┘  │  │ │
│                                          │  └────────────┼─────────────┘  │ │
│                                          │               │ CDP            │ │
│                                          │  ┌────────────▼─────────────┐  │ │
│                                          │  │      Antigravity         │  │ │
│                                          │  │   (VS Code Fork)         │  │ │
│                                          │  │   Port: 9000-9003        │  │ │
│                                          │  └──────────────────────────┘  │ │
│                                          └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Component Summary

| Component        | Port                | Technology              | Purpose                                |
| ---------------- | ------------------- | ----------------------- | -------------------------------------- |
| TanStack Start   | 3333 (configurable) | React 19, SSR, Vinxi    | Main web server, API routes            |
| WebSocket Server | 3334 (configurable) | ws/native               | Real-time bi-directional communication |
| CDP Bridge       | N/A                 | chrome-remote-interface | Desktop app communication              |
| SQLite           | N/A                 | better-sqlite3          | Push notification subscriptions        |
| Antigravity      | 9000-9003           | Electron (VS Code fork) | Target application                     |

---

## 2. Project Structure

```
antigravity-phone-mirror/
├── app/
│   ├── routes/
│   │   ├── __root.tsx           # Root layout with providers
│   │   ├── index.tsx            # Main chat interface
│   │   ├── login.tsx            # PIN authentication page
│   │   └── api/
│   │       ├── health.ts        # Health check endpoint
│   │       ├── auth.ts          # Login/logout handlers
│   │       ├── conversations.ts # Conversation list
│   │       └── push.ts          # Push subscription management
│   ├── components/
│   │   ├── ChatMessage.tsx      # Individual message renderer
│   │   ├── ChatList.tsx         # Scrollable message list
│   │   ├── InputBar.tsx         # Text input + voice + send
│   │   ├── StopButton.tsx       # Stop generation FAB
│   │   ├── ConversationDrawer.tsx # Slide-out drawer
│   │   ├── ConnectionStatus.tsx # Status indicator
│   │   ├── SkeletonLoader.tsx   # Loading placeholder
│   │   └── ThinkingBlock.tsx    # Collapsible thinking section
│   ├── lib/
│   │   ├── ws-client.ts         # WebSocket client manager
│   │   ├── markdown.ts          # Markdown + syntax highlighting
│   │   ├── haptics.ts           # Vibration API wrapper
│   │   ├── speech.ts            # Web Speech API wrapper
│   │   └── pwa.ts               # Install prompt logic
│   └── styles/
│       └── globals.css          # Tailwind + Antigravity theme
├── server/
│   ├── index.ts                 # Server entry point
│   ├── ws-server.ts             # WebSocket server
│   ├── cdp/
│   │   ├── connection-manager.ts # CDP singleton with reconnect
│   │   ├── port-scanner.ts      # Scan 9000-9003
│   │   ├── chat-parser.ts       # DOM → Message extraction
│   │   └── actions.ts           # Send message, stop generation
│   ├── auth/
│   │   ├── pin.ts               # PIN validation + lockout
│   │   ├── session.ts           # Cookie + token management
│   │   └── middleware.ts        # Auth middleware
│   ├── push/
│   │   ├── vapid.ts             # VAPID key management
│   │   ├── subscriptions.ts     # SQLite subscription store
│   │   └── notify.ts            # Send push notifications
│   └── db/
│       └── sqlite.ts            # SQLite connection
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Service worker
│   └── icons/                   # App icons (192, 512)
├── data/                        # SQLite DB (gitignored)
├── .env.example                 # Environment template
├── app.config.ts                # TanStack Start config
├── tailwind.config.ts           # Tailwind configuration
└── package.json
```

---

## 3. CDP Integration

### 3.1 Port Scanning Strategy

```typescript
// server/cdp/port-scanner.ts
const CDP_PORTS = [9000, 9001, 9002, 9003];

async function findAntigravityPort(): Promise<number | null> {
  for (const port of CDP_PORTS) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) {
        return port; // Return first (lowest) responding port
      }
    } catch {
      continue;
    }
  }
  return null;
}
```

### 3.2 Connection Manager

```typescript
// server/cdp/connection-manager.ts
class ConnectionManager {
  private client: CDP.Client | null = null;
  private retryDelay = 1000;
  private maxDelay = 30000;
  private isConnecting = false;

  async getClient(): Promise<CDP.Client> {
    if (this.client) return this.client;
    return this.connect();
  }

  private async connect(): Promise<CDP.Client> {
    if (this.isConnecting) {
      // Wait for existing connection attempt
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (this.client) {
            clearInterval(interval);
            resolve(this.client);
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    while (!this.client) {
      try {
        const port = await findAntigravityPort();
        if (!port) throw new Error("No Antigravity instance found");

        this.client = await CDP({ port });
        this.retryDelay = 1000; // Reset on success

        this.client.on("disconnect", () => {
          this.client = null;
          this.scheduleReconnect();
        });
      } catch (error) {
        await this.backoff();
      }
    }

    this.isConnecting = false;
    return this.client;
  }

  private async backoff(): Promise<void> {
    await sleep(this.retryDelay);
    this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
  }
}

export const cdpManager = new ConnectionManager();
```

### 3.3 Chat Parser (Hybrid Approach)

```typescript
// server/cdp/chat-parser.ts
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  htmlContent?: string; // Fallback raw HTML
  thinking?: string;
  images?: string[];
  timestamp: number;
}

async function parseChat(client: CDP.Client): Promise<ChatMessage[]> {
  const { Runtime } = client;

  try {
    // Attempt structured parsing via JS injection
    const result = await Runtime.evaluate({
      expression: `
        (function() {
          const messages = [];
          // DOM parsing logic - structure TBD based on inspection
          document.querySelectorAll('[data-message-id]').forEach(el => {
            messages.push({
              id: el.dataset.messageId,
              role: el.dataset.role,
              content: el.textContent,
              // ... extract more fields
            });
          });
          return JSON.stringify(messages);
        })()
      `,
      returnByValue: true,
    });

    return JSON.parse(result.result.value);
  } catch (error) {
    // Fallback: return raw HTML
    const { DOM } = client;
    const doc = await DOM.getDocument();
    const chatContainer = await DOM.querySelector({
      nodeId: doc.root.nodeId,
      selector: ".chat-container", // TBD selector
    });

    if (chatContainer.nodeId) {
      const html = await DOM.getOuterHTML({ nodeId: chatContainer.nodeId });
      return [
        {
          id: "fallback",
          role: "assistant",
          content: "",
          htmlContent: html.outerHTML,
          timestamp: Date.now(),
        },
      ];
    }

    return [];
  }
}
```

### 3.4 Actions

```typescript
// server/cdp/actions.ts
async function sendMessage(client: CDP.Client, text: string): Promise<boolean> {
  const { Runtime } = client;

  const result = await Runtime.evaluate({
    expression: `
      (function() {
        const input = document.querySelector('textarea[data-chat-input]');
        if (!input) return false;
        
        // Set value and dispatch events
        input.value = ${JSON.stringify(text)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Find and click send button
        const sendBtn = document.querySelector('button[data-send-message]');
        if (sendBtn) {
          sendBtn.click();
          return true;
        }
        return false;
      })()
    `,
    returnByValue: true,
  });

  return result.result.value === true;
}

async function stopGeneration(client: CDP.Client): Promise<boolean> {
  const { Runtime } = client;

  const result = await Runtime.evaluate({
    expression: `
      (function() {
        const stopBtn = document.querySelector('button[data-stop-generation]');
        if (stopBtn && !stopBtn.disabled) {
          stopBtn.click();
          return true;
        }
        return false;
      })()
    `,
    returnByValue: true,
  });

  return result.result.value === true;
}
```

---

## 4. Authentication System

### 4.1 PIN Validation with Progressive Lockout

```typescript
// server/auth/pin.ts
import { z } from "zod";

const PIN_SCHEMA = z
  .string()
  .length(6)
  .regex(/^\d{6}$/);

interface LockoutState {
  attempts: number;
  lockedUntil: number | null;
}

const lockoutStore = new Map<string, LockoutState>();

const LOCKOUT_THRESHOLDS = [
  { attempts: 3, duration: 30_000 }, // 30 seconds
  { attempts: 5, duration: 300_000 }, // 5 minutes
  { attempts: 10, duration: 1_800_000 }, // 30 minutes
];

function getLockoutDuration(attempts: number): number {
  for (const threshold of [...LOCKOUT_THRESHOLDS].reverse()) {
    if (attempts >= threshold.attempts) {
      return threshold.duration;
    }
  }
  return 0;
}

export function validatePin(
  clientId: string,
  pin: string,
): {
  valid: boolean;
  lockedFor?: number;
  error?: string;
} {
  const state = lockoutStore.get(clientId) || {
    attempts: 0,
    lockedUntil: null,
  };

  // Check if locked
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    return {
      valid: false,
      lockedFor: state.lockedUntil - Date.now(),
      error: "Too many attempts. Try again later.",
    };
  }

  // Validate PIN format
  const parsed = PIN_SCHEMA.safeParse(pin);
  if (!parsed.success) {
    return { valid: false, error: "Invalid PIN format" };
  }

  // Check PIN
  if (pin !== process.env.AUTH_PIN) {
    state.attempts++;
    const lockDuration = getLockoutDuration(state.attempts);
    if (lockDuration > 0) {
      state.lockedUntil = Date.now() + lockDuration;
    }
    lockoutStore.set(clientId, state);
    return { valid: false, error: "Incorrect PIN" };
  }

  // Success - reset state
  lockoutStore.delete(clientId);
  return { valid: true };
}
```

### 4.2 Session Management

```typescript
// server/auth/session.ts
import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE_NAME = "antigravity_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export async function createSession(): Promise<string> {
  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function verifySession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

// For WebSocket authentication
export async function createWsToken(
  sessionToken: string,
): Promise<string | null> {
  if (!(await verifySession(sessionToken))) return null;

  const wsToken = await new SignJWT({ type: "websocket" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m") // Short-lived for WS handshake
    .sign(JWT_SECRET);

  return wsToken;
}
```

---

## 5. WebSocket Protocol

### 5.1 Server Implementation

```typescript
// server/ws-server.ts
import { WebSocketServer, WebSocket } from "ws";
import { verifySession } from "./auth/session";
import { cdpManager } from "./cdp/connection-manager";

interface WsClient {
  socket: WebSocket;
  sessionId: string;
  lastPing: number;
}

const clients = new Map<string, WsClient>();

export function createWsServer(port = 3001) {
  const wss = new WebSocketServer({ port });

  wss.on("connection", async (socket, req) => {
    // Extract token from cookie
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies.antigravity_session;

    if (!token || !(await verifySession(token))) {
      socket.close(4001, "Unauthorized");
      return;
    }

    const clientId = generateId();
    clients.set(clientId, { socket, sessionId: token, lastPing: Date.now() });

    socket.on("message", (data) => handleMessage(clientId, data));
    socket.on("close", () => clients.delete(clientId));
    socket.on("pong", () => {
      const client = clients.get(clientId);
      if (client) client.lastPing = Date.now();
    });

    // Send initial state
    await sendChatState(clientId);
  });

  // Ping clients every 30s
  setInterval(() => {
    clients.forEach((client, id) => {
      if (Date.now() - client.lastPing > 60000) {
        client.socket.terminate();
        clients.delete(id);
      } else {
        client.socket.ping();
      }
    });
  }, 30000);

  return wss;
}
```

### 5.2 Message Protocol

```typescript
// Shared types (app/lib/ws-types.ts)
type ServerMessage =
  | { type: "chat:update"; messages: ChatMessage[]; conversationId: string }
  | { type: "chat:delta"; delta: MessageDelta }
  | { type: "connection:status"; cdpConnected: boolean; lastSync: number }
  | { type: "conversations:list"; conversations: ConversationMeta[] }
  | { type: "action:ack"; actionId: string; success: boolean; error?: string }
  | { type: "error"; code: string; message: string };

type ClientMessage =
  | { type: "chat:send"; text: string; actionId: string }
  | { type: "chat:stop"; actionId: string }
  | { type: "conversation:switch"; conversationId: string }
  | { type: "ping" };
```

### 5.3 Client Reconnection

```typescript
// app/lib/ws-client.ts
class WsClient {
  private socket: WebSocket | null = null;
  private retryDelay = 1000;
  private maxDelay = 30000;
  private listeners = new Map<string, Set<Function>>();

  connect() {
    const wsUrl = `wss://${location.host.replace(":3333", ":3334")}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.retryDelay = 1000;
      this.emit("connected");
    };

    this.socket.onclose = () => {
      this.emit("disconnected");
      this.scheduleReconnect();
    };

    this.socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.emit(msg.type, msg);
    };
  }

  private scheduleReconnect() {
    setTimeout(() => {
      this.connect();
      this.retryDelay = Math.min(this.retryDelay * 2, this.maxDelay);
    }, this.retryDelay);
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }
}

export const wsClient = new WsClient();
```

---

## 6. Push Notifications

### 6.1 VAPID Key Management

```typescript
// server/push/vapid.ts
import webpush from "web-push";
import { db } from "../db/sqlite";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

function getOrCreateVapidKeys(): VapidKeys {
  const existing = db.prepare("SELECT * FROM vapid_keys LIMIT 1").get();

  if (existing) {
    return { publicKey: existing.public_key, privateKey: existing.private_key };
  }

  const keys = webpush.generateVAPIDKeys();
  db.prepare(
    "INSERT INTO vapid_keys (public_key, private_key) VALUES (?, ?)",
  ).run(keys.publicKey, keys.privateKey);

  return keys;
}

export function initWebPush() {
  const keys = getOrCreateVapidKeys();
  webpush.setVapidDetails(
    "mailto:" + process.env.VAPID_EMAIL,
    keys.publicKey,
    keys.privateKey,
  );
  return keys.publicKey;
}
```

### 6.2 SQLite Schema

```sql
-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS vapid_keys (
  id INTEGER PRIMARY KEY,
  public_key TEXT NOT NULL,
  private_key TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 7. Environment Configuration

### 7.1 Environment Variables

```bash
# .env.example

# Server Ports
PORT=3333                          # Main server port (default: 3333)
WS_PORT=3334                       # WebSocket server port (default: 3334)

# Authentication
AUTH_PIN=123456                    # 6-digit PIN (CHANGE IN PRODUCTION)
JWT_SECRET=your-secret-key-min-32  # Minimum 32 characters

# Push Notifications
VAPID_EMAIL=your@email.com

# Development
NODE_ENV=development               # development | production
LOG_LEVEL=info                     # debug | info | warn | error

# CDP (optional override)
CDP_PORTS=9000,9001,9002,9003      # Comma-separated port list
```

### 7.2 Zod Validation

```typescript
// server/env.ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  WS_PORT: z.coerce.number().default(3334),
  AUTH_PIN: z
    .string()
    .length(6)
    .regex(/^\d{6}$/, "PIN must be 6 digits"),
  JWT_SECRET: z.string().min(32, "JWT secret must be at least 32 characters"),
  VAPID_EMAIL: z.string().email(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CDP_PORTS: z.string().default("9000,9001,9002,9003"),
});

export const env = envSchema.parse(process.env);
```

---

## 8. Tailscale Configuration

### 8.1 Installation (Windows)

1. Download and install Tailscale from https://tailscale.com/download
2. Sign in with your account
3. Verify connection: `tailscale status`

### 8.2 Serve Configuration

```powershell
# Expose port 3333 (main server) via HTTPS
tailscale serve https / http://127.0.0.1:3333

# Expose port 3334 (WebSocket) via HTTPS
tailscale serve https+insecure://ws.localhost / http://127.0.0.1:3334

# Verify configuration
tailscale serve status
```

### 8.3 Accessing from Mobile

1. Install Tailscale on your mobile device
2. Sign in with the same account
3. Access via: `https://<machine-name>.<tailnet>.ts.net`

---

## 9. Development vs Production

| Aspect          | Development           | Production            |
| --------------- | --------------------- | --------------------- |
| **HTTPS**       | HTTP (localhost)      | HTTPS (Tailscale)     |
| **Logging**     | Verbose (debug level) | Standard (info level) |
| **Hot Reload**  | Enabled               | Disabled              |
| **Source Maps** | Enabled               | Disabled              |
| **Auth Bypass** | Optional env flag     | Never                 |
| **CORS**        | Relaxed               | Strict (same-origin)  |

### 9.1 Development Mode Flag

```typescript
// server/middleware.ts
const isDev = process.env.NODE_ENV === "development";

// In auth middleware
if (isDev && process.env.SKIP_AUTH === "true") {
  console.warn("⚠️ AUTH BYPASSED - Development mode only");
  return next();
}
```

---

## 10. Health Check

```typescript
// app/routes/api/health.ts
import { cdpManager } from "~/server/cdp/connection-manager";

export async function GET() {
  const cdpConnected = cdpManager.isConnected();
  const lastSync = cdpManager.getLastSyncTime();

  return Response.json({
    status: "ok",
    timestamp: Date.now(),
    cdp: {
      connected: cdpConnected,
      lastSync,
      port: cdpManager.getCurrentPort(),
    },
    uptime: process.uptime(),
  });
}
```

---

## 11. Rate Limiting

```typescript
// server/rate-limit.ts
const actionTimestamps = new Map<string, number>();

const DEBOUNCE = {
  send: 500, // 500ms between messages
  stop: 1000, // 1s cooldown on stop
};

export function canPerformAction(
  clientId: string,
  action: keyof typeof DEBOUNCE,
): boolean {
  const key = `${clientId}:${action}`;
  const lastAction = actionTimestamps.get(key) || 0;
  const now = Date.now();

  if (now - lastAction < DEBOUNCE[action]) {
    return false;
  }

  actionTimestamps.set(key, now);
  return true;
}
```

---

## 12. Error Handling

```typescript
// server/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
  ) {
    super(message);
  }
}

export const Errors = {
  CDP_DISCONNECTED: new AppError(
    "Desktop app not connected",
    "CDP_DISCONNECTED",
    503,
    true,
  ),
  AUTH_FAILED: new AppError("Authentication failed", "AUTH_FAILED", 401, false),
  RATE_LIMITED: new AppError("Too many requests", "RATE_LIMITED", 429, true),
};
```

---

## 13. Launching Antigravity with CDP

Start Antigravity with the remote debugging port enabled:

```powershell
# Windows
& "C:\Path\To\Antigravity.exe" --remote-debugging-port=9000

# Or create a shortcut with the flag
```

> [!NOTE]
> The exact path to Antigravity.exe and any additional required flags will need to be determined during implementation. The application may already expose CDP on a default port.

---

## Appendix: Decision Reference

| #   | Decision          | Value                              |
| --- | ----------------- | ---------------------------------- |
| 28  | CDP Ports         | Scan 9000-9003 (prefer lowest)     |
| 29  | Window Type       | VS Code fork (investigate via CDP) |
| 30  | Conversation ID   | Investigate via CDP                |
| 31  | Deployment        | Same machine + Tailscale           |
| 32  | Env Management    | .env + Zod validation              |
| 33  | Push Backend      | Self-hosted + SQLite               |
| 34  | Tailscale Guide   | Full instructions included         |
| 35  | Existing Code     | Fresh start                        |
| 36  | Port Priority     | Use lowest responding port         |
| 37  | SQLite Location   | User data directory                |
| 38  | Sidebar Targeting | Right sidebar (TBD selectors)      |
| 39  | Parse Fallback    | Raw HTML fallback                  |
| 40  | WS Auth           | Cookie + short-lived token         |
| 41  | WS Server         | Separate port (3001)               |
| 42  | Dev/Prod Config   | Both with clear separation         |
| 43  | Window Type       | Investigate via CDP                |
| 44  | CDP Launch        | --remote-debugging-port flag       |
| 45  | CDP Actions       | Hybrid DOM/JS                      |
| 46  | Error Recovery    | User notification + retry          |
| 47  | Rate Limiting     | Debounce 500ms/1s                  |
| 48  | Health Check      | Basic /health endpoint             |

---

## Appendix B: Glossary

| Term          | Definition                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------- |
| **CDP**       | Chrome DevTools Protocol - A debugging protocol for Chromium-based browsers and Electron apps |
| **PWA**       | Progressive Web App - Web application with native app-like features (offline, installable)    |
| **VAPID**     | Voluntary Application Server Identification - Authentication scheme for Web Push              |
| **WebSocket** | Full-duplex communication protocol over a single TCP connection                               |
| **SSE**       | Server-Sent Events - One-way server-to-client streaming protocol                              |
| **JWT**       | JSON Web Token - Compact, URL-safe token for claims between parties                           |
| **SSR**       | Server-Side Rendering - Rendering web pages on the server before sending to client            |
| **Tailscale** | Zero-config VPN service using WireGuard protocol                                              |
| **MagicDNS**  | Tailscale feature providing automatic DNS names for devices                                   |
| **Electron**  | Framework for building cross-platform desktop apps with web technologies                      |
| **WCAG**      | Web Content Accessibility Guidelines - Accessibility standards                                |
| **Zod**       | TypeScript-first schema validation library                                                    |
| **Shiki**     | Syntax highlighter using VS Code's TextMate grammars                                          |

---

## Appendix C: Dependencies

### Production Dependencies

| Package                   | Version | Purpose                      |
| ------------------------- | ------- | ---------------------------- |
| `@tanstack/start`         | ^1.x    | Full-stack React framework   |
| `@tanstack/react-query`   | ^5.x    | Data fetching and caching    |
| `@tanstack/react-router`  | ^1.x    | Type-safe routing            |
| `react`                   | ^19.x   | UI library                   |
| `react-dom`               | ^19.x   | React DOM renderer           |
| `chrome-remote-interface` | ^0.33.x | CDP client library           |
| `ws`                      | ^8.x    | WebSocket server             |
| `jose`                    | ^5.x    | JWT signing and verification |
| `zod`                     | ^3.x    | Schema validation            |
| `web-push`                | ^3.x    | Push notification server     |
| `better-sqlite3`          | ^11.x   | SQLite database driver       |
| `shiki`                   | ^1.x    | Syntax highlighting          |
| `marked`                  | ^15.x   | Markdown parsing             |

### Development Dependencies

| Package                  | Version | Purpose                 |
| ------------------------ | ------- | ----------------------- |
| `typescript`             | ^5.x    | Type checking           |
| `tailwindcss`            | ^3.x    | Utility-first CSS       |
| `postcss`                | ^8.x    | CSS processing          |
| `autoprefixer`           | ^10.x   | CSS vendor prefixes     |
| `vitest`                 | ^2.x    | Unit testing            |
| `@testing-library/react` | ^16.x   | React component testing |
| `eslint`                 | ^9.x    | Code linting            |
| `prettier`               | ^3.x    | Code formatting         |

### Installation Command

```bash
# Production dependencies
pnpm add @tanstack/start @tanstack/react-query react react-dom \
  chrome-remote-interface ws jose zod web-push better-sqlite3 shiki marked

# Development dependencies
pnpm add -D typescript tailwindcss postcss autoprefixer \
  vitest @testing-library/react eslint prettier
```

---

## Changelog

| Version | Date       | Changes                                                                                                                                                                                    |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | 2026-01-18 | Initial TDD with complete architecture, CDP integration, auth system, WebSocket protocol, push notifications, Tailscale setup, and all implementation details from 48 clarifying decisions |

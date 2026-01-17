# Product Requirements Document (PRD)

**Project Name:** Antigravity Phone Mirror  
**Version:** 2.0  
**Status:** Ready for Development  
**Date:** 2026-01-18

> **Related Documentation:**
>
> - [Technical Design Document (TDD)](./TDD.md) - Implementation details, code architecture, API specifications
> - [Development Roadmap](./ROADMAP.md) - Phases, task tracking, acceptance criteria

## 1. Executive Summary

The "Antigravity Phone Mirror" is a high-performance **Progressive Web App (PWA)** companion for the "Antigravity" AI coding assistant. It serves as a secure, real-time bridge between a mobile device and the desktop application, allowing the user to monitor chat output, stop generation, switch conversations, and interact with the AI while away from the keyboard.

## 2. Problem Statement

- **Security Risk:** The previous iteration lacked authentication and relied on network obscurity, posing a risk on shared Wi-Fi.
- **Fragility:** The connection to the Chrome DevTools Protocol (CDP) was brittle, requiring manual restarts if the desktop app closed.
- **Maintenance:** The codebase was a monolithic file lacking type safety, making feature extension difficult.

## 3. Goals & Objectives

- **Modernize Stack:** Use TanStack Start (React + Server Functions) for a unified, type-safe codebase.
- **Harden Security:** Implement mandatory 6-digit PIN authentication with progressive lockout and strictly limit network exposure using Tailscale.
- **Enhance UX:** Create a "Antigravity" themed, mobile-first PWA with real-time WebSocket updates and installability.

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer                   | Technology                                     |
| ----------------------- | ---------------------------------------------- |
| **Framework**           | TanStack Start (React 19, SSR)                 |
| **Language**            | TypeScript (Strict Mode)                       |
| **Styling**             | Tailwind CSS (Dark Mode / Antigravity Theme)   |
| **State Management**    | TanStack Query v5                              |
| **Real-Time**           | WebSocket (bi-directional)                     |
| **Backend Interface**   | `chrome-remote-interface` (CDP)                |
| **Validation**          | Zod schemas for all inputs                     |
| **Network Transport**   | Tailscale Serve (Private VPN + MagicDNS HTTPS) |
| **Push Notifications**  | Web Push API                                   |
| **Syntax Highlighting** | Shiki or Prism (lightweight language set)      |
| **Voice Input**         | Web Speech API                                 |

### 4.2 High-Level Data Flow

```
┌─────────────┐    WebSocket     ┌─────────────┐      CDP       ┌─────────────┐
│   Mobile    │◄───────────────►│   Server    │◄──────────────►│  Desktop    │
│   PWA       │   (Real-time)   │  (Node.js)  │   (Port 9000)  │  Antigravity│
└─────────────┘                 └─────────────┘                └─────────────┘
      │                               │
      │ Web Push API                  │ Persistent Socket
      │ (notifications)               │ (auto-reconnect)
      ▼                               ▼
```

1. **Mobile Client:** Establishes WebSocket connection for real-time updates.
2. **Server Function:** Authenticates requests via HTTP-only cookie (7-day validity).
3. **CDP Bridge:** Maintains persistent socket to local Antigravity (Port 9000) with exponential backoff reconnection.
4. **Desktop App:** Executes commands or returns DOM state.

### 4.3 WebSocket Reconnection Strategy

- **Pattern:** Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s cap)
- **Retries:** Infinite (with visual indicator)
- **Behavior:** Continue retrying silently; update UI with connection status

---

## 5. Functional Requirements

### 5.1 Authentication & Security (P0)

| ID          | Requirement                                                                            |
| ----------- | -------------------------------------------------------------------------------------- |
| REQ-AUTH-01 | Protect all routes behind a **6-digit numeric PIN** defined in `AUTH_PIN` env variable |
| REQ-AUTH-02 | Successful login issues secure, HTTP-only cookie valid for **7 days**                  |
| REQ-AUTH-03 | Middleware verifies cookie before executing any CDP command                            |
| REQ-AUTH-04 | **Progressive lockout:** 3 fails → 30s, 5 fails → 5min, 10 fails → 30min               |
| REQ-NET-01  | Server binds strictly to `127.0.0.1`, relying on Tailscale for external access         |

### 5.2 Chat Monitoring (P0)

| ID          | Requirement                                                                            |
| ----------- | -------------------------------------------------------------------------------------- |
| REQ-CHAT-01 | Mirror desktop chat history via WebSocket push; no polling                             |
| REQ-CHAT-02 | "Thinking" blocks: **collapsed by default**, latest block auto-expanded                |
| REQ-CHAT-03 | Code blocks: syntax highlighting via Shiki/Prism (JS, TS, Python, Rust, Go, HTML, CSS) |
| REQ-CHAT-04 | **Basic markdown:** headers, bold, italic, lists, links, code blocks                   |
| REQ-CHAT-05 | Auto-scroll to bottom on new content unless user is scrolling up                       |
| REQ-CHAT-06 | Display images inline (read-only); no upload from mobile                               |

### 5.3 Conversation Management (P1)

| ID          | Requirement                                                         |
| ----------- | ------------------------------------------------------------------- |
| REQ-CONV-01 | **Slide-out drawer** (left swipe) reveals conversation list         |
| REQ-CONV-02 | Each conversation shows: title + truncated last message + timestamp |
| REQ-CONV-03 | Tap to switch active conversation; WebSocket updates accordingly    |

### 5.4 Interaction & Control (P1)

| ID          | Requirement                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| REQ-CTRL-01 | Persistent input bar with **soft limit 5,000 chars** (warning at 4,000)        |
| REQ-CTRL-02 | High-visibility **STOP GENERATION** button — immediate action, no confirmation |
| REQ-CTRL-03 | Message send: wait for WebSocket ACK before appending to chat                  |
| REQ-CTRL-04 | **Voice input:** tap-to-toggle microphone; auto-stop on silence                |
| REQ-CTRL-05 | **Subtle haptic feedback** on button presses and successful sends              |

### 5.5 Robustness & Connectivity (P1)

| ID         | Requirement                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| REQ-CDP-01 | Backend implements a "Connection Manager" singleton                         |
| REQ-CDP-02 | CDP connection loss: silent retry with exponential backoff; no crash        |
| REQ-UI-01  | Display connection state + last successful sync time + brief error messages |
| REQ-UI-02  | **Skeleton UI** during initial load (animated chat bubble placeholders)     |

### 5.6 Push Notifications (P2)

| ID          | Requirement                                                     |
| ----------- | --------------------------------------------------------------- |
| REQ-PUSH-01 | Implement Web Push API for "AI response complete" notifications |
| REQ-PUSH-02 | User can enable/disable notifications in settings               |

---

## 6. UI/UX Specifications

### 6.1 Progressive Web App

| Feature               | Implementation                                               |
| --------------------- | ------------------------------------------------------------ |
| **Installability**    | Web App Manifest with icons, theme color, standalone display |
| **Install Prompt**    | Deferred banner after 2-3 successful uses                    |
| **Offline Indicator** | Show "Offline" badge when network unavailable                |

### 6.2 Theme: "Antigravity" (Dark Only)

| Element                | Value                           |
| ---------------------- | ------------------------------- |
| **Background**         | VS Code Dark Grey (`#1f1f1f`)   |
| **Header Typography**  | Sans-Serif (Inter/System)       |
| **Content Typography** | Monospace (code/logs aesthetic) |
| **Accent Color**       | Gemini Blue (`#3b82f6`)         |
| **Borders**            | Subtle grey (`#333333`)         |

### 6.3 Mobile Optimization

| Aspect              | Specification                                          |
| ------------------- | ------------------------------------------------------ |
| **Touch Targets**   | Minimum 44px height                                    |
| **Input Font Size** | ≥16px (prevents iOS zoom)                              |
| **Layout**          | Fixed header/footer, scrollable chat area              |
| **Orientation**     | Responsive (portrait & landscape with adaptive layout) |

### 6.4 Loading & Feedback States

| State                 | Implementation                                                     |
| --------------------- | ------------------------------------------------------------------ |
| **Initial Load**      | Skeleton UI with animated chat bubble placeholders                 |
| **Message Sending**   | Wait for WebSocket ACK; show subtle loading indicator              |
| **Connection Status** | Header badge: Connected/Reconnecting/Disconnected + last sync time |
| **Haptics**           | Light vibration on button press, message send (Vibration API)      |

---

## 7. Testing & Accessibility

### 7.1 Testing Strategy

| Type                  | Scope                                                       |
| --------------------- | ----------------------------------------------------------- |
| **Unit Tests**        | Auth logic, CDP bridge, WebSocket handlers, markdown parser |
| **Integration Tests** | Full message flow, conversation switching, reconnection     |
| **Manual Testing**    | iOS Safari, Android Chrome, PWA installation                |

### 7.2 Accessibility (WCAG 2.1 AA)

- Color contrast ratios meet AA standards
- All interactive elements have accessible labels
- Screen reader compatibility for chat content
- Focus management for keyboard navigation

---

## 8. Logging & Monitoring

### 8.1 Server-Side Logging (Standard Level)

| Event Category           | Logged                                          |
| ------------------------ | ----------------------------------------------- |
| Errors                   | ✓                                               |
| Auth Events              | ✓ (login, logout, failed attempts)              |
| Connection State Changes | ✓ (CDP connect/disconnect, WebSocket lifecycle) |
| Individual CDP Commands  | ✗                                               |
| Message Sync Events      | ✗                                               |

---

## 9. Development Roadmap

### Phase 1: Foundation (Day 1-2)

- [ ] Initialize TanStack Start project with PWA manifest
- [ ] Implement `cdp.server.ts` with Connection Manager + exponential backoff
- [ ] Set up Tailwind CSS with Antigravity dark theme
- [ ] Configure WebSocket server infrastructure

### Phase 2: Core Loop (Day 3-4)

- [ ] Build WebSocket handlers for real-time chat sync
- [ ] Implement main Chat Interface with skeleton loading
- [ ] Create conversation drawer with switch functionality
- [ ] Implement `sendMessage` and `stopGeneration` mutations
- [ ] Add markdown rendering with Shiki syntax highlighting

### Phase 3: Interactions (Day 5-6)

- [ ] Implement voice input with Web Speech API (tap-to-toggle)
- [ ] Add haptic feedback for interactions
- [ ] Build connection status indicator with last sync time
- [ ] Implement responsive orientation support

### Phase 4: Security & Polish (Day 7-8)

- [ ] Implement 6-digit PIN auth with progressive lockout
- [ ] Configure `tailscale serve` for HTTPS exposure
- [ ] Add deferred PWA install prompt
- [ ] Implement Web Push notifications

### Phase 5: Testing & Launch (Day 9-10)

- [ ] Write unit + integration tests
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Final UI polish (animations, loading states)
- [ ] Documentation and deployment

---

## 10. Success Metrics

| Metric               | Target                                             |
| -------------------- | -------------------------------------------------- |
| **Latency**          | Message updates appear within <500ms (WebSocket)   |
| **Stability**        | Server uptime >99% even with desktop app restarts  |
| **Security**         | Zero unauthorized access outside Tailscale network |
| **PWA Install Rate** | >30% of returning users install the app            |
| **Accessibility**    | Pass WCAG 2.1 AA automated checks                  |

---

## Appendix A: Decision Log

| #   | Question               | Decision                                          |
| --- | ---------------------- | ------------------------------------------------- |
| 1   | Target platform        | PWA (Progressive Web App)                         |
| 2   | Voice input v1.0       | Basic Web Speech API implementation               |
| 3   | Real-time updates      | WebSocket (bi-directional)                        |
| 4   | Markdown support       | Basic (code, headers, bold, italic, lists, links) |
| 5   | Session persistence    | 7-day HTTP-only cookie                            |
| 6   | Multi-conversation     | List and switch from phone                        |
| 7   | Error feedback         | Informative (state + last sync + brief errors)    |
| 8   | Conversation UI        | Slide-out drawer                                  |
| 9   | Reconnection           | Exponential backoff capped at 30s                 |
| 10  | PWA install prompt     | Deferred after 2-3 uses                           |
| 11  | Syntax highlighting    | Lightweight (7 popular languages)                 |
| 12  | Thinking blocks        | Collapsed by default, latest expanded             |
| 13  | Haptic feedback        | Subtle (button press, message send)               |
| 14  | Loading experience     | Skeleton UI                                       |
| 15  | Stop confirmation      | None (immediate action)                           |
| 16  | Voice activation       | Tap to toggle                                     |
| 17  | PIN format             | 6-digit numeric                                   |
| 18  | Brute-force protection | Progressive lockout                               |
| 19  | Push notifications     | Basic implementation                              |
| 20  | Testing/accessibility  | Comprehensive + WCAG 2.1 AA                       |
| 21  | Logging level          | Standard                                          |
| 22  | Theme options          | Dark only                                         |
| 23  | Message length         | Soft limit 5,000 (warning at 4,000)               |
| 24  | Image handling         | Display read-only                                 |
| 25  | Conversation metadata  | Title + preview + timestamp                       |
| 26  | Send feedback          | Confirmed append (WebSocket ACK)                  |
| 27  | Orientation            | Responsive (portrait & landscape)                 |

---

## Appendix B: UI Wireframes

### Login Screen

```
┌─────────────────────────────┐
│      🔐 ANTIGRAVITY         │
│                             │
│   ┌─────────────────────┐   │
│   │  ● ● ● ● ● ●        │   │  ← 6-digit PIN input
│   └─────────────────────┘   │
│                             │
│   [ 1 ] [ 2 ] [ 3 ]         │
│   [ 4 ] [ 5 ] [ 6 ]         │  ← Numeric keypad
│   [ 7 ] [ 8 ] [ 9 ]         │
│   [ ⌫ ] [ 0 ] [ → ]         │
│                             │
│   "Secured via Tailscale"   │
└─────────────────────────────┘
```

### Main Chat View

````
┌─────────────────────────────┐
│ ☰  Antigravity    ● Online  │  ← Header: drawer toggle + status
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │ You                     │ │
│ │ How do I fix this bug? │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 🤖 Antigravity          │ │
│ │ ▼ Thinking...           │ │  ← Collapsible thinking block
│ │                         │ │
│ │ Here's how to fix it:   │ │
│ │ ```typescript           │ │
│ │ const fix = true;       │ │
│ │ ```                     │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ 🎤 │ Type a message...  │ ➤ │  ← Input bar: mic + text + send
├─────────────────────────────┤
│         [ ■ STOP ]          │  ← Floating stop button (when active)
└─────────────────────────────┘
````

### Conversation Drawer

```
┌───────────────┬─────────────┐
│ Conversations │             │
├───────────────┤             │
│ ● Debug issue │             │
│   "Here's how │  Main Chat  │
│   to fix..."  │    View     │
│   2 min ago   │             │
├───────────────┤             │
│   API design  │             │
│   "The REST   │             │
│   endpoint.." │             │
│   1 hour ago  │             │
├───────────────┤             │
│   + New chat  │             │
└───────────────┴─────────────┘
```

### Connection States

```
● Online       → Green dot, "Last sync: just now"
◐ Reconnecting → Yellow pulse, "Reconnecting..."
○ Offline      → Red dot, "Disconnected - tap to retry"
```

---

## Appendix C: Risk Assessment

| Risk                                 | Likelihood | Impact | Mitigation                                                     |
| ------------------------------------ | ---------- | ------ | -------------------------------------------------------------- |
| **Antigravity DOM changes**          | Medium     | High   | Raw HTML fallback parser; configurable CSS selectors via env   |
| **Tailscale unavailable**            | Low        | High   | Document alternative setup (ngrok, local IP with manual HTTPS) |
| **CDP port conflicts**               | Medium     | Medium | Port scanning strategy (9000-9003); clear error message        |
| **WebSocket connection instability** | Medium     | Medium | Exponential backoff reconnection; offline indicator            |
| **PIN brute-force attack**           | Low        | High   | Progressive lockout (30s → 5min → 30min)                       |
| **Push notification failures**       | Medium     | Low    | Graceful degradation; app works without push                   |
| **SQLite corruption**                | Low        | Medium | WAL mode; periodic backups; recoverable from empty state       |
| **Voice recognition inaccuracy**     | High       | Low    | Optional feature; user can always type instead                 |
| **iOS Safari PWA limitations**       | Medium     | Medium | Test thoroughly; document known limitations                    |
| **Large chat history performance**   | Medium     | Medium | Virtual scrolling; pagination; message limit                   |

---

## Changelog

| Version | Date       | Changes                                                                                                                                                                |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0     | 2026-01-18 | Major rewrite: PWA architecture, WebSocket real-time, conversation switching, voice input, push notifications, comprehensive requirements from 48 clarifying questions |
| 1.0     | 2026-01-17 | Initial PRD draft                                                                                                                                                      |

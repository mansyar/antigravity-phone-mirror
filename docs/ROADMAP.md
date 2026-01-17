# Development Roadmap

**Project:** Antigravity Phone Mirror  
**Version:** 1.0  
**Last Updated:** 2026-01-18

> **Related Documentation:**
>
> - [Product Requirements Document (PRD)](./PRD.md) - Features, UX specs, decision log
> - [Technical Design Document (TDD)](./TDD.md) - Architecture, code patterns, dependencies

---

## Progress Tracking Legend

| Status      | Symbol |
| ----------- | ------ |
| Not Started | ⬜     |
| In Progress | 🔄     |
| Completed   | ✅     |
| Blocked     | 🚫     |

---

## Phase 1: Foundation

**Duration:** Day 1-2  
**Status:** ⬜ Not Started

### Goal

Establish the project foundation with a working TanStack Start application, CDP connection infrastructure, and the Antigravity dark theme.

### Requirements Reference

| ID         | Requirement                      | Source                                              |
| ---------- | -------------------------------- | --------------------------------------------------- |
| REQ-NET-01 | Server binds to localhost only   | [PRD §5.1](./PRD.md#51-authentication--security-p0) |
| REQ-CDP-01 | Connection Manager singleton     | [PRD §5.5](./PRD.md#55-robustness--connectivity-p1) |
| REQ-CDP-02 | Silent reconnection with backoff | [PRD §5.5](./PRD.md#55-robustness--connectivity-p1) |

### Tasks

- [ ] **1.1** Initialize TanStack Start project with TypeScript strict mode
- [ ] **1.2** Configure pnpm and create `package.json` with dependencies per [TDD §Appendix C](./TDD.md#appendix-c-dependencies)
- [ ] **1.3** Set up Tailwind CSS with Antigravity dark theme per [PRD §6.2](./PRD.md#62-theme-antigravity-dark-only)
- [ ] **1.4** Create PWA manifest (`public/manifest.json`) with icons
- [ ] **1.5** Implement environment validation with Zod per [TDD §7.2](./TDD.md#72-zod-validation)
- [ ] **1.6** Implement CDP port scanner (`server/cdp/port-scanner.ts`) per [TDD §3.1](./TDD.md#31-port-scanning-strategy)
- [ ] **1.7** Implement Connection Manager singleton per [TDD §3.2](./TDD.md#32-connection-manager)
- [ ] **1.8** Create basic health check endpoint (`/api/health`) per [TDD §10](./TDD.md#10-health-check)
- [ ] **1.9** Set up SQLite database for push subscriptions per [TDD §6.2](./TDD.md#62-sqlite-schema)

### Acceptance Criteria

1. `pnpm dev` starts the server on port 3333 without errors
2. Health endpoint returns `{ status: "ok", cdp: { connected: false } }`
3. CDP scanner finds Antigravity when launched with `--remote-debugging-port=9000`
4. Connection Manager auto-reconnects after Antigravity restart
5. Tailwind produces the Antigravity color palette (`#1f1f1f`, `#3b82f6`, `#333333`)

### Definition of Done

- [ ] All tasks marked complete
- [ ] `pnpm type-check` passes with no errors
- [ ] `pnpm lint` passes with no warnings
- [ ] Environment variables validated on startup
- [ ] Project structure matches [TDD §2](./TDD.md#2-project-structure)

### Test Strategy

| Type        | Scope                            | Tool             |
| ----------- | -------------------------------- | ---------------- |
| Unit        | Port scanner, Connection Manager | Vitest           |
| Integration | CDP connection lifecycle         | Manual + Vitest  |
| Manual      | Theme colors, PWA manifest       | Browser DevTools |

---

## Phase 2: Core Loop

**Duration:** Day 3-4  
**Status:** ⬜ Not Started

### Goal

Implement the real-time chat synchronization via WebSocket, including message display, markdown rendering, and the main UI layout.

### Requirements Reference

| ID          | Requirement                 | Source                                              |
| ----------- | --------------------------- | --------------------------------------------------- |
| REQ-CHAT-01 | Mirror chat via WebSocket   | [PRD §5.2](./PRD.md#52-chat-monitoring-p0)          |
| REQ-CHAT-02 | Collapsible thinking blocks | [PRD §5.2](./PRD.md#52-chat-monitoring-p0)          |
| REQ-CHAT-03 | Syntax highlighting         | [PRD §5.2](./PRD.md#52-chat-monitoring-p0)          |
| REQ-CHAT-04 | Basic markdown support      | [PRD §5.2](./PRD.md#52-chat-monitoring-p0)          |
| REQ-UI-02   | Skeleton UI loading         | [PRD §5.5](./PRD.md#55-robustness--connectivity-p1) |

### Tasks

- [ ] **2.1** Implement WebSocket server (`server/ws-server.ts`) per [TDD §5.1](./TDD.md#51-server-implementation)
- [ ] **2.2** Implement WebSocket client (`app/lib/ws-client.ts`) with reconnection per [TDD §5.3](./TDD.md#53-client-reconnection)
- [ ] **2.3** Implement CDP chat parser (`server/cdp/chat-parser.ts`) per [TDD §3.3](./TDD.md#33-chat-parser-hybrid-approach)
- [ ] **2.4** Create `ChatMessage` component with markdown + syntax highlighting
- [ ] **2.5** Create `ChatList` component with auto-scroll behavior
- [ ] **2.6** Create `ThinkingBlock` component (collapsed by default, latest expanded)
- [ ] **2.7** Create `SkeletonLoader` component per [PRD §6.4](./PRD.md#64-loading--feedback-states)
- [ ] **2.8** Create main chat page layout (fixed header/footer, scrollable center)
- [ ] **2.9** Integrate Shiki for syntax highlighting (JS, TS, Python, Rust, Go, HTML, CSS)
- [ ] **2.10** Implement image display (read-only) per [PRD requirement REQ-CHAT-06](./PRD.md#52-chat-monitoring-p0)

### Acceptance Criteria

1. WebSocket connects and receives chat updates in real-time
2. Messages render with proper markdown formatting
3. Code blocks display with syntax highlighting
4. Thinking blocks are collapsible; latest is auto-expanded
5. Skeleton UI shows during initial load
6. Auto-scroll works; pauses when user scrolls up

### Definition of Done

- [ ] All tasks marked complete
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] WebSocket message protocol matches [TDD §5.2](./TDD.md#52-message-protocol)
- [ ] Chat renders correctly on mobile viewport (375px width)

### Test Strategy

| Type        | Scope                                    | Tool                       |
| ----------- | ---------------------------------------- | -------------------------- |
| Unit        | Markdown parser, syntax highlighter      | Vitest                     |
| Integration | WebSocket connection, chat sync          | Vitest + Mock CDP          |
| Manual      | UI rendering, auto-scroll, mobile layout | iOS Safari, Android Chrome |

---

## Phase 3: Interactions

**Duration:** Day 5-6  
**Status:** ⬜ Not Started

### Goal

Enable user interactions: sending messages, stopping generation, voice input, conversation switching, and haptic feedback.

### Requirements Reference

| ID          | Requirement                         | Source                                             |
| ----------- | ----------------------------------- | -------------------------------------------------- |
| REQ-CTRL-01 | Input bar with 5,000 char limit     | [PRD §5.4](./PRD.md#54-interaction--control-p1)    |
| REQ-CTRL-02 | Stop button (immediate, no confirm) | [PRD §5.4](./PRD.md#54-interaction--control-p1)    |
| REQ-CTRL-04 | Voice input (tap-to-toggle)         | [PRD §5.4](./PRD.md#54-interaction--control-p1)    |
| REQ-CTRL-05 | Subtle haptic feedback              | [PRD §5.4](./PRD.md#54-interaction--control-p1)    |
| REQ-CONV-01 | Slide-out conversation drawer       | [PRD §5.3](./PRD.md#53-conversation-management-p1) |

### Tasks

- [ ] **3.1** Implement CDP actions (`sendMessage`, `stopGeneration`) per [TDD §3.4](./TDD.md#34-actions)
- [ ] **3.2** Create `InputBar` component with character counter (warning at 4,000)
- [ ] **3.3** Create `StopButton` FAB component (high-visibility, immediate action)
- [ ] **3.4** Implement rate limiting per [TDD §11](./TDD.md#11-rate-limiting) (500ms send, 1s stop)
- [ ] **3.5** Implement voice input with Web Speech API (`app/lib/speech.ts`)
- [ ] **3.6** Create `ConversationDrawer` component per [PRD wireframe](./PRD.md#appendix-b-ui-wireframes)
- [ ] **3.7** Implement conversation list fetch and switch via CDP
- [ ] **3.8** Implement haptic feedback (`app/lib/haptics.ts`) per [PRD §6.4](./PRD.md#64-loading--feedback-states)
- [ ] **3.9** Create `ConnectionStatus` component (connected/reconnecting/offline)
- [ ] **3.10** Implement responsive orientation support (portrait + landscape)

### Acceptance Criteria

1. Messages send successfully; UI shows sending state until WebSocket ACK
2. Stop button immediately halts generation
3. Voice input activates on tap, stops on tap or silence
4. Conversation drawer slides in from left; tapping item switches chat
5. Haptic feedback triggers on button press and successful send
6. Connection status accurately reflects CDP and WebSocket state

### Definition of Done

- [ ] All tasks marked complete
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] Touch targets ≥44px per [PRD §6.3](./PRD.md#63-mobile-optimization)
- [ ] Input font ≥16px (prevents iOS zoom)

### Test Strategy

| Type          | Scope                                | Tool                   |
| ------------- | ------------------------------------ | ---------------------- |
| Unit          | Rate limiter, speech API wrapper     | Vitest                 |
| Integration   | Send/stop actions via CDP            | Manual + Vitest        |
| Manual        | Voice input, haptics, drawer gesture | Physical mobile device |
| Accessibility | Touch targets, focus management      | axe DevTools           |

---

## Phase 4: Security & Polish

**Duration:** Day 7-8  
**Status:** ⬜ Not Started

### Goal

Implement authentication, push notifications, PWA installation, and final UI polish.

### Requirements Reference

| ID          | Requirement                    | Source                                              |
| ----------- | ------------------------------ | --------------------------------------------------- |
| REQ-AUTH-01 | 6-digit PIN authentication     | [PRD §5.1](./PRD.md#51-authentication--security-p0) |
| REQ-AUTH-04 | Progressive lockout            | [PRD §5.1](./PRD.md#51-authentication--security-p0) |
| REQ-PUSH-01 | Web Push for response complete | [PRD §5.6](./PRD.md#56-push-notifications-p2)       |

### Tasks

- [ ] **4.1** Implement PIN validation with progressive lockout per [TDD §4.1](./TDD.md#41-pin-validation-with-progressive-lockout)
- [ ] **4.2** Implement session management (7-day cookie + WS token) per [TDD §4.2](./TDD.md#42-session-management)
- [ ] **4.3** Create login page per [PRD wireframe](./PRD.md#appendix-b-ui-wireframes)
- [ ] **4.4** Implement auth middleware for all protected routes
- [ ] **4.5** Set up VAPID keys and push subscription storage per [TDD §6](./TDD.md#6-push-notifications)
- [ ] **4.6** Implement push notification for "AI response complete"
- [ ] **4.7** Implement deferred PWA install prompt (after 2-3 uses) per [PRD §6.1](./PRD.md#61-progressive-web-app)
- [ ] **4.8** Create service worker for offline indicator
- [ ] **4.9** Configure Tailscale Serve per [TDD §8](./TDD.md#8-tailscale-configuration)
- [ ] **4.10** Add loading animations and transitions

### Acceptance Criteria

1. Login requires 6-digit PIN; incorrect attempts trigger progressive lockout
2. Session persists for 7 days across app restarts
3. Unauthorized access redirects to login
4. Push notification received when AI finishes responding
5. PWA install prompt appears after 2-3 successful uses
6. App accessible via `https://<machine>.ts.net` on mobile

### Definition of Done

- [ ] All tasks marked complete
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] No unauthorized access possible from outside Tailscale
- [ ] Lockout tested: 3 fails → 30s, 5 → 5min, 10 → 30min

### Test Strategy

| Type        | Scope                                   | Tool                    |
| ----------- | --------------------------------------- | ----------------------- |
| Unit        | PIN validation, lockout logic, JWT      | Vitest                  |
| Integration | Auth flow, session lifecycle            | Vitest                  |
| Manual      | PWA install, push notifications         | Physical mobile device  |
| Security    | Brute-force protection, cookie security | Manual penetration test |

---

## Phase 5: Testing & Launch

**Duration:** Day 9-10  
**Status:** ⬜ Not Started

### Goal

Comprehensive testing, accessibility audit, documentation, and production deployment.

### Requirements Reference

| ID      | Requirement                 | Source                                      |
| ------- | --------------------------- | ------------------------------------------- |
| Testing | Comprehensive + WCAG 2.1 AA | [PRD §7](./PRD.md#7-testing--accessibility) |
| Metrics | <500ms latency, >99% uptime | [PRD §10](./PRD.md#10-success-metrics)      |

### Tasks

- [ ] **5.1** Write unit tests for all core modules (target: >80% coverage)
- [ ] **5.2** Write integration tests for critical flows (auth, chat, actions)
- [ ] **5.3** Conduct accessibility audit (WCAG 2.1 AA) per [PRD §7.2](./PRD.md#72-accessibility-wcag-21-aa)
- [ ] **5.4** Fix any accessibility issues found
- [ ] **5.5** Test on iOS Safari (iPhone)
- [ ] **5.6** Test on Android Chrome
- [ ] **5.7** Document Tailscale setup in README
- [ ] **5.8** Document CDP launch requirements
- [ ] **5.9** Create `.env.example` with all variables
- [ ] **5.10** Final performance optimization (bundle size, lazy loading)
- [ ] **5.11** Deploy and verify production environment

### Acceptance Criteria

1. All unit and integration tests pass
2. WCAG 2.1 AA automated checks pass (color contrast, labels)
3. App works on iOS Safari 16+ and Android Chrome 120+
4. README provides complete setup instructions
5. Message latency <500ms per [PRD success metrics](./PRD.md#10-success-metrics)

### Definition of Done

- [ ] All tasks marked complete
- [ ] `pnpm test` passes with >80% coverage
- [ ] `pnpm build` succeeds
- [ ] Lighthouse accessibility score ≥90
- [ ] README reviewed and complete
- [ ] App successfully installed and used from mobile device

### Test Strategy

| Type          | Scope                | Tool                        |
| ------------- | -------------------- | --------------------------- |
| Unit          | All modules          | Vitest                      |
| Integration   | Full user flows      | Vitest                      |
| E2E           | Critical paths       | Manual (iOS, Android)       |
| Accessibility | Full app             | axe, Lighthouse             |
| Performance   | Latency, bundle size | Lighthouse, Chrome DevTools |

---

## Risk Mitigation Checkpoints

Reference: [PRD Appendix C: Risk Assessment](./PRD.md#appendix-c-risk-assessment)

| Phase   | Risk Check                                               |
| ------- | -------------------------------------------------------- |
| Phase 1 | Verify CDP connection works with Antigravity             |
| Phase 2 | Validate DOM parser against actual Antigravity structure |
| Phase 3 | Test voice input on physical devices (not emulators)     |
| Phase 4 | Verify Tailscale accessible from mobile before PWA setup |
| Phase 5 | iOS Safari PWA behavior testing                          |

---

## Changelog

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| 1.0     | 2026-01-18 | Initial roadmap with 5 phases |

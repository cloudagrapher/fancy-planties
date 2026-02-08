---
id: expo-capabilities
type: external-research
source: docs
created: 2026-02-07
hypothesis: ../knowledge/L1/expo-monorepo-hypothesis.md
assumption_tested: "Expo managed workflow supports camera, push, background tasks, haptics, images, offline, and monorepo setup"
valid_until: 2026-08-07
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "Expo official documentation, SDK 53-54+"
  our_context: "Solo developer building plant tracking iOS app with Expo managed workflow"
  justification: "Direct match — Expo official docs for the exact features needed"
sources:
  - url: https://docs.expo.dev/versions/latest/sdk/imagepicker/
    title: "expo-image-picker documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/push-notifications/overview/
    title: "Expo Push Notifications Overview"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/versions/latest/sdk/securestore/
    title: "expo-secure-store documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/versions/latest/sdk/haptics/
    title: "expo-haptics documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/versions/latest/sdk/image/
    title: "expo-image documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/versions/latest/sdk/sqlite/
    title: "expo-sqlite documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://docs.expo.dev/guides/monorepos/
    title: "Work with Monorepos - Expo"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://tanstack.com/query/latest/docs/framework/react/react-native
    title: "React Query - React Native docs"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
scope:
  applies_to: "H1 and H3 — any Expo-based hypothesis"
  not_valid_for: "SwiftUI (H4) or bare RN CLI approaches"
---

# Research: Expo SDK Capabilities for Plant Tracking App

## Purpose
Verify that ALL required native features work in Expo managed workflow without ejecting.

## Findings

### ALL 10 FEATURES SUPPORTED IN MANAGED WORKFLOW

| Feature | Package | Status | Key Caveat |
|---------|---------|--------|------------|
| Camera | `expo-image-picker` | SUPPORTED | Use `launchCameraAsync()` for plant photos |
| Push notifications | `expo-notifications` + Expo Push Service | SUPPORTED | Apple Developer account required ($99/yr) |
| Secure storage | `expo-secure-store` | SUPPORTED | Uses iOS Keychain, ~2KB per value limit |
| Background tasks | `expo-background-task` | SUPPORTED | iOS controls timing; use LOCAL NOTIFICATIONS for care reminders instead |
| Haptic feedback | `expo-haptics` | SUPPORTED | Uses iOS Taptic Engine, silent in Low Power Mode |
| Image caching | `expo-image` | SUPPORTED | **`cacheKey` prop solves presigned URL problem** — cache by S3 key, not URL |
| SQLite offline | `expo-sqlite` | SUPPORTED | Drizzle ORM works with expo-sqlite for shared schema patterns |
| EAS Build (free) | EAS CLI | SUPPORTED | 15 iOS builds/month, 1-2hr queue at peak; unlimited local builds |
| Turborepo monorepo | Expo SDK 52+ | SUPPORTED | Auto-detects monorepo; avoid pnpm isolated deps |
| React Query + RHF | `@tanstack/react-query` + `react-hook-form` | SUPPORTED | Both work identically to web, zero modifications |

### Critical Discovery: expo-image cacheKey

The `cacheKey` property on `expo-image` is the key finding for presigned URL image loading. Presigned URLs change query parameters on every generation, but `cacheKey` lets you cache by stable S3 key instead:

```tsx
<Image source={{ uri: presignedUrl, cacheKey: 'plants/123/photo.jpg' }} cachePolicy="memory-disk" />
```

This eliminates the N+1 presigned URL problem for cached images — only first load needs the URL.

### Critical Discovery: Local Notifications for Care Reminders

Background tasks (expo-background-task) are NOT suitable for exact-time care reminders. iOS controls when background tasks run. Instead, use `expo-notifications` with `scheduleNotificationAsync()` for exact-time local notifications. These fire at scheduled times regardless of app state.

### Critical Discovery: Drizzle + expo-sqlite

Drizzle ORM supports SQLite, so you can share schema definitions between web (PostgreSQL) and mobile (SQLite). Different adapters, same schema DSL. Powerful for code sharing in monorepo.

## Verdict
- [x] Assumption **SUPPORTED** by external evidence (congruence: HIGH)
- No feature requires ejecting from Expo managed workflow
- Apple Developer Program ($99/year) is a hard requirement for any iOS distribution

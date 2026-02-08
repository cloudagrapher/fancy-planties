---
id: swiftui-capabilities
type: external-research
source: web
created: 2026-02-07
hypothesis: ../knowledge/L1/swiftui-native-hypothesis.md
assumption_tested: "SwiftUI handles complex list views, forms, and server state management for a plant tracking app"
valid_until: 2026-08-07
decay_action: refresh
congruence:
  level: high
  penalty: 0.00
  source_context: "Apple official docs, SwiftUI community blogs, WWDC 2025 sessions"
  our_context: "Solo React developer building plant tracking iOS app in SwiftUI"
  justification: "Direct match — SwiftUI capabilities verified for exact features needed"
sources:
  - url: https://github.com/kean/Nuke
    title: "Nuke image loading library"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://developer.apple.com/documentation/swiftui/asyncimage
    title: "AsyncImage - Apple Developer Documentation"
    type: official-docs
    accessed: 2026-02-07
    credibility: high
  - url: https://fatbobman.com/en/posts/key-considerations-before-using-swiftdata/
    title: "Key Considerations Before Using SwiftData"
    type: tech-blog
    accessed: 2026-02-07
    credibility: medium
  - url: https://www.avanderlee.com/concurrency/urlsession-async-await-network-requests-in-swift/
    title: "URLSession async/await guide"
    type: tech-blog
    accessed: 2026-02-07
    credibility: medium
  - url: https://github.com/devMEremenko/XcodeBenchmark
    title: "XcodeBenchmark - build time data"
    type: tech-blog
    accessed: 2026-02-07
    credibility: medium
scope:
  applies_to: "H4 (SwiftUI Native) only"
  not_valid_for: "React Native/Expo approaches"
---

# Research: SwiftUI Capabilities for Plant Tracking App

## Purpose
Verify SwiftUI's maturity for image-heavy grids, forms, server state, offline storage, and widgets.

## Findings

### 1. LazyVGrid + Images: USE NUKE, NOT ASYNCIMAGE

AsyncImage has NO disk caching, no memory caching, no downsampling. For 100+ plant cards with presigned URLs, use **Nuke** (with NukeUI):
- Automatic request cancellation on scroll
- LRU memory + disk cache
- Background decompression
- Image downsampling to display size
- WebP support
- Task coalescing for duplicate requests

WWDC 2025: SwiftUI lists/grids improved 6x loading speed and 16x update speed for 100K+ items.

**Verdict:** SUPPORTED with Nuke. Do not use AsyncImage for production grids.

### 2. React Query Equivalent: NONE EXISTS

No mature Swift equivalent to TanStack Query. Options:
- **Pigeon** (github.com/fmo91/Pigeon) — inspired by React Query but effectively unmaintained (~5 years since last PR)
- **Sqwery** — minimal adoption

**Recommended approach:** Build thin custom layer using:
- `@Observable` classes as query objects
- URLSession + async/await for fetching
- `NSCache` for in-memory caching
- `actor`-based cache invalidation

This is ~100-200 lines of custom code. You lose automatic background refetching, stale-while-revalidate, and window focus refetching.

**Verdict:** SIGNIFICANT GAP vs React Native. Must build your own caching.

### 3. SwiftData: USABLE WITH CAVEATS

In its third year (post-WWDC 2025). Can handle ~9 tables. Known issues:
- Relationship properties MUST be optional
- Performance issues with multi-relationship data chains
- Background context views sometimes don't update
- Missing `NSCompoundPredicate` equivalent

**Verdict:** Sufficient as offline cache. Core Data available as fallback.

### 4. Forms: GOOD NATIVE PRIMITIVES, MANUAL VALIDATION

SwiftUI `Form` with `@Observable` state management. Closest validation library: ValidatedPropertyKit. No react-hook-form equivalent. Manual dirty tracking.

**Verdict:** Workable but more manual than react-hook-form.

### 5. WidgetKit: 2-3 DAYS OF WORK

App Groups + shared UserDefaults for data. TimelineProvider + SwiftUI widget view.
Interactive widgets (iOS 17+) can add "Mark as watered" button.

**Verdict:** STRONG ADVANTAGE. Straightforward to build, high user value.

### 6. Learning Curve: 3-6 MONTHS TO PRODUCTIVITY

Where React analogy holds: useState→@State, useContext→@Environment, component composition.
Where it breaks: modifier order matters, 6+ state property wrappers, no CSS, Xcode vs VS Code.

**Verdict:** Significant investment. 2-3 months to build features, 4-6 months to feel comfortable.

### 7. URLSession + async/await: PRODUCTION READY

Alamofire no longer necessary. URLSession + Codable + async/await covers REST APIs.
~100-150 lines for a typed APIClient actor.

**Verdict:** SUPPORTED. No third-party dependency needed.

### 8. Build Times: COMPARABLE TO RN/EXPO

Clean build: 45-90s (M-series Mac). Incremental: 3-15s. SwiftUI previews: sub-second but can crash.
RN Fast Refresh is more reliable day-to-day.

**Verdict:** Comparable iteration speed when previews work. Worse when they crash.

## Summary: SwiftUI vs React Native for This App

| Dimension | Winner |
|-----------|--------|
| Image grid performance | SwiftUI (Nuke) |
| Server state management | React Native (React Query) |
| Form handling | React Native (react-hook-form) |
| Home screen widgets | SwiftUI (WidgetKit) |
| Learning curve | React Native (already known) |
| Build/iteration speed | React Native (more reliable hot reload) |
| Platform integration | SwiftUI (first-class Apple citizen) |

## Verdict
- [x] Assumption **PARTIALLY SUPPORTED** — SwiftUI is capable but with significant gaps in server state management and form validation vs React Native/Expo

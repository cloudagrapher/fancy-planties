---
id: swiftui-native
type: hypothesis
created: 2026-02-07
problem: Convert fancy-planties web app to iOS app
status: L1
deduction_passed: 2026-02-07
deduction_result: conditional
conditions_needed: |
  1. Accept 6-8 weeks to first production build (vs 3-4 weeks for H1/H3 with Expo)
  2. Accept permanent two-language maintenance with ZERO code sharing (not even types)
  3. Genuinely want native platform features (Widgets, Siri, Watch) that justify the cost
  4. Willing to invest in Swift/SwiftUI as long-term skill development
deduction_notes: |
  CONDITIONAL PASS. Technically valid, highest iOS ceiling, but highest cost.

  Key findings from deduction:
  - "SwiftUI is similar to React" is partially true: declarative paradigm shared, but
    modifier chain pattern, navigation model, and data flow differ significantly.
  - SwiftUI learning timeline: basic screens 1-2 wks, comfortable 3-4 wks, production 6-8 wks
  - Two model layers needed: Codable DTOs for API + SwiftData @Model for persistence.
    Not acknowledged in hypothesis but manageable.
  - Zero code sharing possible. Every Zod schema, every business rule, every validation
    must be reimplemented in Swift. 368+ lines of Zod schemas with transforms (regex
    patterns, capitalization rules, date calculations).
  - UNIQUE ADVANTAGES over all other hypotheses:
    * WidgetKit (home screen care reminders)
    * Siri Shortcuts ("Hey Siri, water my Monstera")
    * watchOS companion app
    * Core Spotlight (plants in iOS search)
    * iPad adaptive layouts (trivial in SwiftUI)
  - React Query has no Swift equivalent — must build caching/invalidation or use
    third-party lib. This is a real gap.

  The hypothesis is valid IF and ONLY IF native platform features are valued enough
  to justify 2x implementation cost and zero code sharing.
formality: 3
novelty: Radical
complexity: High
author: Claude (generated), Human (to review)
scope:
  applies_to: "Developer willing to learn Swift/SwiftUI for premium iOS-native experience"
  not_valid_for: "Developers needing fast time-to-market or cross-platform output"
  scale: "Personal project with deep iOS integration ambitions"
---

# Hypothesis: SwiftUI Native App with Shared Backend

## 1. The Method (Design-Time)

### Proposed Approach
Build a fully native iOS app in SwiftUI in a new repository. Swift Codable models mirror Drizzle schema. URLSession + async/await for API. Bearer token auth. iOS-native features: SwiftData offline, WidgetKit, Siri Shortcuts, Spotlight.

### Implementation Steps
1. Create Xcode project with SwiftUI lifecycle
2. Define Codable DTOs + SwiftData @Model classes (two model layers)
3. Add dual-auth to Next.js API (same as all mobile hypotheses)
4. Build Swift API client with URLSession + async/await
5. Implement screens: Auth → Dashboard → Plants Grid → Plant Detail → Care Log
6. SwiftData for offline persistence
7. WidgetKit widget for care reminders
8. Native camera with PHPickerViewController
9. APNs push notifications + Background App Refresh
10. Siri Shortcuts for common care actions

## 2. The Validation (Run-Time)

### Deduction Results

#### L2 Consistency: NO CONTRADICTIONS
- Thumbnails (L2-1) produce WebP → SwiftUI AsyncImage handles natively since iOS 16 ✓
- Bearer token auth + presigned URLs → works identically from Swift ✓

#### Internal Consistency: PASS (with model layer clarification)
- Need TWO model layers: Codable DTOs for API responses + SwiftData @Model for persistence
- Mapping layer between them needed (not acknowledged in original hypothesis)
- "SwiftUI similar to React" is partially true — declarative paradigm shared, execution model differs

#### SwiftUI vs React Gap Analysis
| Concept | Gap |
|---------|-----|
| State management | Low — @State, @Observable similar to useState/useReducer |
| Component composition | Medium — modifier chains ≠ props |
| Navigation | Medium — NavigationStack differs from React Router |
| Forms | High — no react-hook-form equivalent |
| Async data (React Query) | High — no direct equivalent, must build or use 3rd party |
| Lists/virtualization | Low — SwiftUI's List/LazyVStack is superior |
| Error handling | Low — Swift's do/catch is actually better |
| Concurrency | Low — Swift structured concurrency is superior |

#### Unique Advantages (no other hypothesis can match)
- WidgetKit home screen widgets
- Siri Shortcuts integration
- watchOS companion app possibility
- Core Spotlight search indexing
- iPad adaptive layouts (trivial)

### Assumptions to Verify
- [ ] Developer willing to invest 4-6 weeks learning Swift/SwiftUI
- [ ] SwiftUI LazyVGrid handles 100+ plant cards with async images
- [ ] Third-party Swift caching library (or custom) can replace React Query
- [ ] Same backend conditions as H1 (dual-auth, presigned URLs, CSRF exemption)

## Falsification Criteria
- If not comfortable with Swift after 4 weeks → pivot to H1 (Expo)
- If SwiftUI LazyVGrid stutters with 100+ images → framework insufficient
- If total effort exceeds 16 weeks → too expensive for personal project
- If native features (widgets, Siri) unused after 3 months → investment wasted

## Estimated Effort
14-20 weeks (4 wks learning + basic, 6-8 wks features, 4-6 wks native polish, 2 wks App Store)

## Weakest Link (Updated After Deduction)
**Total reimplementation cost with zero code sharing.** The learning curve is one-time. The ongoing cost is maintaining two completely separate codebases in two different languages where every feature is built twice from scratch. No Zod schemas shared, no types shared, no validation shared. Justified only by the unique native platform features.

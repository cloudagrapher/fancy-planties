---
id: display-size-analysis
type: internal-test
source: internal
created: 2026-02-06
hypothesis: .fpf/knowledge/L1/s3-thumbnail-generation-hypothesis.md
assumption_tested: "Thumbnails would meaningfully reduce bandwidth for actual app usage"
valid_until: 2026-08-06
decay_action: refresh
scope:
  applies_to: "Current fancy-planties app component structure"
  not_valid_for: "After major UI redesign"
  environment: "Codebase analysis of all image display components"
---

# Test: Image Display Size Analysis

## Purpose
Map all actual image display sizes in the app to determine optimal thumbnail tiers and quantify bandwidth savings.

## Method
Searched all components using S3Image, Next.js Image, or displaying plant photos. Extracted actual width/height props and CSS constraints.

## Raw Results

### All Image Display Contexts

| Component | Context | Actual Display Size | Current Source |
|-----------|---------|---------------------|----------------|
| PlantsGrid (list) | List thumbnails | 48x48px | Full-size original |
| PlantImageGallery (strip) | Gallery thumbnails | 64x64px | Full-size original |
| PropagationCard | Card thumb | 64x64px | Full-size original |
| CareHistoryTimeline | Timeline thumb | 48x48px | Full-size original |
| PlantCard (small) | Grid card | ~140x105px | Full-size original |
| PlantCard (medium) | Grid card | ~160x120px | Full-size original |
| PlantCard (large) | Grid card | ~200x150px | Full-size original |
| PlantInstanceForm | Edit preview | 200x200px | Full-size original |
| CareGuideDetail | Gallery grid | 300x300px | Full-size original |
| HandbookDashboard | Card thumbnail | 400x225px | Full-size original |
| PlantDetailModal | Modal grid | ~300-400px | Full-size original |
| PlantImageGallery (main) | Fullscreen | 100vw | Full-size original (correct) |

### Optimal Thumbnail Tiers

| Tier | Size | Covers | Est. WebP Size | vs 5MB Original |
|------|------|--------|----------------|-----------------|
| Tiny | 64x64 | List, timeline, gallery strip, propagation | 2-5 KB | 99.9% reduction |
| Small | 200x150 | Plant cards, form previews | 8-20 KB | 99.6% reduction |
| Medium | 300x300 | Gallery grids, detail modal | 15-40 KB | 99.2% reduction |
| Large | 400x300 | Care guide cards, large cards | 20-50 KB | 99.0% reduction |

### Bandwidth Impact (per page load)

| Page | Images Loaded | Current (5MB each) | With Tiny Thumbs | Savings |
|------|--------------|---------------------|-------------------|---------|
| Plant list (20 plants) | 20 | 100 MB | 60-100 KB | 99.9% |
| Plant grid (12 cards) | 12 | 60 MB | 96-240 KB | 99.6% |
| Plant detail (6 photos) | 6 gallery + 1 main | 35 MB | 200 KB + 5 MB | 85% |

## Verdict

- [x] Assumption **CONFIRMED** — Thumbnails would provide 85-99.9% bandwidth reduction across all app pages

## Key Finding
The plant list view is the worst offender: loading 20 full-size photos (potentially 100MB) where 48x48 thumbnails (2-5KB each, 40-100KB total) would suffice. This is a **1000x** bandwidth reduction for the most common view.

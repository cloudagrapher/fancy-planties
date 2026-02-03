# 003: Plant Card Images Super Zoomed on Mobile

**Status:** Fixed (PR #35 — open)
**Severity:** Medium — cosmetic but very noticeable
**Date:** 2026-02-03

## Symptom

On mobile devices, plant card images appeared extremely zoomed in — showing only a tiny
cropped center portion of the original photo. The same images looked fine on desktop
where the cards were wider.

## Root Cause

Plant card images used **fixed pixel heights** (`h-20`, `h-24`, `h-32`) combined with
`object-fit: cover` and `width: 100%`.

On mobile, the card width shrinks (small viewport → narrow card), but the height stays
fixed. This creates a narrow, tall image container. With `object-fit: cover`, the browser
scales the image to fill the container and crops the overflow — which on a narrow container
means aggressive horizontal cropping.

### Visual explanation

```
Desktop card (wide):           Mobile card (narrow):
┌─────────────────┐            ┌────────┐
│   h-24 (96px)   │            │ h-24   │  ← Same height
│   ████████████   │            │ ██████ │  ← Much narrower
│   (mild crop)    │            │ (heavy │
└─────────────────┘            │  crop) │
  width ~160px                 └────────┘
                                 ~100px
```

The CSS in `globals.css` also had `height: 120px` on `.plant-card-image`, doubling down
on the fixed-height approach.

## Fix

### 1. Replace fixed heights with aspect-ratio

**CSS (`globals.css`):**
```css
/* Before: */
.plant-card-image {
  height: 120px;
}

/* After: */
.plant-card-image {
  aspect-ratio: 4 / 3;
  overflow: hidden;
}
```

**PlantCard.tsx size configs:**
```typescript
// Before:
small:  { image: 'h-20', container: 'w-full max-w-[140px] min-h-40' }
medium: { image: 'h-24', container: 'w-full max-w-[160px] min-h-48' }
large:  { image: 'h-32', container: 'w-full max-w-[200px] min-h-56' }

// After:
small:  { image: 'aspect-[4/3]', container: 'w-full max-w-[140px]' }
medium: { image: 'aspect-[4/3]', container: 'w-full max-w-[160px]' }
large:  { image: 'aspect-[4/3]', container: 'w-full max-w-[200px]' }
```

### Why aspect-ratio works

With `aspect-ratio: 4/3`, the image container height is always proportional to its width.
When the card narrows on mobile, the image container also gets shorter, maintaining the
same crop ratio. The image fills the space without excessive zooming.

Also removed `min-h-*` from containers — the aspect-ratio-driven image naturally sizes
the card without needing a minimum height.

## Lesson

**Use `aspect-ratio` instead of fixed heights for responsive image containers.** Fixed
heights + `object-fit: cover` is a classic mobile responsiveness trap. The crop behavior
changes dramatically between viewport widths.

## Related Files

- `src/app/globals.css` (`.plant-card-image` class)
- `src/components/plants/PlantCard.tsx` (size config objects)
